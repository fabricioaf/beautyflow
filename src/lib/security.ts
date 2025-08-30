import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { logger } from './monitoring'
import { checkRateLimit } from './validation'

// Tipos
interface SecurityConfig {
  rateLimiting: {
    enabled: boolean
    windowMs: number
    maxRequests: number
  }
  cors: {
    enabled: boolean
    allowedOrigins: string[]
    allowedMethods: string[]
    allowedHeaders: string[]
  }
  csrf: {
    enabled: boolean
    exemptPaths: string[]
  }
  headers: {
    security: boolean
    csp: string
  }
}

// Configuração de segurança
const securityConfig: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    windowMs: 60000, // 1 minuto
    maxRequests: 100
  },
  cors: {
    enabled: true,
    allowedOrigins: [
      process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'https://*.beautyflow.com',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3001'] : [])
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token'
    ]
  },
  csrf: {
    enabled: process.env.NODE_ENV === 'production',
    exemptPaths: ['/api/auth', '/api/webhooks']
  },
  headers: {
    security: true,
    csp: \"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com;\"
  }
}

// Middleware de segurança
export class SecurityMiddleware {
  private static suspiciousIPs = new Set<string>()
  private static blockedIPs = new Set<string>()
  
  // Aplicar todas as verificações de segurança
  static async apply(request: NextRequest): Promise<NextResponse | null> {
    const clientIP = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const origin = request.headers.get('origin')
    const method = request.method
    const pathname = new URL(request.url).pathname
    
    try {
      // 1. Verificar IPs bloqueados
      if (this.blockedIPs.has(clientIP)) {
        logger.security({
          type: 'suspicious_activity',
          ip: clientIP,
          userAgent,
          endpoint: pathname,
          details: { reason: 'blocked_ip' }
        })
        
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      
      // 2. Rate limiting
      if (securityConfig.rateLimiting.enabled) {
        const rateLimitResult = this.checkRateLimit(clientIP, pathname)
        
        if (!rateLimitResult.allowed) {
          logger.security({
            type: 'rate_limit_exceeded',
            ip: clientIP,
            userAgent,
            endpoint: pathname,
            details: {
              limit: securityConfig.rateLimiting.maxRequests,
              window: securityConfig.rateLimiting.windowMs
            }
          })
          
          return NextResponse.json(
            { 
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil(rateLimitResult.resetTime / 1000)
            },
            { 
              status: 429,
              headers: {
                'Retry-After': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
                'X-RateLimit-Limit': securityConfig.rateLimiting.maxRequests.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
              }
            }
          )
        }
      }
      
      // 3. CORS verification
      if (securityConfig.cors.enabled && origin) {
        const corsResult = this.checkCORS(origin, method)
        
        if (!corsResult.allowed) {
          logger.security({
            type: 'suspicious_activity',
            ip: clientIP,
            userAgent,
            endpoint: pathname,
            details: { reason: 'cors_violation', origin }
          })
          
          return NextResponse.json(
            { error: 'CORS policy violation' },
            { status: 403 }
          )
        }
        
        // Handle preflight OPTIONS requests
        if (method === 'OPTIONS') {
          return new NextResponse(null, {
            status: 200,
            headers: corsResult.headers
          })
        }
      }
      
      // 4. Detectar atividade suspeita
      const suspiciousActivity = this.detectSuspiciousActivity(request)
      
      if (suspiciousActivity.isSuspicious) {
        this.handleSuspiciousActivity(clientIP, suspiciousActivity.reasons)
        
        logger.security({
          type: 'suspicious_activity',
          ip: clientIP,
          userAgent,
          endpoint: pathname,
          details: { reasons: suspiciousActivity.reasons }
        })
        
        // Retornar resposta neutra para não revelar detecção
        if (suspiciousActivity.block) {
          return NextResponse.json(
            { error: 'Request blocked' },
            { status: 403 }
          )
        }
      }
      
      // 5. CSRF protection (para métodos que modificam estado)
      if (securityConfig.csrf.enabled && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfResult = this.checkCSRF(request)
        
        if (!csrfResult.valid) {
          logger.security({
            type: 'suspicious_activity',
            ip: clientIP,
            userAgent,
            endpoint: pathname,
            details: { reason: 'csrf_token_missing_or_invalid' }
          })
          
          return NextResponse.json(
            { error: 'CSRF token missing or invalid' },
            { status: 403 }
          )
        }
      }
      
      // 6. Validar tamanho do body
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
        logger.security({
          type: 'suspicious_activity',
          ip: clientIP,
          userAgent,
          endpoint: pathname,
          details: { reason: 'payload_too_large', size: contentLength }
        })
        
        return NextResponse.json(
          { error: 'Payload too large' },
          { status: 413 }
        )
      }
      
      return null // Continuar processamento
    } catch (error) {
      logger.error('Erro no middleware de segurança', error as Error, {
        ip: clientIP,
        endpoint: pathname,
        method
      })
      
      return NextResponse.json(
        { error: 'Security check failed' },
        { status: 500 }
      )
    }
  }
  
