import { NoShowPredictor, NoShowPrediction } from './no-show-prediction'
import { differenceInDays, startOfDay, endOfDay } from 'date-fns'

interface ClientRiskProfile {
  clientId: string
  currentScore: number // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  factors: {
    reliability: number // 0-100
    engagement: number // 0-100
    recency: number // 0-100
    value: number // 0-100
    loyalty: number // 0-100
  }
  lastUpdated: Date
  history: RiskScoreHistory[]
}

interface RiskScoreHistory {
  date: Date
  score: number
  event: 'APPOINTMENT_COMPLETED' | 'NO_SHOW' | 'CANCELLATION' | 'PAYMENT' | 'ENGAGEMENT'
  change: number
}

interface ClientSegment {
  name: string
  description: string
  criteria: (profile: ClientRiskProfile) => boolean
  color: string
  priority: number
}

export class RiskScoringSystem {
  private predictor: NoShowPredictor
  private readonly SCORE_WEIGHTS = {
    reliability: 0.40,    // Histórico de comparecimento
    engagement: 0.25,     // Nível de engajamento
    recency: 0.15,        // Atividade recente
    value: 0.10,          // Valor monetário
    loyalty: 0.10         // Fidelidade/longevidade
  }

  private readonly CLIENT_SEGMENTS: ClientSegment[] = [
    {
      name: 'VIP',
      description: 'Clientes de alto valor e baixo risco',
      criteria: (profile) => profile.currentScore <= 20 && profile.factors.value >= 80,
      color: 'text-purple-600 bg-purple-100',
      priority: 1
    },
    {
      name: 'Fiel',
      description: 'Clientes confiáveis e estáveis',
      criteria: (profile) => profile.currentScore <= 30 && profile.factors.reliability >= 80,
      color: 'text-green-600 bg-green-100',
      priority: 2
    },
    {
      name: 'Promissor',
      description: 'Novos clientes com potencial',
      criteria: (profile) => profile.currentScore <= 40 && profile.factors.recency >= 80,
      color: 'text-blue-600 bg-blue-100',
      priority: 3
    },
    {
      name: 'Atenção',
      description: 'Clientes que precisam de cuidado especial',
      criteria: (profile) => profile.currentScore >= 50 && profile.currentScore < 70,
      color: 'text-yellow-600 bg-yellow-100',
      priority: 4
    },
    {
      name: 'Risco',
      description: 'Clientes com alto risco de no-show',
      criteria: (profile) => profile.currentScore >= 70 && profile.currentScore < 85,
      color: 'text-orange-600 bg-orange-100',
      priority: 5
    },
    {
      name: 'Crítico',
      description: 'Clientes com risco crítico',
      criteria: (profile) => profile.currentScore >= 85,
      color: 'text-red-600 bg-red-100',
      priority: 6
    }
  ]

  constructor() {
    this.predictor = new NoShowPredictor()
  }

  /**
   * Calcula o score de risco completo de um cliente
   */
  async calculateClientRiskScore(
    clientId: string,
    appointmentHistory: any[],
    loyaltyData: any,
    engagementData: any
  ): Promise<ClientRiskProfile> {
    
    const factors = {
      reliability: this.calculateReliabilityScore(appointmentHistory),
      engagement: this.calculateEngagementScore(engagementData),
      recency: this.calculateRecencyScore(appointmentHistory),
      value: this.calculateValueScore(appointmentHistory, loyaltyData),
      loyalty: this.calculateLoyaltyScore(loyaltyData, appointmentHistory)
    }

    const currentScore = this.calculateOverallScore(factors)
    const riskLevel = this.determineRiskLevel(currentScore)
    const trend = this.analyzeTrend(clientId, currentScore)

    return {
      clientId,
      currentScore: Math.round(currentScore),
      riskLevel,
      trend,
      factors,
      lastUpdated: new Date(),
      history: await this.getScoreHistory(clientId)
    }
  }

