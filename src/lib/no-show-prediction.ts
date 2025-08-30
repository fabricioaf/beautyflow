import { addDays, differenceInDays, differenceInHours, format, isWeekend, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AppointmentData {
  id: string
  clientId: string
  scheduledFor: Date
  createdAt: Date
  servicePrice: number
  serviceDuration: number
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED'
  remindersSent: number
  clientAge?: number
  isFirstTime: boolean
}

interface ClientHistoryData {
  totalAppointments: number
  noShowCount: number
  cancelCount: number
  completedCount: number
  averageAdvanceBooking: number // dias de antecedência média
  preferredTimeSlots: string[]
  loyaltyPoints: number
  lastAppointmentDate?: Date
  averageServiceValue: number
}

interface PredictionFactors {
  // Fatores do cliente
  clientHistory: ClientHistoryData
  clientRiskProfile: 'LOW' | 'MEDIUM' | 'HIGH'
  
  // Fatores do agendamento
  advanceBookingDays: number
  dayOfWeek: number
  timeOfDay: number
  isWeekend: boolean
  serviceValue: number
  isPaidInAdvance: boolean
  
  // Fatores externos
  weatherRisk?: number // 0-1 (futuro)
  seasonalFactor: number // baseado no mês
  holidayProximity: number // proximidade com feriados
  
  // Fatores de engajamento
  remindersSent: number
  lastContactDays: number
  loyaltyLevel: number
}

export interface NoShowPrediction {
  appointmentId: string
  clientId: string
  riskScore: number // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence: number // 0-1
  factors: {
    primary: string[]
    secondary: string[]
  }
  recommendations: string[]
  lastUpdated: Date
}

export class NoShowPredictor {
  private readonly WEIGHTS = {
    clientHistory: 0.35,
    bookingPatterns: 0.25,
    engagement: 0.20,
    external: 0.15,
    temporal: 0.05
  }

  private readonly RISK_THRESHOLDS = {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80
  }

  /**
   * Prediz a probabilidade de no-show para um agendamento
   */
  async predictNoShow(
    appointment: AppointmentData,
    clientHistory: ClientHistoryData,
    externalFactors?: Partial<PredictionFactors>
  ): Promise<NoShowPrediction> {
    
    const factors = this.calculateFactors(appointment, clientHistory, externalFactors)
    const riskScore = this.calculateRiskScore(factors)
    const riskLevel = this.determineRiskLevel(riskScore)
    const confidence = this.calculateConfidence(factors, clientHistory)
    
    return {
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      riskScore: Math.round(riskScore),
      riskLevel,
      confidence,
      factors: this.identifyKeyFactors(factors, riskScore),
      recommendations: this.generateRecommendations(riskLevel, factors),
      lastUpdated: new Date()
    }
  }

  /**
   * Calcula todos os fatores que influenciam a predição
   */
  private calculateFactors(
    appointment: AppointmentData,
    clientHistory: ClientHistoryData,
    external?: Partial<PredictionFactors>
  ): PredictionFactors {
    
    const advanceBookingDays = differenceInDays(appointment.scheduledFor, appointment.createdAt)
    const appointmentDate = appointment.scheduledFor
    const dayOfWeek = getDay(appointmentDate)
    const timeOfDay = appointmentDate.getHours() + (appointmentDate.getMinutes() / 60)
    
    return {
      clientHistory,
      clientRiskProfile: this.assessClientRiskProfile(clientHistory),
      advanceBookingDays,
      dayOfWeek,
      timeOfDay,
      isWeekend: isWeekend(appointmentDate),
      serviceValue: appointment.servicePrice,
      isPaidInAdvance: appointment.paymentStatus === 'COMPLETED',
      seasonalFactor: this.calculateSeasonalFactor(appointmentDate),
      holidayProximity: this.calculateHolidayProximity(appointmentDate),
      remindersSent: appointment.remindersSent,
      lastContactDays: clientHistory.lastAppointmentDate 
        ? differenceInDays(new Date(), clientHistory.lastAppointmentDate)
        : 999,
      loyaltyLevel: this.calculateLoyaltyLevel(clientHistory.loyaltyPoints),
      ...external
    }
  }

  /**
   * Calcula o score de risco final
   */
  private calculateRiskScore(factors: PredictionFactors): number {
    let score = 0

    // 1. Histórico do Cliente (35%)
    const historyScore = this.calculateHistoryScore(factors.clientHistory)
    score += historyScore * this.WEIGHTS.clientHistory

    // 2. Padrões de Agendamento (25%)
    const bookingScore = this.calculateBookingScore(factors)
    score += bookingScore * this.WEIGHTS.bookingPatterns

    // 3. Engajamento (20%)
    const engagementScore = this.calculateEngagementScore(factors)
    score += engagementScore * this.WEIGHTS.engagement

    // 4. Fatores Externos (15%)
    const externalScore = this.calculateExternalScore(factors)
    score += externalScore * this.WEIGHTS.external

    // 5. Fatores Temporais (5%)
    const temporalScore = this.calculateTemporalScore(factors)
    score += temporalScore * this.WEIGHTS.temporal

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Calcula score baseado no histórico do cliente
   */
  private calculateHistoryScore(history: ClientHistoryData): number {
    if (history.totalAppointments === 0) return 50 // Cliente novo = risco médio

    const noShowRate = history.noShowCount / history.totalAppointments
    const cancelRate = history.cancelCount / history.totalAppointments
    const reliabilityRate = history.completedCount / history.totalAppointments

    // No-show rate é o fator mais importante
    let score = noShowRate * 80

    // Taxa de cancelamento adiciona risco
    score += cancelRate * 30

    // Alta confiabilidade diminui o risco
    score -= reliabilityRate * 20

    // Clientes com poucos atendimentos têm risco aumentado
    if (history.totalAppointments < 3) {
      score += 20
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Calcula score baseado nos padrões de agendamento
   */
  private calculateBookingScore(factors: PredictionFactors): number {
    let score = 0

    // Antecedência do agendamento
    if (factors.advanceBookingDays < 1) {
      score += 40 // Agendamento de última hora = alto risco
    } else if (factors.advanceBookingDays < 3) {
      score += 25
    } else if (factors.advanceBookingDays > 30) {
      score += 15 // Muito antecipado também pode ser arriscado
    }

    // Dia da semana (segunda-feira tem mais no-shows)
    if (factors.dayOfWeek === 1) { // Segunda
      score += 15
    } else if (factors.dayOfWeek === 6 || factors.dayOfWeek === 0) { // Weekend
      score += 10
    }

    // Horário do dia
    if (factors.timeOfDay < 9 || factors.timeOfDay > 18) {
      score += 10 // Horários extremos
    }

    // Valor do serviço
    if (factors.serviceValue > 200) {
      score -= 10 // Serviços caros = menos no-shows
    } else if (factors.serviceValue < 50) {
      score += 15 // Serviços baratos = mais no-shows
    }

    // Pagamento antecipado
    if (factors.isPaidInAdvance) {
      score -= 25 // Pagamento antecipado reduz muito o risco
    } else {
      score += 20
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Calcula score baseado no engajamento
   */
  private calculateEngagementScore(factors: PredictionFactors): number {
    let score = 0

    // Lembretes enviados
    if (factors.remindersSent === 0) {
      score += 30
    } else if (factors.remindersSent === 1) {
      score += 15
    } else {
      score -= 5 // Múltiplos lembretes = mais engajamento
    }

    // Último contato
    if (factors.lastContactDays > 90) {
      score += 25 // Cliente inativo
    } else if (factors.lastContactDays > 30) {
      score += 10
    }

    // Nível de fidelidade
    if (factors.loyaltyLevel >= 4) {
      score -= 20 // Clientes muito fiéis
    } else if (factors.loyaltyLevel >= 2) {
      score -= 10
    } else {
      score += 15 // Baixa fidelidade
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Calcula score baseado em fatores externos
   */
  private calculateExternalScore(factors: PredictionFactors): number {
    let score = 0

    // Fator sazonal
    score += factors.seasonalFactor * 20

    // Proximidade com feriados
    score += factors.holidayProximity * 15

    // Clima (futuro)
    if (factors.weatherRisk) {
      score += factors.weatherRisk * 25
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Calcula score baseado em fatores temporais
   */
  private calculateTemporalScore(factors: PredictionFactors): number {
    let score = 0

    // Horários de pico têm menos no-shows
    if (factors.timeOfDay >= 14 && factors.timeOfDay <= 17) {
      score -= 10
    }

    // Fins de semana podem ter mais no-shows dependendo do tipo de serviço
    if (factors.isWeekend) {
      score += 5
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Avalia o perfil de risco geral do cliente
   */
  private assessClientRiskProfile(history: ClientHistoryData): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (history.totalAppointments === 0) return 'MEDIUM'

    const noShowRate = history.noShowCount / history.totalAppointments
    const reliabilityRate = history.completedCount / history.totalAppointments

    if (noShowRate >= 0.3 || reliabilityRate < 0.6) return 'HIGH'
    if (noShowRate >= 0.1 || reliabilityRate < 0.8) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Calcula fator sazonal baseado no mês
   */
  private calculateSeasonalFactor(date: Date): number {
    const month = date.getMonth() + 1
    
    // Janeiro (pós-festas), maio (feriados), dezembro (festas de fim de ano)
    if ([1, 5, 12].includes(month)) return 0.8
    
    // Meses de férias (julho, janeiro)
    if ([7].includes(month)) return 0.6
    
    // Meses normais
    return 0.2
  }

  /**
   * Calcula proximidade com feriados
   */
  private calculateHolidayProximity(date: Date): number {
    // Feriados brasileiros principais (simplificado)
    const holidays = [
      '01-01', // Ano Novo
      '02-13', // Carnaval (aproximado)
      '04-21', // Tiradentes
      '05-01', // Dia do Trabalho
      '09-07', // Independência
      '10-12', // Nossa Senhora Aparecida
      '11-02', // Finados
      '11-15', // Proclamação da República
      '12-25'  // Natal
    ]

    const dateStr = format(date, 'MM-dd')
    
    for (const holiday of holidays) {
      const [month, day] = holiday.split('-').map(Number)
      const holidayDate = new Date(date.getFullYear(), month - 1, day)
      const daysDiff = Math.abs(differenceInDays(date, holidayDate))
      
      if (daysDiff <= 1) return 1.0 // Véspera ou dia do feriado
      if (daysDiff <= 3) return 0.6 // Próximo ao feriado
    }
    
    return 0.0
  }

  /**
   * Calcula nível de fidelidade (0-5)
   */
  private calculateLoyaltyLevel(points: number): number {
    if (points >= 1000) return 5
    if (points >= 500) return 4
    if (points >= 200) return 3
    if (points >= 100) return 2
    if (points >= 50) return 1
    return 0
  }

  /**
   * Determina o nível de risco baseado no score
   */
  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 90) return 'CRITICAL'
    if (score >= this.RISK_THRESHOLDS.HIGH) return 'HIGH'
    if (score >= this.RISK_THRESHOLDS.MEDIUM) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Calcula confiança na predição
   */
  private calculateConfidence(factors: PredictionFactors, history: ClientHistoryData): number {
    let confidence = 0.5 // Base

    // Mais dados históricos = maior confiança
    if (history.totalAppointments >= 10) confidence += 0.3
    else if (history.totalAppointments >= 5) confidence += 0.2
    else if (history.totalAppointments >= 3) confidence += 0.1

    // Padrões consistentes = maior confiança
    if (history.totalAppointments > 0) {
      const consistency = 1 - (history.cancelCount + history.noShowCount) / history.totalAppointments
      confidence += consistency * 0.2
    }

    return Math.min(1, Math.max(0, confidence))
  }

  /**
   * Identifica os principais fatores de risco
   */
  private identifyKeyFactors(factors: PredictionFactors, riskScore: number): {
    primary: string[]
    secondary: string[]
  } {
    const primary: string[] = []
    const secondary: string[] = []

    // Histórico de no-shows
    const noShowRate = factors.clientHistory.noShowCount / Math.max(1, factors.clientHistory.totalAppointments)
    if (noShowRate > 0.2) {
      primary.push(`Histórico de ${Math.round(noShowRate * 100)}% de faltas`)
    }

    // Agendamento de última hora
    if (factors.advanceBookingDays < 1) {
      primary.push('Agendamento de última hora')
    }

    // Sem pagamento antecipado
    if (!factors.isPaidInAdvance && factors.serviceValue > 100) {
      primary.push('Sem pagamento antecipado')
    }

    // Cliente inativo
    if (factors.lastContactDays > 90) {
      secondary.push('Cliente inativo há mais de 3 meses')
    }

    // Poucos lembretes
    if (factors.remindersSent === 0) {
      secondary.push('Nenhum lembrete enviado')
    }

    // Proximidade com feriados
    if (factors.holidayProximity > 0.5) {
      secondary.push('Próximo a feriado')
    }

    // Baixa fidelidade
    if (factors.loyaltyLevel < 2) {
      secondary.push('Baixo nível de fidelidade')
    }

    return { primary, secondary }
  }

  /**
   * Gera recomendações baseadas no nível de risco
   */
  private generateRecommendations(riskLevel: string, factors: PredictionFactors): string[] {
    const recommendations: string[] = []

    switch (riskLevel) {
      case 'CRITICAL':
        recommendations.push('🚨 Confirmar presença por telefone')
        recommendations.push('💰 Solicitar pagamento antecipado')
        recommendations.push('📞 Contato direto 24h antes')
        break

      case 'HIGH':
        recommendations.push('📱 Enviar lembrete extra via WhatsApp')
        recommendations.push('🎁 Oferecer incentivo para confirmação')
        recommendations.push('⏰ Confirmar presença 2h antes')
        break

      case 'MEDIUM':
        recommendations.push('📨 Lembrete por SMS 24h antes')
        recommendations.push('💝 Mencionar benefícios de fidelidade')
        break

      case 'LOW':
        recommendations.push('✅ Lembrete padrão é suficiente')
        break
    }

    // Recomendações específicas baseadas nos fatores
    if (!factors.isPaidInAdvance && factors.serviceValue > 150) {
      recommendations.push('💳 Sugerir pagamento antecipado com desconto')
    }

    if (factors.remindersSent === 0) {
      recommendations.push('📢 Ativar lembretes automáticos')
    }

    if (factors.loyaltyLevel < 2) {
      recommendations.push('⭐ Destacar programa de fidelidade')
    }

    return recommendations
  }

  /**
   * Atualiza predição com novos dados
   */
  async updatePrediction(
    currentPrediction: NoShowPrediction,
    newFactors: Partial<PredictionFactors>
  ): Promise<NoShowPrediction> {
    // Em uma implementação real, recalcularia com os novos fatores
    return {
      ...currentPrediction,
      lastUpdated: new Date()
    }
  }

  /**
   * Analisa eficácia das predições (para melhorar o modelo)
   */
  analyzeAccuracy(predictions: NoShowPrediction[], actualOutcomes: string[]): {
    accuracy: number
    precision: number
    recall: number
    recommendations: string[]
  } {
    let correct = 0
    let truePositives = 0
    let falsePositives = 0
    let falseNegatives = 0

    predictions.forEach((pred, index) => {
      const actual = actualOutcomes[index]
      const predictedRisk = pred.riskLevel === 'HIGH' || pred.riskLevel === 'CRITICAL'
      const actualNoShow = actual === 'NO_SHOW'

      if (predictedRisk === actualNoShow) correct++
      
      if (predictedRisk && actualNoShow) truePositives++
      if (predictedRisk && !actualNoShow) falsePositives++
      if (!predictedRisk && actualNoShow) falseNegatives++
    })

    const accuracy = correct / predictions.length
    const precision = truePositives / (truePositives + falsePositives)
    const recall = truePositives / (truePositives + falseNegatives)

    return {
      accuracy,
      precision,
      recall,
      recommendations: this.generateModelRecommendations(accuracy, precision, recall)
    }
  }

  private generateModelRecommendations(accuracy: number, precision: number, recall: number): string[] {
    const recommendations: string[] = []

    if (accuracy < 0.7) {
      recommendations.push('Revisar pesos dos fatores de predição')
    }

    if (precision < 0.6) {
      recommendations.push('Aumentar threshold para reduzir falsos positivos')
    }

    if (recall < 0.6) {
      recommendations.push('Diminuir threshold para capturar mais casos reais')
    }

    return recommendations
  }
}