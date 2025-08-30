import { NextResponse } from 'next/server'
import { logger } from './monitoring'

// Interfaces
interface CacheEntry<T> {
  data: T
  expiry: number
  hits: number
  lastAccessed: number
}

interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
  oldestEntry: number
  newestEntry: number
}

// Cache em memória simples
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private stats = { hits: 0, misses: 0 }
  private maxSize: number
  private defaultTTL: number
  
  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
    
    // Limpeza periódica
    setInterval(() => this.cleanup(), 60000) // A cada minuto
  }
  
  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL)
    
    // Remover entradas antigas se necessário
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }
    
    this.cache.set(key, {
      data: value,
      expiry,
      hits: 0,
      lastAccessed: Date.now()
    })
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }
    
    // Atualizar estatísticas
    entry.hits++
    entry.lastAccessed = Date.now()
    this.stats.hits++
    
    return entry.data
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key)
  }
  
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }
  
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const accessTimes = entries.map(e => e.lastAccessed)
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      oldestEntry: Math.min(...accessTimes) || 0,
      newestEntry: Math.max(...accessTimes) || 0
    }
  }
  
  // Remover entrada menos usada recentemente
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
  
  // Limpeza de entradas expiradas
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cache cleanup: ${cleaned} entradas removidas`)
    }
  }
}

// Instâncias de cache
const memoryCache = new MemoryCache(2000, 10 * 60 * 1000) // 2000 entradas, 10 min TTL
const queryCache = new MemoryCache(500, 2 * 60 * 1000)    // 500 entradas, 2 min TTL

// Cache decorator para funções
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string
    ttl?: number
    cache?: MemoryCache
  } = {}
): T {
  const {
    keyGenerator = (...args) => JSON.stringify(args),
    ttl,
    cache = memoryCache
  } = options
  
  return (async (...args: Parameters<T>) => {
    const key = `fn:${fn.name}:${keyGenerator(...args)}`
    
    // Tentar buscar do cache
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }
    
    // Executar função e cachear resultado
    const result = await fn(...args)
    cache.set(key, result, ttl)
    
    return result
  }) as T
}

// Middleware de cache para respostas HTTP
export function withCache(
  handler: (req: any, context?: any) => Promise<NextResponse>,
  options: {
    ttl?: number
    keyGenerator?: (req: any) => string
    condition?: (req: any, response: NextResponse) => boolean
  } = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutos
    keyGenerator = (req) => `${req.method}:${new URL(req.url).pathname}${new URL(req.url).search}`,
    condition = (req, res) => req.method === 'GET' && res.status === 200
  } = options
  
  return async (req: any, context?: any): Promise<NextResponse> => {
    const cacheKey = keyGenerator(req)
    
    // Tentar buscar resposta em cache
    if (req.method === 'GET') {
      const cachedResponse = memoryCache.get<{ body: any, headers: Record<string, string>, status: number }>(cacheKey)
      
      if (cachedResponse) {
        logger.debug('Cache hit', { key: cacheKey })
        
        const response = NextResponse.json(cachedResponse.body, {
          status: cachedResponse.status
        })
        
        // Restaurar headers
        Object.entries(cachedResponse.headers).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
        
        response.headers.set('X-Cache', 'HIT')
        return response
      }
    }
    
    // Executar handler original
    const response = await handler(req, context)
    
    // Cachear resposta se condições forem atendidas
    if (condition(req, response)) {
      try {
        const body = await response.clone().json()
        const headers: Record<string, string> = {}
        
        response.headers.forEach((value, key) => {
          headers[key] = value
        })
        
        memoryCache.set(cacheKey, {
          body,
          headers,
          status: response.status
        }, ttl)
        
        response.headers.set('X-Cache', 'MISS')
        logger.debug('Response cached', { key: cacheKey })
      } catch (error) {
        logger.warn('Failed to cache response', { key: cacheKey, error })
      }
    }
    
    return response
  }
}

// Invalidação de cache por padrões
export class CacheInvalidator {
  static invalidateByPattern(pattern: string): number {
    let invalidated = 0
    
    for (const key of memoryCache['cache'].keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key)
        invalidated++
      }
    }
    
    logger.info('Cache invalidated by pattern', { pattern, count: invalidated })
    return invalidated
  }
  
  static invalidateByResource(resource: string, id?: string): number {
    const patterns = [
      `api/${resource}`,
      `analytics`,
      `notifications`
    ]
    
    if (id) {
      patterns.push(`${resource}:${id}`)
    }
    
    let total = 0
    patterns.forEach(pattern => {
      total += this.invalidateByPattern(pattern)
    })
    
    return total
  }
}

// Otimizações de query do Prisma
export class QueryOptimizer {
  // Pool de conexões para consultas longas
  static async withReadReplica<T>(fn: () => Promise<T>): Promise<T> {
    // TODO: Implementar conexão com replica de leitura
    return fn()
  }
  
  // Paginação otimizada
  static getPaginationOptimal(total: number, page: number, limit: number) {
    const offset = (page - 1) * limit
    const totalPages = Math.ceil(total / limit)
    
    // Para grandes datasets, usar cursor-based pagination
    const useCursor = total > 10000
    
    return {
      offset: useCursor ? undefined : offset,
      limit,
      page,
      totalPages,
      useCursor,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
  
  // Select otimizado - incluir apenas campos necessários
  static buildSelect(fields: string[]) {
    return fields.reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
  }
  
  // Include otimizado para relacionamentos
  static buildInclude(includes: Record<string, string[]>) {
    const result: any = {}
    
    Object.entries(includes).forEach(([relation, fields]) => {
      result[relation] = {
        select: this.buildSelect(fields)
      }
    })
    
    return result
  }
}

// Compression middleware
export function withCompression(
  handler: (req: any, context?: any) => Promise<NextResponse>
) {
  return async (req: any, context?: any): Promise<NextResponse> => {
    const response = await handler(req, context)
    
    // Verificar se cliente aceita compressão
    const acceptEncoding = req.headers.get('accept-encoding') || ''
    
    if (acceptEncoding.includes('gzip') && response.body) {
      try {
        // TODO: Implementar compressão gzip
        // const compressed = await gzip(response.body)
        // response.headers.set('Content-Encoding', 'gzip')
        response.headers.set('X-Compression', 'available')
      } catch (error) {
        logger.warn('Compression failed', { error })
      }
    }
    
    return response
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>()
  
  static startMeasurement(id: string): () => number {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMeasurement(id, duration)
      return duration
    }
  }
  
  private static recordMeasurement(id: string, duration: number) {
    if (!this.measurements.has(id)) {
      this.measurements.set(id, [])
    }
    
    const measurements = this.measurements.get(id)!
    measurements.push(duration)
    
    // Manter apenas as últimas 100 medições
    if (measurements.length > 100) {
      measurements.shift()
    }
  }
  
  static getStats(id: string) {
    const measurements = this.measurements.get(id) || []
    
    if (measurements.length === 0) {
      return null
    }
    
    const sorted = [...measurements].sort((a, b) => a - b)
    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length
    
    return {
      count: measurements.length,
      avg: Math.round(avg * 100) / 100,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }
  
  static getAllStats() {
    const result: Record<string, any> = {}
    
    for (const id of this.measurements.keys()) {
      result[id] = this.getStats(id)
    }
    
    return result
  }
}

// Wrapper para monitoramento de performance
export function withPerformanceMonitoring(
  handler: (req: any, context?: any) => Promise<NextResponse>,
  name?: string
) {
  return async (req: any, context?: any): Promise<NextResponse> => {
    const measurementName = name || `${req.method} ${new URL(req.url).pathname}`
    const endMeasurement = PerformanceMonitor.startMeasurement(measurementName)
    
    try {
      const response = await handler(req, context)
      const duration = endMeasurement()
      
      // Adicionar header com tempo de resposta
      response.headers.set('X-Response-Time', `${duration}ms`)
      
      // Log de performance lenta
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          endpoint: measurementName,
          duration,
          status: response.status
        })
      }
      
      return response
    } catch (error) {
      endMeasurement()
      throw error
    }
  }
}

// Batch operations para reduzir chamadas ao banco
export class BatchProcessor {
  private static queues = new Map<string, any[]>()
  private static timers = new Map<string, NodeJS.Timeout>()
  
  static queue<T>(
    queueName: string,
    item: T,
    processor: (items: T[]) => Promise<void>,
    options: { maxSize?: number, maxWait?: number } = {}
  ) {
    const { maxSize = 10, maxWait = 1000 } = options
    
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, [])
    }
    
    const queue = this.queues.get(queueName)!
    queue.push(item)
    
    // Processar se atingiu tamanho máximo
    if (queue.length >= maxSize) {
      this.processQueue(queueName, processor)
      return
    }
    
    // Configurar timer se ainda não existe
    if (!this.timers.has(queueName)) {
      const timer = setTimeout(() => {
        this.processQueue(queueName, processor)
      }, maxWait)
      
      this.timers.set(queueName, timer)
    }
  }
  
  private static async processQueue<T>(
    queueName: string,
    processor: (items: T[]) => Promise<void>
  ) {
    const queue = this.queues.get(queueName)
    const timer = this.timers.get(queueName)
    
    if (!queue || queue.length === 0) return
    
    // Limpar timer
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(queueName)
    }
    
    // Processar items
    const items = [...queue]
    this.queues.set(queueName, [])
    
    try {
      await processor(items)
      logger.debug(`Batch processed: ${queueName}`, { count: items.length })
    } catch (error) {
      logger.error(`Batch processing failed: ${queueName}`, error as Error)
    }
  }
}

// Exportar instâncias
export { memoryCache, queryCache }
export default {
  memoryCache,
  queryCache,
  cached,
  withCache,
  withCompression,
  withPerformanceMonitoring,
  CacheInvalidator,
  QueryOptimizer,
  PerformanceMonitor,
  BatchProcessor
}