  /**
   * Calcula score de confiabilidade baseado no histórico
   */
  private calculateReliabilityScore(appointmentHistory: any[]): number {
    if (appointmentHistory.length === 0) return 50 // Neutro para novos clientes

    const total = appointmentHistory.length
    const completed = appointmentHistory.filter(apt => apt.status === 'COMPLETED').length
    const noShows = appointmentHistory.filter(apt => apt.status === 'NO_SHOW').length
    const cancelled = appointmentHistory.filter(apt => apt.status === 'CANCELLED').length

    const completionRate = completed / total
    const noShowRate = noShows / total
    const cancellationRate = cancelled / total

    // Score inverso: 100 = muito confiável, 0 = não confiável
    let score = 100 - (noShowRate * 80) - (cancellationRate * 40)
    
    // Bonus para alta taxa de comparecimento
    if (completionRate >= 0.9) score += 10
    
    // Penalidade para poucos dados
    if (total < 3) score -= 20

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calcula score de engajamento
   */
  private calculateEngagementScore(engagementData: any): number {
    let score = 50 // Base neutra

    // Resposta a lembretes
    if (engagementData.reminderResponseRate >= 0.8) {
      score += 20
    } else if (engagementData.reminderResponseRate >= 0.5) {
      score += 10
    } else {
      score -= 15
    }

    // Interação com comunicações
    if (engagementData.messageResponseTime) {
      if (engagementData.messageResponseTime <= 60) { // 1 hora
        score += 15
      } else if (engagementData.messageResponseTime <= 240) { // 4 horas
        score += 10
      } else {
        score -= 10
      }
    }

    // Feedback e avaliações
    if (engagementData.reviewsSubmitted > 0) {
      score += engagementData.reviewsSubmitted * 5
    }

    // Uso do portal self-service
    if (engagementData.selfServiceUsage >= 3) {
      score += 10
    }

    // Participação em programa de fidelidade
    if (engagementData.loyaltyParticipation) {
      score += 15
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calcula score de recência (atividade recente)
   */
  private calculateRecencyScore(appointmentHistory: any[]): number {
    if (appointmentHistory.length === 0) return 50

    const now = new Date()
    const lastAppointment = appointmentHistory
      .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())[0]

    const daysSinceLastAppointment = differenceInDays(now, new Date(lastAppointment.scheduledFor))

    // Score baseado na recência
    if (daysSinceLastAppointment <= 30) return 100
    if (daysSinceLastAppointment <= 60) return 80
    if (daysSinceLastAppointment <= 90) return 60
    if (daysSinceLastAppointment <= 180) return 40
    if (daysSinceLastAppointment <= 365) return 20
    return 10 // Mais de 1 ano
  }

  /**
   * Calcula score de valor monetário
   */
  private calculateValueScore(appointmentHistory: any[], loyaltyData: any): number {
    if (appointmentHistory.length === 0) return 50

    const totalSpent = appointmentHistory
      .filter(apt => apt.status === 'COMPLETED')
      .reduce((sum, apt) => sum + apt.servicePrice, 0)

    const averageTicket = totalSpent / appointmentHistory.length
    const frequency = appointmentHistory.length

    let score = 50

    // Score baseado no gasto total
    if (totalSpent >= 2000) score += 30
    else if (totalSpent >= 1000) score += 20
    else if (totalSpent >= 500) score += 10
    else if (totalSpent < 100) score -= 20

    // Score baseado no ticket médio
    if (averageTicket >= 200) score += 15
    else if (averageTicket >= 100) score += 10
    else if (averageTicket < 50) score -= 15

    // Score baseado na frequência
    if (frequency >= 10) score += 15
    else if (frequency >= 5) score += 10
    else if (frequency < 3) score -= 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calcula score de fidelidade
   */
  private calculateLoyaltyScore(loyaltyData: any, appointmentHistory: any[]): number {
    let score = 50

    // Pontos de fidelidade
    if (loyaltyData.points >= 500) score += 25
    else if (loyaltyData.points >= 200) score += 15
    else if (loyaltyData.points >= 100) score += 10

    // Tempo como cliente
    if (appointmentHistory.length > 0) {
      const firstAppointment = appointmentHistory
        .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0]
      const daysSinceFirst = differenceInDays(new Date(), new Date(firstAppointment.scheduledFor))
      
      if (daysSinceFirst >= 365) score += 20
      else if (daysSinceFirst >= 180) score += 15
      else if (daysSinceFirst >= 90) score += 10
    }

    // Regularidade dos agendamentos
    if (appointmentHistory.length >= 12) {
      const monthsSpanned = this.calculateMonthsSpanned(appointmentHistory)
      const regularityRate = appointmentHistory.length / monthsSpanned
      
      if (regularityRate >= 1) score += 15 // Pelo menos 1 por mês
      else if (regularityRate >= 0.5) score += 10
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calcula score geral ponderado
   */
  private calculateOverallScore(factors: ClientRiskProfile['factors']): number {
    // Converte scores individuais (0-100) para risco (0-100)
    // Scores altos de qualidade = baixo risco
    const riskScore = 100 - (
      (100 - factors.reliability) * this.SCORE_WEIGHTS.reliability +
      (100 - factors.engagement) * this.SCORE_WEIGHTS.engagement +
      (100 - factors.recency) * this.SCORE_WEIGHTS.recency +
      (100 - factors.value) * this.SCORE_WEIGHTS.value +
      (100 - factors.loyalty) * this.SCORE_WEIGHTS.loyalty
    )

    return Math.max(0, Math.min(100, riskScore))
  }

  /**
   * Determina nível de risco
   */
  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 85) return 'CRITICAL'
    if (score >= 70) return 'HIGH'
    if (score >= 50) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Analisa tendência do score
   */
  private analyzeTrend(clientId: string, currentScore: number): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    // Em produção, compararia com scores históricos
    // Por ora, implementação simplificada
    return 'STABLE'
  }

  /**
   * Obtém histórico de scores
   */
  private async getScoreHistory(clientId: string): Promise<RiskScoreHistory[]> {
    // Em produção, viria do banco de dados
    // Por ora, retorna dados simulados
    return [
      {
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        score: 45,
        event: 'APPOINTMENT_COMPLETED',
        change: -5
      },
      {
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        score: 40,
        event: 'ENGAGEMENT',
        change: -5
      }
    ]
  }

  /**
   * Segmenta cliente baseado no perfil de risco
   */
  segmentClient(profile: ClientRiskProfile): ClientSegment | null {
    return this.CLIENT_SEGMENTS.find(segment => segment.criteria(profile)) || null
  }

  /**
   * Obtém todos os segmentos disponíveis
   */
  getAvailableSegments(): ClientSegment[] {
    return this.CLIENT_SEGMENTS
  }

  /**
   * Atualiza score após evento específico
   */
  async updateScoreAfterEvent(
    clientId: string,
    event: 'APPOINTMENT_COMPLETED' | 'NO_SHOW' | 'CANCELLATION' | 'PAYMENT' | 'ENGAGEMENT',
    context?: any
  ): Promise<{ oldScore: number; newScore: number; change: number }> {
    
    // Em produção, recalcularia o score baseado no evento
    let scoreChange = 0
    
    switch (event) {
      case 'APPOINTMENT_COMPLETED':
        scoreChange = -5 // Reduz risco
        break
      case 'NO_SHOW':
        scoreChange = +15 // Aumenta risco significativamente
        break
      case 'CANCELLATION':
        scoreChange = +8 // Aumenta risco moderadamente
        break
      case 'PAYMENT':
        scoreChange = -3 // Reduz risco levemente
        break
      case 'ENGAGEMENT':
        scoreChange = -2 // Reduz risco levemente
        break
    }

    // Simula atualização
    const oldScore = 50 // Viria do banco
    const newScore = Math.max(0, Math.min(100, oldScore + scoreChange))

    return {
      oldScore,
      newScore,
      change: scoreChange
    }
  }

  /**
   * Obtém clientes de alto risco
   */
  async getHighRiskClients(professionalId: string, limit: number = 50): Promise<ClientRiskProfile[]> {
    // Em produção, consultaria o banco de dados
    // Por ora, retorna dados simulados
    return []
  }

  /**
   * Obtém estatísticas de risco
   */
  async getRiskStatistics(professionalId: string): Promise<{
    totalClients: number
    riskDistribution: Record<string, number>
    averageScore: number
    trends: {
      improving: number
      stable: number
      declining: number
    }
  }> {
    // Em produção, calcularia estatísticas reais
    return {
      totalClients: 150,
      riskDistribution: {
        LOW: 45,
        MEDIUM: 30,
        HIGH: 20,
        CRITICAL: 5
      },
      averageScore: 38,
      trends: {
        improving: 35,
        stable: 50,
        declining: 15
      }
    }
  }

  /**
   * Calcula meses entre primeiro e último agendamento
   */
  private calculateMonthsSpanned(appointments: any[]): number {
    if (appointments.length < 2) return 1

    const sorted = appointments.sort((a, b) => 
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    )
    
    const first = new Date(sorted[0].scheduledFor)
    const last = new Date(sorted[sorted.length - 1].scheduledFor)
    
    const months = (last.getFullYear() - first.getFullYear()) * 12 + 
                  (last.getMonth() - first.getMonth())
    
    return Math.max(1, months)
  }

  /**
   * Gera recomendações baseadas no perfil de risco
   */
  generateRiskRecommendations(profile: ClientRiskProfile): string[] {
    const recommendations: string[] = []

    if (profile.riskLevel === 'CRITICAL') {
      recommendations.push('🚨 Contato imediato obrigatório antes de agendamentos')
      recommendations.push('💰 Exigir pagamento antecipado para todos os serviços')
      recommendations.push('📞 Confirmação por telefone 24h e 2h antes')
    }

    if (profile.factors.reliability < 50) {
      recommendations.push('📋 Implementar política de confirmação dupla')
      recommendations.push('⚠️ Considerar taxa de reserva')
    }

    if (profile.factors.engagement < 50) {
      recommendations.push('💌 Aumentar frequência de comunicação')
      recommendations.push('🎁 Oferecer incentivos para maior engajamento')
    }

    if (profile.factors.recency < 50) {
      recommendations.push('📱 Campanha de reativação personalizada')
      recommendations.push('💝 Oferta especial para retorno')
    }

    if (profile.factors.value < 50) {
      recommendations.push('⬆️ Estratégia de upsell de serviços')
      recommendations.push('📦 Pacotes promocionais atrrativos')
    }

    return recommendations
  }
}