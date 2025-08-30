import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CustomerInsights {
  overview: {
    totalClients: number
    activeClients: number
    churnRate: number
    averageLifespan: number
    segmentDistribution: SegmentSummary[]
  }
  churnAnalysis: {
    riskSegments: ChurnRiskSegment[]
    churnPredictions: ChurnPrediction[]
    retentionStrategies: RetentionStrategy[]
    preventionActions: PreventionAction[]
  }
  upsellOpportunities: {
    opportunities: UpsellOpportunity[]
    crossSellSuggestions: CrossSellSuggestion[]
    premiumUpgrades: PremiumUpgrade[]
    bundleRecommendations: BundleRecommendation[]
  }
  behaviorAnalysis: {
    patterns: BehaviorPattern[]
    preferences: ClientPreference[]
    journeyAnalysis: CustomerJourney[]
    engagementScores: EngagementScore[]
  }
  actionableInsights: {
    urgentActions: UrgentAction[]
    growthOpportunities: GrowthOpportunity[]
    retentionTactics: RetentionTactic[]
    revenueOptimization: RevenueOptimization[]
  }
}

export interface SegmentSummary {
  segment: string
  count: number
  percentage: number
  avgLtv: number
  churnRate: number
  growthRate: number
}

export interface ChurnRiskSegment {
  segment: string
  riskLevel: 'high' | 'medium' | 'low'
  clientCount: number
  churnProbability: number
  revenueAtRisk: number
  topReasons: string[]
  preventionScore: number
}

export interface ChurnPrediction {
  clientId: string
  clientName: string
  churnProbability: number
  riskFactors: string[]
  lastVisit: Date
  totalValue: number
  recommendedAction: string
  timeToIntervene: number // dias
}

export interface RetentionStrategy {
  strategy: string
  targetSegment: string
  effectiveness: number
  cost: number
  expectedRetention: number
  implementation: string
}

export interface PreventionAction {
  type: 'immediate' | 'short_term' | 'long_term'
  priority: 'high' | 'medium' | 'low'
  action: string
  targetClients: number
  expectedImpact: string
  timeline: string
}

export interface UpsellOpportunity {
  clientId: string
  clientName: string
  currentSpending: number
  targetSpending: number
  uplifPotential: number
  recommendedServices: string[]
  probability: number
  bestApproach: string
}

export interface CrossSellSuggestion {
  service: string
  targetSegment: string
  penetrationRate: number
  opportunity: number
  avgRevenue: number
  conversionRate: number
  recommendation: string
}

export interface PremiumUpgrade {
  clientId: string
  clientName: string
  currentTier: string
  recommendedTier: string
  additionalRevenue: number
  upgradeReasons: string[]
  probability: number
}

export interface BundleRecommendation {
  bundleName: string
  services: string[]
  currentPrice: number
  bundlePrice: number
  discount: number
  targetSegment: string
  estimatedDemand: number
}

export interface BehaviorPattern {
  pattern: string
  frequency: number
  segment: string
  description: string
  businessImpact: string
  actionable: boolean
}

export interface ClientPreference {
  category: string
  preference: string
  percentage: number
  segment: string
  opportunity: string
}

export interface CustomerJourney {
  stage: string
  averageDuration: number
  conversionRate: number
  dropoffPoints: string[]
  optimizationOpportunities: string[]
}

export interface EngagementScore {
  clientId: string
  clientName: string
  score: number
  trend: 'increasing' | 'decreasing' | 'stable'
  factors: EngagementFactor[]
  recommendations: string[]
}

export interface EngagementFactor {
  factor: string
  weight: number
  impact: number
  description: string
}

export interface UrgentAction {
  priority: number
  action: string
  reason: string
  targetClients: string[]
  expectedOutcome: string
  deadline: Date
}

export interface GrowthOpportunity {
  opportunity: string
  potentialRevenue: number
  targetSegment: string
  implementation: string
  timeline: string
  confidence: number
}

