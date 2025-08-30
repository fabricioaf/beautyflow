import { NextRequest, NextResponse } from 'next/server'

// Tipos para logging
interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: Record<string, any>
  userId?: string
  professionalId?: string
  requestId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  duration?: number
  error?: string
  stack?: string
}

interface SecurityEvent {
  timestamp: string
  type: 'authentication_failure' | 'authorization_failure' | 'rate_limit_exceeded' | 'suspicious_activity'
  userId?: string
  ip: string
  userAgent: string
  endpoint: string
  details?: Record<string, any>
}

interface PerformanceMetric {
  timestamp: string
  endpoint: string
  method: string
  duration: number
  statusCode: number
  userId?: string
  professionalId?: string
  memoryUsage?: NodeJS.MemoryUsage
  dbQueries?: number
}

// Logger central
class Logger {
  private logs: LogEntry[] = []
  private securityEvents: SecurityEvent[] = []
  private performanceMetrics: PerformanceMetric[] = []
  private maxLogEntries = 1000
  
  // Log de informação
  info(message: string, context?: Record<string, any>) {
    this.addLog('info', message, context)
  }
  
  // Log de aviso
  warn(message: string, context?: Record<string, any>) {
    this.addLog('warn', message, context)
  }
  
  // Log de erro
  error(message: string, error?: Error, context?: Record<string, any>) {
    this.addLog('error', message, {
      ...context,
      ...(error && {
        error: error.message,
        stack: error.stack,
        name: error.name
      })
    })
  }
  
  // Log de debug (apenas em desenvolvimento)
  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      this.addLog('debug', message, context)
    }
  }
  
  // Adicionar log
  private addLog(level: LogEntry['level'], message: string, context?: Record<string, any>) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    }
    
    this.logs.push(logEntry)
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries)
    }
    
    // Console output em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🐛'
      }[level]
      
      console.log(`${emoji} [${level.toUpperCase()}] ${message}`, context || '')
    }
    
    // Em produção, enviar para serviços externos (exemplo: Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      this.sendToExternalLogger(logEntry)
    }
  }
  
  // Log de eventos de segurança
  security(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    }
    
    this.securityEvents.push(securityEvent)
    
    // Manter apenas os últimos eventos
    if (this.securityEvents.length > 500) {
      this.securityEvents = this.securityEvents.slice(-500)
    }
    
    this.warn('Evento de segurança detectado', securityEvent)
    
    // Em produção, alertar administradores
    if (process.env.NODE_ENV === 'production') {
      this.alertSecurity(securityEvent)
    }
  }
  
  // Log de métricas de performance
  performance(metric: Omit<PerformanceMetric, 'timestamp'>) {
    const performanceMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    }
    
    this.performanceMetrics.push(performanceMetric)
    
    // Manter apenas as últimas métricas
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000)
    }
    
    // Alertar sobre performance ruim
    if (metric.duration > 5000) { // Mais de 5 segundos
      this.warn('Endpoint com performance ruim', {
        endpoint: metric.endpoint,
        duration: metric.duration,
        statusCode: metric.statusCode
      })
    }
  }
  
  // Enviar logs para serviço externo
  private async sendToExternalLogger(logEntry: LogEntry) {
    try {
      // Implementar integração com Sentry, LogRocket, etc.
      // await fetch('https://api.sentry.io/...', { ... })
    } catch (error) {
      console.error('Falha ao enviar log para serviço externo:', error)
    }
  }
  
  // Alertar sobre eventos de segurança
  private async alertSecurity(event: SecurityEvent) {
    try {
      // Implementar alertas (email, Slack, SMS, etc.)
      // await sendAlert(event)
    } catch (error) {
      console.error('Falha ao enviar alerta de segurança:', error)
    }
  }
  
  // Obter estatísticas dos logs
  getStats() {
    const now = Date.now()
    const lastHour = now - 60 * 60 * 1000
    const last24Hours = now - 24 * 60 * 60 * 1000
    
    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > lastHour
    )
    
    const dailyLogs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > last24Hours
    )
    
    const recentPerformance = this.performanceMetrics.filter(metric =>
      new Date(metric.timestamp).getTime() > lastHour
    )
    
    return {
      logs: {
        total: this.logs.length,
        lastHour: recentLogs.length,
        last24Hours: dailyLogs.length,
        byLevel: {
          info: recentLogs.filter(l => l.level === 'info').length,
          warn: recentLogs.filter(l => l.level === 'warn').length,
          error: recentLogs.filter(l => l.level === 'error').length,
          debug: recentLogs.filter(l => l.level === 'debug').length,
        }
      },
      security: {
        total: this.securityEvents.length,
        lastHour: this.securityEvents.filter(event => 
          new Date(event.timestamp).getTime() > lastHour
        ).length
      },
      performance: {
        total: this.performanceMetrics.length,
        lastHour: recentPerformance.length,
        avgResponseTime: recentPerformance.length > 0 
          ? recentPerformance.reduce((sum, m) => sum + m.duration, 0) / recentPerformance.length
          : 0,
        slowRequests: recentPerformance.filter(m => m.duration > 1000).length
      }
    }
  }
  
  // Limpar logs antigos
  cleanup() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 dias
    
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > cutoff
    )
    
    this.securityEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > cutoff
    )
    
    this.performanceMetrics = this.performanceMetrics.filter(metric => 
      new Date(metric.timestamp).getTime() > cutoff
    )
  }
}

