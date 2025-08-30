interface LoyaltyRule {
  id: string
  name: string
  description: string
  points: number
  condition: 'appointment_completed' | 'payment_completed' | 'referral' | 'review_submitted' | 'birthday'
  multiplier?: number
  minimumSpent?: number
}

interface LoyaltyReward {
  id: string
  name: string
  description: string
  pointsCost: number
  type: 'discount_percentage' | 'discount_fixed' | 'free_service' | 'upgrade'
  value: number
  expiresInDays?: number
  isActive: boolean
}

interface LoyaltyTransaction {
  id: string
  clientId: string
  type: 'earned' | 'redeemed'
  points: number
  reason: string
  appointmentId?: string
  rewardId?: string
  createdAt: Date
}

export class LoyaltySystem {
  private rules: LoyaltyRule[] = [
    {
      id: 'appointment_completed',
      name: 'Atendimento Concluído',
      description: '10 pontos para cada atendimento concluído',
      points: 10,
      condition: 'appointment_completed'
    },
    {
      id: 'payment_completed',
      name: 'Pagamento Realizado',
      description: '1 ponto para cada R$ 10 gastos',
      points: 1,
      condition: 'payment_completed',
      minimumSpent: 10
    },
    {
      id: 'review_submitted',
      name: 'Avaliação Enviada',
      description: '15 pontos por avaliar o atendimento',
      points: 15,
      condition: 'review_submitted'
    },
    {
      id: 'referral_bonus',
      name: 'Indicação de Amigo',
      description: '50 pontos por indicar um novo cliente',
      points: 50,
      condition: 'referral'
    },
    {
      id: 'birthday_bonus',
      name: 'Bonus de Aniversário',
      description: '25 pontos no mês do aniversário',
      points: 25,
      condition: 'birthday'
    }
  ]

  private rewards: LoyaltyReward[] = [
    {
      id: 'discount_10_percent',
      name: '10% de Desconto',
      description: '10% de desconto em qualquer serviço',
      pointsCost: 100,
      type: 'discount_percentage',
      value: 10,
      expiresInDays: 30,
      isActive: true
    },
    {
      id: 'discount_15_percent',
      name: '15% de Desconto',
      description: '15% de desconto em qualquer serviço',
      pointsCost: 200,
      type: 'discount_percentage',
      value: 15,
      expiresInDays: 30,
      isActive: true
    },
    {
      id: 'discount_20_fixed',
      name: 'R$ 20 de Desconto',
      description: 'R$ 20 de desconto fixo',
      pointsCost: 150,
      type: 'discount_fixed',
      value: 20,
      expiresInDays: 45,
      isActive: true
    },
    {
      id: 'free_hydration',
      name: 'Hidratação Grátis',
      description: 'Uma hidratação capilar gratuita',
      pointsCost: 300,
      type: 'free_service',
      value: 0,
      expiresInDays: 60,
      isActive: true
    },
    {
      id: 'priority_booking',
      name: 'Agendamento Prioritário',
      description: 'Prioridade no agendamento por 3 meses',
      pointsCost: 500,
      type: 'upgrade',
      value: 90, // 90 dias
      isActive: true
    }
  ]

  /**
   * Calcula pontos para um atendimento concluído
   */
  calculateAppointmentPoints(appointmentValue: number): number {
    let totalPoints = 0

    // Pontos base por atendimento concluído
    const appointmentRule = this.rules.find(r => r.condition === 'appointment_completed')
    if (appointmentRule) {
      totalPoints += appointmentRule.points
    }

    // Pontos por valor gasto
    const paymentRule = this.rules.find(r => r.condition === 'payment_completed')
    if (paymentRule && paymentRule.minimumSpent) {
      const pointsFromSpending = Math.floor(appointmentValue / paymentRule.minimumSpent) * paymentRule.points
      totalPoints += pointsFromSpending
    }

    return totalPoints
  }

  /**
   * Calcula pontos para avaliação enviada
   */
  calculateReviewPoints(): number {
    const reviewRule = this.rules.find(r => r.condition === 'review_submitted')
    return reviewRule?.points || 0
  }

  /**
   * Calcula pontos de indicação
   */
  calculateReferralPoints(): number {
    const referralRule = this.rules.find(r => r.condition === 'referral')
    return referralRule?.points || 0
  }

