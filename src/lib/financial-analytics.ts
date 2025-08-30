import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Tipos para Analytics Financeiro

export interface FinancialMetrics {
  revenue: {
    gross: number
    net: number
    growth: number
  }
  costs: {
    fixed: number
    variable: number
    total: number
  }
  profitability: {
    grossMargin: number
    netMargin: number
    ebitda: number
  }
  cashFlow: {
    operational: number
    investment: number
    financing: number
    net: number
  }
}

export interface ProfitabilityAnalysis {
  service: string
  revenue: number
  cost: number
  profit: number
  margin: number
  volume: number
}

export interface ClientSegmentFinancials {
  segment: string
  count: number
  revenue: number
  avgTicket: number
  profitMargin: number
  ltv: number
}

export interface FinancialGoals {
  id: number
  title: string
  current: number
  target: number
  progress: number
  status: 'on_track' | 'behind' | 'ahead'
  deadline: string
}

export interface FinancialTrends {
  month: string
  revenue: number
  profit: number
  margin: number
}

export interface ExpenseCategories {
  categories: Array<{
    name: string
    amount: number
    percentage: number
  }>
  total: number
  growth: number
}

// Função auxiliar para buscar dados financeiros
export async function fetchFinancialAnalytics(professionalId: string) {
  const response = await fetch(`/api/analytics/financial?professionalId=${professionalId}&type=complete`)
  
  if (!response.ok) {
    throw new Error('Erro ao buscar dados financeiros')
  }

  return response.json()
}

export class FinancialAnalytics {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutos

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

