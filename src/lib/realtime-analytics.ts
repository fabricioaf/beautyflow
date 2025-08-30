import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Tipos para Analytics em Tempo Real

export interface RealtimeMetrics {
  revenue: {
    today: number
    yesterday: number
    growth: number
    target: number
    completion: number
  }
  appointments: {
    today: number
    scheduled: number
    completed: number
    cancelled: number
    growth: number
  }
  clients: {
    total: number
    newToday: number
    returning: number
    satisfaction: number
  }
  performance: {
    occupancyRate: number
    averageService: number
    waitTime: number
    efficiency: number
  }
}

export interface HistoricalData {
  date: string
  revenue: number
  appointments: number
  clients: number
  satisfaction: number
}

export interface TopServices {
  name: string
  count: number
  revenue: number
  growth: number
}

export interface ClientSegmentation {
  segment: string
  count: number
  percentage: number
  revenue: number
  avgTicket: number
  color: string
}

// Função auxiliar para buscar dados de analytics em tempo real
export async function fetchRealtimeAnalytics(
  professionalId: string,
  type: 'metrics' | 'historical' | 'services' | 'segmentation',
  options?: { days?: number; limit?: number }
) {
  const params = new URLSearchParams({
    professionalId,
    type,
    ...(options?.days && { days: options.days.toString() }),
    ...(options?.limit && { limit: options.limit.toString() })
  })

  const response = await fetch(`/api/analytics/realtime?${params}`)
  
  if (!response.ok) {
    throw new Error('Erro ao buscar dados de analytics')
  }

  return response.json()
}