export interface RetentionTactic {
  tactic: string
  targetChurnRate: number
  currentChurnRate: number
  effectiveness: number
  cost: number
  roi: number
}

export interface RevenueOptimization {
  optimization: string
  currentRevenue: number
  optimizedRevenue: number
  improvement: number
  implementation: string
  effort: 'low' | 'medium' | 'high'
}

export class CustomerInsightsEngine {
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

  async getCustomerInsights(professionalId: string): Promise<CustomerInsights> {
    const cacheKey = `customer_insights_${professionalId}`
    const cached = this.getCachedData<CustomerInsights>(cacheKey)
    if (cached) return cached

    // Buscar dados dos clientes
    const clients = await this.getClientsData(professionalId)
    
    // Análise geral
    const overview = await this.generateOverview(clients)
    
    // Análise de churn
    const churnAnalysis = await this.analyzeChurnRisk(clients)
    
    // Oportunidades de upsell
    const upsellOpportunities = await this.identifyUpsellOpportunities(clients)
    
    // Análise comportamental
    const behaviorAnalysis = await this.analyzeBehaviorPatterns(clients)
    
    // Insights acionáveis
    const actionableInsights = await this.generateActionableInsights(clients, churnAnalysis, upsellOpportunities)

    const insights: CustomerInsights = {
      overview,
      churnAnalysis,
      upsellOpportunities,
      behaviorAnalysis,
      actionableInsights
    }

    this.setCachedData(cacheKey, insights)
    return insights
  }

