// Sistema de cache global para performance otimizada

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheConfig {
  defaultTTL: number
  maxSize: number
  enablePersistence: boolean
}

export class PerformanceCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    maxSize: 1000,
    enablePersistence: true
  }

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    // Carregar cache do localStorage se habilitado
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      this.loadFromStorage()
    }

    // Limpeza automática a cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    }

    // Verificar limite de tamanho
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, entry)

    // Persistir se habilitado
    if (this.config.enablePersistence) {
      this.saveToStorage()
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (this.config.enablePersistence) {
      this.saveToStorage()
    }
    return result
  }

  clear(): void {
    this.cache.clear()
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      localStorage.removeItem('beautyflow_cache')
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      utilization: (this.cache.size / this.config.maxSize) * 100
    }
  }

  // Método para buscar com fallback
  async getOrFetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Verificar cache primeiro
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Buscar dados se não estiver em cache
    try {
      const data = await fetchFunction()
      this.set(key, data, ttl)
      return data
    } catch (error) {
      console.error(`Erro ao buscar dados para chave ${key}:`, error)
      throw error
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key)
      }
    }

    toDelete.forEach(key => this.cache.delete(key))

    if (toDelete.length > 0 && this.config.enablePersistence) {
      this.saveToStorage()
    }
  }

  private evictOldest(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const data = Array.from(this.cache.entries())
      localStorage.setItem('beautyflow_cache', JSON.stringify(data))
    } catch (error) {
      console.warn('Erro ao salvar cache no localStorage:', error)
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const data = localStorage.getItem('beautyflow_cache')
      if (data) {
        const entries: [string, CacheEntry<any>][] = JSON.parse(data)
        
        // Verificar e carregar entradas válidas
        const now = Date.now()
        entries.forEach(([key, entry]) => {
          if (now - entry.timestamp < entry.ttl) {
            this.cache.set(key, entry)
          }
        })
      }
    } catch (error) {
      console.warn('Erro ao carregar cache do localStorage:', error)
    }
  }
}

// Instância global do cache
export const globalCache = new PerformanceCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutos
  maxSize: 500,
  enablePersistence: true
})

// Hook para usar cache em componentes React
export function useCache() {
  return {
    get: <T>(key: string) => globalCache.get<T>(key),
    set: <T>(key: string, data: T, ttl?: number) => globalCache.set(key, data, ttl),
    getOrFetch: <T>(key: string, fetchFn: () => Promise<T>, ttl?: number) => 
      globalCache.getOrFetch(key, fetchFn, ttl),
    delete: (key: string) => globalCache.delete(key),
    clear: () => globalCache.clear(),
    stats: () => globalCache.getStats()
  }
}

// Middleware para cache de APIs
export function withCache<T>(
  key: string,
  ttl: number = 5 * 60 * 1000
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]): Promise<T> {
      const cacheKey = `${key}_${JSON.stringify(args)}`
      
      return globalCache.getOrFetch(cacheKey, () => method.apply(this, args), ttl)
    }

    return descriptor
  }
}

// Configurações de performance para diferentes tipos de dados
export const CACHE_CONFIGS = {
  ANALYTICS: { ttl: 2 * 60 * 1000 }, // 2 minutos - dados analytics
  USER_DATA: { ttl: 10 * 60 * 1000 }, // 10 minutos - dados do usuário
  STATIC_DATA: { ttl: 60 * 60 * 1000 }, // 1 hora - dados estáticos
  REAL_TIME: { ttl: 30 * 1000 }, // 30 segundos - dados em tempo real
  APPOINTMENTS: { ttl: 60 * 1000 }, // 1 minuto - agendamentos
  NOTIFICATIONS: { ttl: 30 * 1000 } // 30 segundos - notificações
}