export class RealtimeAnalytics {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutos

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T
    }
    return null
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  async getRealtimeMetrics(professionalId: string): Promise<RealtimeMetrics> {
    const cacheKey = `metrics_${professionalId}`
    const cached = this.getCachedData<RealtimeMetrics>(cacheKey)
    if (cached) return cached

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Buscar dados de receita
    const [todayRevenue, yesterdayRevenue] = await Promise.all([
      this.getRevenueByPeriod(professionalId, today, now),
      this.getRevenueByPeriod(professionalId, yesterday, today)
    ])

    // Buscar dados de agendamentos
    const appointmentsToday = await prisma.appointment.findMany({
      where: {
        professionalId,
        scheduledFor: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    const totalSlotsToday = await this.getTotalAvailableSlots(professionalId, today)

    // Buscar dados de clientes
    const [totalClients, newClientsToday] = await Promise.all([
      prisma.client.count({ where: { professionalId } }),
      this.getNewClientsCount(professionalId, today, now)
    ])

    // Calcular métricas
    const metrics: RealtimeMetrics = {
      revenue: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        growth: yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0,
        target: 1000, // Placeholder value for demonstration purposes
        completion: 95 // Placeholder value for demonstration purposes
      },
      appointments: {
        today: appointmentsToday.length,
        scheduled: appointmentsToday.filter(a => a.status === 'SCHEDULED').length,
        completed: appointmentsToday.filter(a => a.status === 'COMPLETED').length,
        cancelled: appointmentsToday.filter(a => a.status === 'CANCELLED').length,
        growth: 10 // Placeholder value for demonstration purposes
      },
      clients: {
        total: totalClients,
        newToday: newClientsToday,
        returning: totalClients - newClientsToday,
        satisfaction: 4.5 // Placeholder value for demonstration purposes
      },
      performance: {
        occupancyRate: totalSlotsToday > 0 ? (appointmentsToday.length / totalSlotsToday) * 100 : 0,
        averageService: 60, // Placeholder value for demonstration purposes
        waitTime: 30, // Placeholder value for demonstration purposes
        efficiency: 85 // Placeholder value for demonstration purposes
      }
    }

    this.setCachedData(cacheKey, metrics)
    return metrics
  }

  async getHistoricalData(professionalId: string, days: number = 30): Promise<HistoricalData[]> {
    const cacheKey = `historical_${professionalId}_${days}`
    const cached = this.getCachedData<HistoricalData[]>(cacheKey)
    if (cached) return cached

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const data: HistoricalData[] = []

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const [revenue, appointments, newClients, satisfaction] = await Promise.all([
        this.getRevenueByPeriod(professionalId, date, nextDate),
        this.getAppointmentsCount(professionalId, date, nextDate),
        this.getNewClientsCount(professionalId, date, nextDate),
        this.getSatisfactionByDate(professionalId, date, nextDate)
      ])

      data.push({
        date: date.toISOString().split('T')[0],
        revenue,
        appointments,
        clients: newClients,
        satisfaction
      })
    }

    this.setCachedData(cacheKey, data)
    return data
  }

  async getTopServices(professionalId: string, limit: number = 10): Promise<TopServices[]> {
    const cacheKey = `top_services_${professionalId}_${limit}`
    const cached = this.getCachedData<TopServices[]>(cacheKey)
    if (cached) return cached

    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const services = await prisma.appointment.groupBy({
      by: ['serviceName'],
      where: {
        professionalId,
        status: 'COMPLETED',
        scheduledFor: { gte: lastMonth }
      },
      _count: { serviceName: true },
      _sum: { price: true },
      orderBy: { _count: { serviceName: 'desc' } },
      take: limit
    })

    const topServices = await Promise.all(
      services.map(async (service) => {
        const growthRate = await this.getServiceGrowthRate(professionalId, service.serviceName)
        
        return {
          name: service.serviceName,
          count: service._count.serviceName,
          revenue: service._sum.price || 0,
          growth: growthRate
        }
      })
    )

    this.setCachedData(cacheKey, topServices)
    return topServices
  }

  async getClientSegmentation(professionalId: string): Promise<ClientSegmentation[]> {
    const cacheKey = `client_segmentation_${professionalId}`
    const cached = this.getCachedData<ClientSegmentation[]>(cacheKey)
    if (cached) return cached

    const clients = await prisma.client.findMany({
      where: { professionalId },
      include: {
        appointments: {
          where: { status: 'COMPLETED' }
        }
      }
    })

    const segmentation = this.categorizeClients(clients)
    this.setCachedData(cacheKey, segmentation)
    return segmentation
  }

  // Métodos auxiliares privados
  private async getRevenueByPeriod(professionalId: string, start: Date, end: Date): Promise<number> {
    const result = await prisma.appointment.aggregate({
      where: {
        professionalId,
        status: 'COMPLETED',
        scheduledFor: { gte: start, lt: end }
      },
      _sum: { price: true }
    })
    return result._sum.price || 0
  }

  private async getTotalAvailableSlots(professionalId: string, date: Date): Promise<number> {
    // Simular cálculo de slots disponíveis (8 horas * 2 slots por hora)
    return 16
  }

  private async getNewClientsCount(professionalId: string, start: Date, end: Date): Promise<number> {
    return await prisma.client.count({
      where: {
        professionalId,
        createdAt: { gte: start, lt: end }
      }
    })
  }

  private async getAppointmentsCount(professionalId: string, start: Date, end: Date): Promise<number> {
    return await prisma.appointment.count({
      where: {
        professionalId,
        scheduledFor: { gte: start, lt: end }
      }
    })
  }

  private async getSatisfactionByDate(professionalId: string, start: Date, end: Date): Promise<number> {
    // Simular cálculo de satisfação baseado em avaliações
    return 4.5 + Math.random() * 0.5
  }

  private async getServiceGrowthRate(professionalId: string, serviceName: string): Promise<number> {
    // Simular taxa de crescimento do serviço
    return -10 + Math.random() * 30 // -10% a +20%
  }

  private categorizeClients(clients: any[]): ClientSegmentation[] {
    const categories = {
      vip: { count: 0, totalSpending: 0, totalRetention: 0 },
      regular: { count: 0, totalSpending: 0, totalRetention: 0 },
      occasional: { count: 0, totalSpending: 0, totalRetention: 0 },
      new: { count: 0, totalSpending: 0, totalRetention: 0 }
    }

    clients.forEach(client => {
      const appointmentCount = client.appointments.length
      const totalSpent = client.appointments.reduce((sum: number, apt: any) => sum + (apt.price || 0), 0)
      const avgSpending = appointmentCount > 0 ? totalSpent / appointmentCount : 0

      let category: keyof typeof categories
      if (appointmentCount >= 10 && avgSpending >= 200) {
        category = 'vip'
      } else if (appointmentCount >= 5) {
        category = 'regular'
      } else if (appointmentCount >= 2) {
        category = 'occasional'
      } else {
        category = 'new'
      }

      categories[category].count++
      categories[category].totalSpending += totalSpent
      categories[category].totalRetention += appointmentCount > 1 ? 1 : 0
    })

    const total = clients.length
    return Object.entries(categories).map(([segment, data]) => ({
      segment: segment.toUpperCase(),
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      revenue: data.totalSpending,
      avgTicket: data.count > 0 ? data.totalSpending / data.count : 0,
      color: this.getColorBySegment(segment)
    }))
  }

  private getColorBySegment(segment: string): string {
    switch (segment.toLowerCase()) {
      case 'vip':
        return '#ff0000'
      case 'regular':
        return '#00ff00'
      case 'occasional':
        return '#0000ff'
      case 'new':
        return '#ffff00'
      default:
        return '#cccccc'
    }
  }
}