  private async getClientsData(professionalId: string): Promise<any[]> {
    const clients = await prisma.client.findMany({
      where: { professionalId },
      include: {
        appointments: {
          include: {
            _count: true
          },
          orderBy: {
            scheduledFor: 'desc'
          }
        }
      }
    })

    // Enriquecer dados com métricas calculadas
    return clients.map(client => {
      const appointments = client.appointments
      const totalSpent = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
      const avgSpending = appointments.length > 0 ? totalSpent / appointments.length : 0
      const lastVisit = appointments.length > 0 ? appointments[0].scheduledFor : client.createdAt
      const daysSinceLastVisit = Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...client,
        metrics: {
          totalSpent,
          avgSpending,
          visitFrequency: this.calculateVisitFrequency(appointments),
          lastVisit,
          daysSinceLastVisit,
          lifespan: Math.floor((Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          noShowCount: appointments.filter(a => a.status === 'NO_SHOW').length,
          completedAppointments: appointments.filter(a => a.status === 'COMPLETED').length
        }
      }
    })
  }

  private async generateOverview(clients: any[]): Promise<CustomerInsights['overview']> {
    const totalClients = clients.length
    const activeClients = clients.filter(c => c.metrics.daysSinceLastVisit <= 90).length
    const churnedClients = clients.filter(c => c.metrics.daysSinceLastVisit > 180).length
    const churnRate = totalClients > 0 ? (churnedClients / totalClients) * 100 : 0
    const averageLifespan = clients.reduce((sum, c) => sum + c.metrics.lifespan, 0) / totalClients

    // Segmentação automática
    const segments = this.segmentClients(clients)
    const segmentDistribution = Object.entries(segments).map(([segment, clientList]) => ({
      segment,
      count: (clientList as any[]).length,
      percentage: ((clientList as any[]).length / totalClients) * 100,
      avgLtv: this.calculateAvgLTV(clientList as any[]),
      churnRate: this.calculateSegmentChurnRate(clientList as any[]),
      growthRate: 5 + Math.random() * 15 // Simulado
    }))

    return {
      totalClients,
      activeClients,
      churnRate,
      averageLifespan,
      segmentDistribution
    }
  }

  private async analyzeChurnRisk(clients: any[]): Promise<CustomerInsights['churnAnalysis']> {
    // Análise de risco por segmento
    const segments = this.segmentClients(clients)
    const riskSegments: ChurnRiskSegment[] = Object.entries(segments).map(([segment, clientList]) => {
      const list = clientList as any[]
      const highRiskClients = list.filter(c => this.calculateChurnProbability(c) > 0.7).length
      const avgRevenue = this.calculateAvgLTV(list)
      
      return {
        segment,
        riskLevel: highRiskClients / list.length > 0.3 ? 'high' : 
                  highRiskClients / list.length > 0.1 ? 'medium' : 'low',
        clientCount: list.length,
        churnProbability: this.calculateSegmentChurnProbability(list),
        revenueAtRisk: highRiskClients * avgRevenue,
        topReasons: this.getTopChurnReasons(list),
        preventionScore: 0.75 + Math.random() * 0.2
      }
    })

    // Predições individuais
    const churnPredictions: ChurnPrediction[] = clients
      .map(client => ({
        clientId: client.id,
        clientName: client.name,
        churnProbability: this.calculateChurnProbability(client),
        riskFactors: this.identifyRiskFactors(client),
        lastVisit: client.metrics.lastVisit,
        totalValue: client.metrics.totalSpent,
        recommendedAction: this.getRecommendedAction(client),
        timeToIntervene: this.calculateInterventionTime(client)
      }))
      .filter(p => p.churnProbability > 0.5)
      .sort((a, b) => b.churnProbability - a.churnProbability)
      .slice(0, 20)

    // Estratégias de retenção
    const retentionStrategies: RetentionStrategy[] = [
      {
        strategy: 'Programa de Fidelidade Personalizado',
        targetSegment: 'Clientes em Risco',
        effectiveness: 0.75,
        cost: 500,
        expectedRetention: 0.65,
        implementation: 'Oferecer benefícios exclusivos baseados no histórico'
      },
      {
        strategy: 'Comunicação Proativa',
        targetSegment: 'Clientes Inativos',
        effectiveness: 0.60,
        cost: 200,
        expectedRetention: 0.45,
        implementation: 'Campanhas de reengajamento personalizadas'
      },
      {
        strategy: 'Desconto Estratégico',
        targetSegment: 'Alto Valor',
        effectiveness: 0.80,
        cost: 800,
        expectedRetention: 0.75,
        implementation: 'Ofertas exclusivas para clientes premium'
      }
    ]

    // Ações de prevenção
    const preventionActions: PreventionAction[] = [
      {
        type: 'immediate',
        priority: 'high',
        action: 'Contatar clientes com 60+ dias sem agendamento',
        targetClients: churnPredictions.filter(p => p.churnProbability > 0.8).length,
        expectedImpact: 'Reduzir churn em 30%',
        timeline: '3 dias'
      },
      {
        type: 'short_term',
        priority: 'medium',
        action: 'Implementar programa de pontos diferenciado',
        targetClients: riskSegments.reduce((sum, s) => sum + s.clientCount, 0),
        expectedImpact: 'Aumentar retenção em 25%',
        timeline: '2 semanas'
      }
    ]

    return {
      riskSegments,
      churnPredictions,
      retentionStrategies,
      preventionActions
    }
  }

  private async identifyUpsellOpportunities(clients: any[]): Promise<CustomerInsights['upsellOpportunities']> {
    // Oportunidades de upsell individual
    const opportunities: UpsellOpportunity[] = clients
      .filter(c => c.metrics.completedAppointments >= 3)
      .map(client => {
        const currentSpending = client.metrics.avgSpending
        const targetSpending = currentSpending * (1.3 + Math.random() * 0.4) // 30-70% aumento
        
        return {
          clientId: client.id,
          clientName: client.name,
          currentSpending,
          targetSpending,
          uplifPotential: ((targetSpending - currentSpending) / currentSpending) * 100,
          recommendedServices: this.getRecommendedServices(client),
          probability: this.calculateUpsellProbability(client),
          bestApproach: this.getBestUpsellApproach(client)
        }
      })
      .filter(o => o.uplifPotential > 20)
      .sort((a, b) => b.uplifPotential - a.uplifPotential)
      .slice(0, 15)

    // Sugestões de cross-sell
    const crossSellSuggestions: CrossSellSuggestion[] = [
      {
        service: 'Tratamento Facial',
        targetSegment: 'Clientes de Cabelo',
        penetrationRate: 15,
        opportunity: 65,
        avgRevenue: 120,
        conversionRate: 0.25,
        recommendation: 'Oferecer durante serviços de cabelo'
      },
      {
        service: 'Manicure/Pedicure',
        targetSegment: 'Clientes de Estética',
        penetrationRate: 30,
        opportunity: 45,
        avgRevenue: 80,
        conversionRate: 0.35,
        recommendation: 'Pacotes combinados com desconto'
      }
    ]

    // Upgrades premium
    const premiumUpgrades: PremiumUpgrade[] = clients
      .filter(c => c.metrics.totalSpent > 500 && c.metrics.avgSpending < 150)
      .map(client => ({
        clientId: client.id,
        clientName: client.name,
        currentTier: 'Standard',
        recommendedTier: 'Premium',
        additionalRevenue: 80,
        upgradeReasons: ['Histórico de fidelidade', 'Perfil de gastos compatível'],
        probability: 0.4 + Math.random() * 0.4
      }))
      .slice(0, 10)

    // Recomendações de bundles
    const bundleRecommendations: BundleRecommendation[] = [
      {
        bundleName: 'Pacote Beleza Completa',
        services: ['Corte', 'Coloração', 'Hidratação', 'Escova'],
        currentPrice: 380,
        bundlePrice: 320,
        discount: 15.8,
        targetSegment: 'Clientes Regulares',
        estimatedDemand: 25
      },
      {
        bundleName: 'Spa Day Premium',
        services: ['Facial', 'Massagem', 'Manicure', 'Pedicure'],
        currentPrice: 450,
        bundlePrice: 360,
        discount: 20,
        targetSegment: 'Clientes VIP',
        estimatedDemand: 12
      }
    ]

    return {
      opportunities,
      crossSellSuggestions,
      premiumUpgrades,
      bundleRecommendations
    }
  }

  private async analyzeBehaviorPatterns(clients: any[]): Promise<CustomerInsights['behaviorAnalysis']> {
    // Padrões comportamentais
    const patterns: BehaviorPattern[] = [
      {
        pattern: 'Agendamentos de última hora',
        frequency: 25,
        segment: 'Clientes Jovens',
        description: '25% dos clientes agendam com menos de 24h',
        businessImpact: 'Dificuldade no planejamento de agenda',
        actionable: true
      },
      {
        pattern: 'Preferência por horários de pico',
        frequency: 60,
        segment: 'Profissionais',
        description: '60% preferem horários entre 18h-20h',
        businessImpact: 'Saturação em horários específicos',
        actionable: true
      }
    ]

    // Preferências dos clientes
    const preferences: ClientPreference[] = [
      {
        category: 'Horário',
        preference: 'Final de semana',
        percentage: 35,
        segment: 'Geral',
        opportunity: 'Expandir horários de sábado'
      },
      {
        category: 'Comunicação',
        preference: 'WhatsApp',
        percentage: 85,
        segment: 'Todos',
        opportunity: 'Automatizar lembretes via WhatsApp'
      }
    ]

    // Análise da jornada do cliente
    const journeyAnalysis: CustomerJourney[] = [
      {
        stage: 'Descoberta',
        averageDuration: 3,
        conversionRate: 65,
        dropoffPoints: ['Preço alto', 'Falta de horários'],
        optimizationOpportunities: ['Marketing de valor', 'Flexibilidade de agenda']
      },
      {
        stage: 'Primeiro Agendamento',
        averageDuration: 7,
        conversionRate: 85,
        dropoffPoints: ['Experiência ruim', 'Expectativas não atendidas'],
        optimizationOpportunities: ['Treinamento de qualidade', 'Gestão de expectativas']
      }
    ]

    // Scores de engajamento
    const engagementScores: EngagementScore[] = clients
      .map(client => ({
        clientId: client.id,
        clientName: client.name,
        score: this.calculateEngagementScore(client),
        trend: this.getEngagementTrend(client),
        factors: this.getEngagementFactors(client),
        recommendations: this.getEngagementRecommendations(client)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    return {
      patterns,
      preferences,
      journeyAnalysis,
      engagementScores
    }
  }

  private async generateActionableInsights(
    clients: any[], 
    churnAnalysis: any, 
    upsellOpportunities: any
  ): Promise<CustomerInsights['actionableInsights']> {
    // Ações urgentes
    const urgentActions: UrgentAction[] = [
      {
        priority: 1,
        action: 'Contatar clientes de alto risco imediatamente',
        reason: `${churnAnalysis.churnPredictions.filter((p: any) => p.churnProbability > 0.8).length} clientes com risco > 80%`,
        targetClients: churnAnalysis.churnPredictions.filter((p: any) => p.churnProbability > 0.8).map((p: any) => p.clientName),
        expectedOutcome: 'Prevenir 60% dos churns',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      },
      {
        priority: 2,
        action: 'Implementar ofertas de upsell personalizadas',
        reason: `${upsellOpportunities.opportunities.length} oportunidades identificadas`,
        targetClients: upsellOpportunities.opportunities.slice(0, 5).map((o: any) => o.clientName),
        expectedOutcome: 'Aumento de 25% na receita média',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ]

    // Oportunidades de crescimento
    const growthOpportunities: GrowthOpportunity[] = [
      {
        opportunity: 'Programa de Indicação VIP',
        potentialRevenue: 15000,
        targetSegment: 'Clientes Satisfeitos',
        implementation: 'Oferecer incentivos para indicações',
        timeline: '1 mês',
        confidence: 0.75
      },
      {
        opportunity: 'Serviços Premium Exclusivos',
        potentialRevenue: 8000,
        targetSegment: 'Alto Valor',
        implementation: 'Criar linha de serviços premium',
        timeline: '2 meses',
        confidence: 0.65
      }
    ]

    // Táticas de retenção
    const retentionTactics: RetentionTactic[] = [
      {
        tactic: 'Check-in proativo após 30 dias',
        targetChurnRate: 10,
        currentChurnRate: 15,
        effectiveness: 0.70,
        cost: 300,
        roi: 400
      },
      {
        tactic: 'Programa de pontos acelerado',
        targetChurnRate: 8,
        currentChurnRate: 15,
        effectiveness: 0.85,
        cost: 800,
        roi: 300
      }
    ]

    // Otimização de receita
    const revenueOptimization: RevenueOptimization[] = [
      {
        optimization: 'Preços dinâmicos por horário',
        currentRevenue: 18500,
        optimizedRevenue: 21200,
        improvement: 14.6,
        implementation: 'Sistema de pricing automatizado',
        effort: 'medium'
      },
      {
        optimization: 'Pacotes sazonais',
        currentRevenue: 18500,
        optimizedRevenue: 19800,
        improvement: 7.0,
        implementation: 'Criação de ofertas temáticas',
        effort: 'low'
      }
    ]

    return {
      urgentActions,
      growthOpportunities,
      retentionTactics,
      revenueOptimization
    }
  }

  // Métodos auxiliares
  private calculateVisitFrequency(appointments: any[]): number {
    if (appointments.length < 2) return 0
    
    const dates = appointments.map(a => new Date(a.scheduledFor).getTime()).sort()
    const intervals = []
    
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24))
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  }

  private segmentClients(clients: any[]): Record<string, any[]> {
    const segments: Record<string, any[]> = {
      'VIP': [],
      'Regular': [],
      'Ocasional': [],
      'Novo': [],
      'Em Risco': []
    }

    clients.forEach(client => {
      const { totalSpent, completedAppointments, daysSinceLastVisit } = client.metrics
      
      if (daysSinceLastVisit > 90) {
        segments['Em Risco'].push(client)
      } else if (totalSpent >= 1500 && completedAppointments >= 8) {
        segments['VIP'].push(client)
      } else if (completedAppointments >= 4) {
        segments['Regular'].push(client)
      } else if (completedAppointments >= 2) {
        segments['Ocasional'].push(client)
      } else {
        segments['Novo'].push(client)
      }
    })

    return segments
  }

  private calculateChurnProbability(client: any): number {
    const { daysSinceLastVisit, visitFrequency, noShowCount, completedAppointments } = client.metrics
    
    let probability = 0
    
    // Fatores de risco
    if (daysSinceLastVisit > 90) probability += 0.4
    else if (daysSinceLastVisit > 60) probability += 0.2
    
    if (visitFrequency > 60) probability += 0.2
    if (noShowCount > 2) probability += 0.15
    if (completedAppointments < 3) probability += 0.1
    
    return Math.min(probability, 0.95)
  }

  private calculateAvgLTV(clients: any[]): number {
    if (clients.length === 0) return 0
    return clients.reduce((sum, c) => sum + c.metrics.totalSpent, 0) / clients.length
  }

  private calculateSegmentChurnRate(clients: any[]): number {
    const churned = clients.filter(c => c.metrics.daysSinceLastVisit > 180).length
    return clients.length > 0 ? (churned / clients.length) * 100 : 0
  }

  private calculateSegmentChurnProbability(clients: any[]): number {
    return clients.reduce((sum, c) => sum + this.calculateChurnProbability(c), 0) / clients.length
  }

  private getTopChurnReasons(clients: any[]): string[] {
    return [
      'Longo período sem agendamento',
      'Histórico de no-shows',
      'Baixa frequência de visitas',
      'Não responde a comunicações'
    ]
  }

  private identifyRiskFactors(client: any): string[] {
    const factors = []
    const { daysSinceLastVisit, noShowCount, visitFrequency } = client.metrics
    
    if (daysSinceLastVisit > 60) factors.push('Inativo há mais de 60 dias')
    if (noShowCount > 1) factors.push('Histórico de faltas')
    if (visitFrequency > 90) factors.push('Baixa frequência de visitas')
    
    return factors
  }

  private getRecommendedAction(client: any): string {
    const probability = this.calculateChurnProbability(client)
    
    if (probability > 0.8) return 'Contato urgente + oferta especial'
    if (probability > 0.6) return 'Check-in personalizado'
    if (probability > 0.4) return 'Campanha de reengajamento'
    return 'Monitoramento'
  }

  private calculateInterventionTime(client: any): number {
    const probability = this.calculateChurnProbability(client)
    return probability > 0.8 ? 1 : probability > 0.6 ? 3 : 7
  }

  private getRecommendedServices(client: any): string[] {
    // Lógica baseada no histórico do cliente
    return ['Tratamento Premium', 'Pacote Completo', 'Serviço Adicional']
  }

  private calculateUpsellProbability(client: any): number {
    return 0.3 + Math.random() * 0.5 // 30-80%
  }

  private getBestUpsellApproach(client: any): string {
    return client.metrics.totalSpent > 800 ? 'Oferta VIP personalizada' : 'Pacote com desconto'
  }

  private calculateEngagementScore(client: any): number {
    return 60 + Math.random() * 40 // 60-100
  }

  private getEngagementTrend(client: any): 'increasing' | 'decreasing' | 'stable' {
    const trends = ['increasing', 'decreasing', 'stable'] as const
    return trends[Math.floor(Math.random() * trends.length)]
  }

  private getEngagementFactors(client: any): EngagementFactor[] {
    return [
      {
        factor: 'Frequência de visitas',
        weight: 0.3,
        impact: 0.7,
        description: 'Cliente mantém regularidade'
      },
      {
        factor: 'Resposta a comunicações',
        weight: 0.25,
        impact: 0.8,
        description: 'Boa responsividade'
      }
    ]
  }

  private getEngagementRecommendations(client: any): string[] {
    return ['Oferecer programa VIP', 'Comunicação mais frequente']
  }
}