  // Aplicar headers de segurança
  static applySecurityHeaders(response: NextResponse): NextResponse {
    if (!securityConfig.headers.security) return response
    
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // CSP Header
    response.headers.set('Content-Security-Policy', securityConfig.headers.csp)
    
    // HSTS (apenas em HTTPS)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
    
    return response
  }
  
  // Obter IP do cliente
  private static getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    )
  }
  
  // Rate limiting por IP e endpoint
  private static checkRateLimit(ip: string, endpoint: string) {
    const key = `${ip}:${endpoint}`
    
    // Limites específicos por endpoint
    const endpointLimits: Record<string, { maxRequests: number; windowMs: number }> = {
      '/api/auth': { maxRequests: 10, windowMs: 60000 }, // Auth mais restrito
      '/api/payments': { maxRequests: 5, windowMs: 60000 }, // Pagamentos muito restrito
      '/api/appointments': { maxRequests: 50, windowMs: 60000 },
      'default': securityConfig.rateLimiting
    }
    
    const limit = endpointLimits[endpoint] || endpointLimits['default']
    
    return checkRateLimit(key, limit.windowMs, limit.maxRequests)
  }
  
  // Verificação CORS
  private static checkCORS(origin: string, method: string) {
    const isOriginAllowed = securityConfig.cors.allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*', '.*')
        return new RegExp(`^${pattern}$`).test(origin)
      }
      return allowedOrigin === origin
    })
    
    const isMethodAllowed = securityConfig.cors.allowedMethods.includes(method)
    
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': isOriginAllowed ? origin : 'null',
      'Access-Control-Allow-Methods': securityConfig.cors.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': securityConfig.cors.allowedHeaders.join(', '),
      'Access-Control-Max-Age': '86400'
    }
    
    return {
      allowed: isOriginAllowed && isMethodAllowed,
      headers
    }
  }
  
  // Detectar atividade suspeita
  private static detectSuspiciousActivity(request: NextRequest) {
    const userAgent = request.headers.get('user-agent') || ''
    const url = new URL(request.url)
    const pathname = url.pathname
    const searchParams = url.searchParams
    
    const reasons: string[] = []
    let block = false
    
    // 1. User agents suspeitos
    const suspiciousUserAgents = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /curl/i,
      /wget/i
    ]
    
    if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
      reasons.push('suspicious_user_agent')
    }
    
    // 2. Tentativas de SQL Injection
    const sqlInjectionPatterns = [
      /('|(\\-\\-)|(;)|(\\||\\|)|(\\*|\\*))/i,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
      /(script|javascript|vbscript)/i
    ]
    
    const allParams = [pathname, ...Array.from(searchParams.values())].join(' ')
    
    if (sqlInjectionPatterns.some(pattern => pattern.test(allParams))) {
      reasons.push('sql_injection_attempt')
      block = true
    }
    
    // 3. Tentativas de path traversal
    if (pathname.includes('../') || pathname.includes('..\\\\')) {
      reasons.push('path_traversal_attempt')
      block = true
    }
    
    // 4. Tentativas de acesso a arquivos sensíveis
    const sensitiveFiles = [
      '.env',
      'config.json',
      'package.json',
      'web.config',
      '.htaccess',
      'wp-config.php'
    ]
    
    if (sensitiveFiles.some(file => pathname.includes(file))) {
      reasons.push('sensitive_file_access')
      block = true
    }
    
    // 5. Muitos parâmetros (possível ataque)
    if (Array.from(searchParams.keys()).length > 20) {
      reasons.push('too_many_parameters')
    }
    
    return {
      isSuspicious: reasons.length > 0,
      reasons,
      block
    }
  }
  
  // Lidar com atividade suspeita
  private static handleSuspiciousActivity(ip: string, reasons: string[]) {
    // Adicionar à lista de IPs suspeitos
    this.suspiciousIPs.add(ip)
    
    // Bloquear IP se muitas atividades suspeitas
    const criticalReasons = ['sql_injection_attempt', 'path_traversal_attempt', 'sensitive_file_access']
    
    if (reasons.some(reason => criticalReasons.includes(reason))) {
      this.blockedIPs.add(ip)
      
      // Remover do bloqueio após 1 hora
      setTimeout(() => {
        this.blockedIPs.delete(ip)
      }, 60 * 60 * 1000)
    }
  }
  
  // Verificação CSRF
  private static checkCSRF(request: NextRequest) {
    const pathname = new URL(request.url).pathname
    
    // Endpoints isentos de CSRF
    if (securityConfig.csrf.exemptPaths.some(path => pathname.startsWith(path))) {
      return { valid: true }
    }
    
    const token = request.headers.get('x-csrf-token') || request.headers.get('csrf-token')
    
    // Em produção, implementar validação real do token CSRF
    // Por enquanto, apenas verificar se existe
    if (process.env.NODE_ENV === 'development') {
      return { valid: true }
    }
    
    return { valid: !!token }
  }
}

// Wrapper para aplicar middleware de segurança
export function withSecurity(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Aplicar verificações de segurança
    const securityResponse = await SecurityMiddleware.apply(req)
    
    if (securityResponse) {
      return securityResponse
    }
    
    // Executar handler original
    const response = await handler(req, context)
    
    // Aplicar headers de segurança
    return SecurityMiddleware.applySecurityHeaders(response)
  }
}