  async getFinancialMetrics(professionalId: string): Promise<FinancialMetrics> {
    const cacheKey = `financial_metrics_${professionalId}`
    const cached = this.getCachedData<FinancialMetrics>(cacheKey)
    if (cached) return cached

    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Calcular receita bruta e líquida
    const grossRevenue = await this.calculateGrossRevenue(professionalId, currentMonth, now)
    const lastMonthRevenue = await this.calculateGrossRevenue(professionalId, lastMonth, lastMonthEnd)
    const revenueGrowth = lastMonthRevenue > 0 ? ((grossRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // Calcular custos
    const costs = await this.calculateCosts(professionalId, currentMonth, now)
    const netRevenue = grossRevenue - costs.total

    // Calcular métricas de clientes
    const clientMetrics = await this.calculateClientMetrics(professionalId)

    // Projeções
    const projections = await this.calculateRevenueProjections(professionalId, grossRevenue, revenueGrowth)

    // Cash flow
    const cashFlow = await this.calculateCashFlow(professionalId)

    const metrics: FinancialMetrics = {
      revenue: {
        gross: grossRevenue,
        net: netRevenue,
        growth: revenueGrowth,
        trend: revenueGrowth > 5 ? 'up' : revenueGrowth < -5 ? 'down' : 'stable',
        projections
      },
      costs,
      profitability: {
        grossMargin: grossRevenue > 0 ? ((grossRevenue - costs.variable) / grossRevenue) * 100 : 0,
        netMargin: grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0,
        ebitda: netRevenue + (costs.fixed * 0.1), // Simulando depreciação/amortização
        roi: costs.total > 0 ? (netRevenue / costs.total) * 100 : 0
      },
      clientMetrics,
      cashFlow
    }

    this.setCachedData(cacheKey, metrics)
    return metrics
  }

  async getProfitabilityByService(professionalId: string): Promise<ProfitabilityAnalysis[]> {
    const cacheKey = `profitability_services_${professionalId}`
    const cached = this.getCachedData<ProfitabilityAnalysis[]>(cacheKey)
    if (cached) return cached

    const currentMonth = new Date()
    currentMonth.setDate(1)

    const services = await prisma.appointment.groupBy({
      by: ['serviceName'],
      where: {
        professionalId,
        status: 'COMPLETED',
        scheduledFor: { gte: currentMonth }
      },
      _count: { serviceName: true },
      _sum: { price: true },
      _avg: { price: true }
    })

    const analysis = await Promise.all(
      services.map(async (service) => {
        // Simular custos diretos por serviço (produtos, tempo, etc.)
        const directCosts = (service._sum.price || 0) * 0.3 // 30% de custo direto médio
        const revenue = service._sum.price || 0
        const grossProfit = revenue - directCosts
        const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

        return {
          service: service.serviceName,
          revenue,
          directCosts,
          grossProfit,
          margin,
          volume: service._count.serviceName,
          avgPrice: service._avg.price || 0,
          contribution: grossProfit / this.getTotalGrossProfit() * 100 // Simplificado
        }
      })
    )

    analysis.sort((a, b) => b.revenue - a.revenue)
    this.setCachedData(cacheKey, analysis)
    return analysis
  }

  async getClientSegmentFinancials(professionalId: string): Promise<ClientSegmentFinancials[]> {
    const cacheKey = `segment_financials_${professionalId}`
    const cached = this.getCachedData<ClientSegmentFinancials[]>(cacheKey)
    if (cached) return cached

    const clients = await prisma.client.findMany({
      where: { professionalId },
      include: {
        appointments: {
          where: { status: 'COMPLETED' }
        }
      }
    })

    // Segmentar clientes
    const segments = this.segmentClientsByValue(clients)
    
    const segmentFinancials = Object.entries(segments).map(([segment, clientList]) => {
      const totalRevenue = clientList.reduce((sum, client) => {
        return sum + client.appointments.reduce((clientSum, apt) => clientSum + (apt.price || 0), 0)
      }, 0)

      const avgLtv = clientList.length > 0 ? totalRevenue / clientList.length : 0
      const estimatedCac = avgLtv * 0.15 // CAC tipicamente 15% do LTV
      const margin = 65 + Math.random() * 20 // 65-85% de margem simulada

      return {
        segment,
        clientCount: clientList.length,
        revenue: totalRevenue,
        ltv: avgLtv,
        cac: estimatedCac,
        margin,
        retention: this.calculateSegmentRetention(clientList),
        growth: 5 + Math.random() * 15 // 5-20% crescimento simulado
      }
    })

    this.setCachedData(cacheKey, segmentFinancials)
    return segmentFinancials
  }

  async getFinancialGoals(professionalId: string): Promise<FinancialGoals[]> {
    // Em produção, essas metas viriam do banco de dados
    const currentMetrics = await this.getFinancialMetrics(professionalId)
    
    const goals: FinancialGoals[] = [
      {
        type: 'revenue',
        target: 50000,
        current: currentMetrics.revenue.gross,
        progress: (currentMetrics.revenue.gross / 50000) * 100,
        deadline: new Date(2024, 11, 31),
        status: currentMetrics.revenue.gross >= 45000 ? 'on_track' : 
                currentMetrics.revenue.gross >= 40000 ? 'behind' : 'ahead'
      },
      {
        type: 'profit',
        target: 20000,
        current: currentMetrics.revenue.net,
        progress: (currentMetrics.revenue.net / 20000) * 100,
        deadline: new Date(2024, 11, 31),
        status: currentMetrics.revenue.net >= 18000 ? 'on_track' : 
                currentMetrics.revenue.net >= 15000 ? 'behind' : 'ahead'
      },
      {
        type: 'clients',
        target: 200,
        current: 156, // Simulado
        progress: (156 / 200) * 100,
        deadline: new Date(2024, 11, 31),
        status: 156 >= 180 ? 'on_track' : 156 >= 150 ? 'behind' : 'ahead'
      },
      {
        type: 'ltv',
        target: 800,
        current: currentMetrics.clientMetrics.ltv,
        progress: (currentMetrics.clientMetrics.ltv / 800) * 100,
        deadline: new Date(2024, 11, 31),
        status: currentMetrics.clientMetrics.ltv >= 720 ? 'on_track' : 
                currentMetrics.clientMetrics.ltv >= 640 ? 'behind' : 'ahead'
      }
    ]

    return goals
  }

  // Métodos auxiliares privados
  private async calculateGrossRevenue(professionalId: string, start: Date, end: Date): Promise<number> {
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

  private async calculateCosts(professionalId: string, start: Date, end: Date): Promise<{
    fixed: number
    variable: number
    total: number
    breakdown: CostBreakdown[]
  }> {
    // Simular custos baseados na receita e operação
    const revenue = await this.calculateGrossRevenue(professionalId, start, end)
    
    const fixedCosts = 5000 // Aluguel, seguros, salários fixos
    const variableCosts = revenue * 0.25 // 25% da receita em custos variáveis
    
    const breakdown: CostBreakdown[] = [
      {
        category: 'Aluguel',
        amount: 2500,
        percentage: 50,
        trend: 0,
        description: 'Aluguel mensal do estabelecimento'
      },
      {
        category: 'Produtos',
        amount: variableCosts * 0.6,
        percentage: 60,
        trend: 5,
        description: 'Produtos utilizados nos serviços'
      },
      {
        category: 'Marketing',
        amount: revenue * 0.05,
        percentage: 20,
        trend: 15,
        description: 'Investimento em marketing digital'
      },
      {
        category: 'Equipamentos',
        amount: 800,
        percentage: 16,
        trend: -2,
        description: 'Manutenção e depreciação'
      },
      {
        category: 'Outros',
        amount: 700,
        percentage: 14,
        trend: 3,
        description: 'Energia, água, telefone, etc.'
      }
    ]

    return {
      fixed: fixedCosts,
      variable: variableCosts,
      total: fixedCosts + variableCosts,
      breakdown
    }
  }

  private async calculateClientMetrics(professionalId: string): Promise<{
    ltv: number
    cac: number
    ltvCacRatio: number
    paybackPeriod: number
    churnRate: number
  }> {
    const clients = await prisma.client.findMany({
      where: { professionalId },
      include: {
        appointments: { where: { status: 'COMPLETED' } }
      }
    })

    const totalRevenue = clients.reduce((sum, client) => {
      return sum + client.appointments.reduce((clientSum, apt) => clientSum + (apt.price || 0), 0)
    }, 0)

    const avgLtv = clients.length > 0 ? totalRevenue / clients.length : 0
    const estimatedCac = avgLtv * 0.15 // CAC típico de 15% do LTV
    const churnRate = 5 + Math.random() * 10 // 5-15% simulado

    return {
      ltv: avgLtv,
      cac: estimatedCac,
      ltvCacRatio: estimatedCac > 0 ? avgLtv / estimatedCac : 0,
      paybackPeriod: estimatedCac > 0 ? estimatedCac / (avgLtv / 12) : 0, // meses
      churnRate
    }
  }

  private async calculateRevenueProjections(
    professionalId: string, 
    currentRevenue: number, 
    growthRate: number
  ): Promise<{ nextMonth: number; nextQuarter: number; yearEnd: number }> {
    const monthlyGrowth = growthRate / 100
    
    return {
      nextMonth: currentRevenue * (1 + monthlyGrowth),
      nextQuarter: currentRevenue * Math.pow(1 + monthlyGrowth, 3),
      yearEnd: currentRevenue * Math.pow(1 + monthlyGrowth, 12)
    }
  }

  private async calculateCashFlow(professionalId: string): Promise<{
    operating: number
    investing: number
    financing: number
    free: number
    forecast: CashFlowForecast[]
  }> {
    const currentRevenue = await this.calculateGrossRevenue(
      professionalId, 
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date()
    )

    const operatingCashFlow = currentRevenue * 0.7 // 70% do revenue vira caixa operacional
    const investingCashFlow = -currentRevenue * 0.05 // 5% investido em equipamentos
    const financingCashFlow = currentRevenue * 0.1 // 10% de financiamentos
    const freeCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow

    // Projeção dos próximos 6 meses
    const forecast: CashFlowForecast[] = []
    let cumulativeBalance = freeCashFlow

    for (let i = 1; i <= 6; i++) {
      const monthlyInflow = currentRevenue * (1 + (0.05 * i)) // Crescimento de 5% ao mês
      const monthlyOutflow = monthlyInflow * 0.7
      const netFlow = monthlyInflow - monthlyOutflow
      cumulativeBalance += netFlow

      forecast.push({
        month: new Date(new Date().getFullYear(), new Date().getMonth() + i, 1)
          .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        inflow: monthlyInflow,
        outflow: monthlyOutflow,
        netFlow,
        cumulativeBalance
      })
    }

    return {
      operating: operatingCashFlow,
      investing: investingCashFlow,
      financing: financingCashFlow,
      free: freeCashFlow,
      forecast
    }
  }

  private segmentClientsByValue(clients: any[]): Record<string, any[]> {
    const segments: Record<string, any[]> = {
      'VIP': [],
      'Premium': [],
      'Regular': [],
      'Novos': []
    }

    clients.forEach(client => {
      const totalSpent = client.appointments.reduce((sum: number, apt: any) => sum + (apt.price || 0), 0)
      const appointmentCount = client.appointments.length

      if (totalSpent >= 2000 && appointmentCount >= 10) {
        segments['VIP'].push(client)
      } else if (totalSpent >= 1000 && appointmentCount >= 5) {
        segments['Premium'].push(client)
      } else if (appointmentCount >= 2) {
        segments['Regular'].push(client)
      } else {
        segments['Novos'].push(client)
      }
    })

    return segments
  }

  private calculateSegmentRetention(clients: any[]): number {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const oldClients = clients.filter(client => 
      new Date(client.createdAt) < threeMonthsAgo
    )

    const recentlyActive = oldClients.filter(client =>
      client.appointments.some((apt: any) => 
        new Date(apt.scheduledFor) > threeMonthsAgo
      )
    )

    return oldClients.length > 0 ? (recentlyActive.length / oldClients.length) * 100 : 0
  }

  private getTotalGrossProfit(): number {
    // Método auxiliar para cálculo de contribuição
    return 15000 // Simulado
  }
}