// Instância global do logger
export const logger = new Logger()

// Middleware de logging para APIs
export function withLogging(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now()
    const requestId = generateRequestId()
    const endpoint = new URL(req.url).pathname
    const method = req.method
    
    // Log da requisição
    logger.info('Requisição recebida', {
      requestId,
      endpoint,
      method,
      userAgent: req.headers.get('user-agent'),
      ip: getClientIP(req)
    })
    
    try {
      const response = await handler(req, context)
      const duration = Date.now() - startTime
      const statusCode = response.status
      
      // Log de sucesso
      logger.info('Requisição processada', {
        requestId,
        endpoint,
        method,
        statusCode,
        duration
      })
      
      // Métricas de performance
      logger.performance({
        endpoint,
        method,
        duration,
        statusCode,
        memoryUsage: process.memoryUsage()
      })
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log de erro
      logger.error('Erro na requisição', error as Error, {
        requestId,
        endpoint,
        method,
        duration
      })
      
      // Re-throw para o handler de erro processar
      throw error
    }
  }
}

// Middleware de auditoria
export function withAudit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // TODO: Implementar auditoria de mudanças
    // Capturar dados antes/depois de operações CRUD
    
    return handler(req, context)
  }
}

// Helpers
function generateRequestId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

// Middleware de monitoramento de saúde
export class HealthMonitor {
  private static instance: HealthMonitor
  private checks: Map<string, () => Promise<boolean>> = new Map()
  private lastCheck: Date = new Date()
  private status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  
  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor()
    }
    return HealthMonitor.instance
  }
  
  // Registrar verificação de saúde
  registerCheck(name: string, checkFn: () => Promise<boolean>) {
    this.checks.set(name, checkFn)
  }
  
  // Executar todas as verificações
  async runHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    checks: Record<string, boolean>
    uptime: number
    memoryUsage: NodeJS.MemoryUsage
  }> {
    const checkResults: Record<string, boolean> = {}
    let healthyCount = 0
    
    for (const [name, checkFn] of this.checks.entries()) {
      try {
        checkResults[name] = await checkFn()
        if (checkResults[name]) healthyCount++
      } catch (error) {
        checkResults[name] = false
        logger.error(`Health check failed: ${name}`, error as Error)
      }
    }
    
    const totalChecks = this.checks.size
    const healthPercentage = totalChecks > 0 ? healthyCount / totalChecks : 1
    
    // Determinar status geral
    if (healthPercentage >= 0.9) {
      this.status = 'healthy'
    } else if (healthPercentage >= 0.5) {
      this.status = 'degraded'
    } else {
      this.status = 'unhealthy'
    }
    
    this.lastCheck = new Date()
    
    return {
      status: this.status,
      timestamp: this.lastCheck.toISOString(),
      checks: checkResults,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  }
}

// Instância global do monitor de saúde
export const healthMonitor = HealthMonitor.getInstance()

// Registrar verificações básicas
healthMonitor.registerCheck('memory', async () => {
  const usage = process.memoryUsage()
  const maxMemory = 512 * 1024 * 1024 // 512MB
  return usage.heapUsed < maxMemory
})

healthMonitor.registerCheck('database', async () => {
  try {
    // TODO: Implementar check de conexão com o banco
    // await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
})

// Limpeza automática dos logs
setInterval(() => {
  logger.cleanup()
}, 60 * 60 * 1000) // A cada hora