  /**
   * Calcula pontos de aniversário
   */
  calculateBirthdayPoints(): number {
    const birthdayRule = this.rules.find(r => r.condition === 'birthday')
    return birthdayRule?.points || 0
  }

  /**
   * Determina o nível de fidelidade baseado nos pontos
   */
  getLoyaltyLevel(totalPoints: number): {
    level: 'Bronze' | 'Prata' | 'Ouro' | 'Diamante'
    color: string
    nextLevel?: string
    pointsToNext?: number
    benefits: string[]
  } {
    if (totalPoints >= 1000) {
      return {
        level: 'Diamante',
        color: 'purple',
        benefits: [
          'Desconto de 20% permanente',
          'Agendamento prioritário',
          'Atendimento VIP',
          'Serviços exclusivos',
          'Brinde especial no aniversário'
        ]
      }
    }
    
    if (totalPoints >= 500) {
      return {
        level: 'Ouro',
        color: 'yellow',
        nextLevel: 'Diamante',
        pointsToNext: 1000 - totalPoints,
        benefits: [
          'Desconto de 15% permanente',
          'Agendamento prioritário',
          'Brinde no aniversário',
          'Acesso a promoções exclusivas'
        ]
      }
    }
    
    if (totalPoints >= 200) {
      return {
        level: 'Prata',
        color: 'gray',
        nextLevel: 'Ouro',
        pointsToNext: 500 - totalPoints,
        benefits: [
          'Desconto de 10% permanente',
          'Pontos em dobro no aniversário',
          'Acesso a ofertas especiais'
        ]
      }
    }
    
    return {
      level: 'Bronze',
      color: 'orange',
      nextLevel: 'Prata',
      pointsToNext: 200 - totalPoints,
      benefits: [
        'Acumule pontos a cada atendimento',
        'Troque pontos por descontos',
        'Ofertas personalizadas'
      ]
    }
  }

  /**
   * Verifica se cliente pode resgatar uma recompensa
   */
  canRedeemReward(clientPoints: number, rewardId: string): boolean {
    const reward = this.rewards.find(r => r.id === rewardId)
    if (!reward || !reward.isActive) return false
    
    return clientPoints >= reward.pointsCost
  }

  /**
   * Processa o resgate de uma recompensa
   */
  redeemReward(
    clientId: string, 
    clientPoints: number, 
    rewardId: string
  ): { success: boolean; newPoints: number; coupon?: string; error?: string } {
    const reward = this.rewards.find(r => r.id === rewardId)
    
    if (!reward || !reward.isActive) {
      return { success: false, newPoints: clientPoints, error: 'Recompensa não encontrada' }
    }
    
    if (clientPoints < reward.pointsCost) {
      return { success: false, newPoints: clientPoints, error: 'Pontos insuficientes' }
    }
    
    const newPoints = clientPoints - reward.pointsCost
    const coupon = this.generateCouponCode(reward.id)
    
    return {
      success: true,
      newPoints,
      coupon
    }
  }

  /**
   * Gera código de cupom único
   */
  private generateCouponCode(rewardId: string): string {
    const prefix = rewardId.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    
    return `${prefix}${timestamp}${random}`
  }

  /**
   * Obtém recompensas disponíveis
   */
  getAvailableRewards(): LoyaltyReward[] {
    return this.rewards.filter(r => r.isActive)
  }

  /**
   * Obtém recompensas que o cliente pode resgatar
   */
  getRedeemableRewards(clientPoints: number): LoyaltyReward[] {
    return this.rewards.filter(r => r.isActive && clientPoints >= r.pointsCost)
  }

  /**
   * Verifica se é aniversário do cliente
   */
  isClientBirthday(birthDate: Date): boolean {
    const today = new Date()
    const birth = new Date(birthDate)
    
    return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate()
  }

  /**
   * Verifica se cliente já ganhou pontos de aniversário este ano
   */
  hasBirthdayPointsThisYear(transactions: LoyaltyTransaction[], year: number = new Date().getFullYear()): boolean {
    return transactions.some(t => 
      t.reason === 'birthday_bonus' && 
      t.createdAt.getFullYear() === year
    )
  }
}