import { NoShowPrediction } from './no-show-prediction'
import { ClientRiskProfile } from './risk-scoring-system'
import { addHours, addDays, differenceInHours, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface InterventionRule {
  id: string
  name: string
  description: string
  triggerConditions: {
    riskLevel: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[]
    riskScore?: { min?: number; max?: number }
    hoursBeforeAppointment?: { min?: number; max?: number }
    appointmentValue?: { min?: number }
    isFirstTime?: boolean
    hasNoShowHistory?: boolean
  }
  actions: InterventionAction[]
  priority: number
  isActive: boolean
  cooldownHours: number // Tempo mínimo entre execuções da mesma intervenção
}

interface InterventionAction {
  type: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PHONE_CALL' | 'PAYMENT_REQUEST' | 'INCENTIVE_OFFER' | 'RESCHEDULE_SUGGEST' | 'CONFIRMATION_REQUIRED'
  template: string
  parameters: Record<string, any>
  delay?: number // Delay em minutos antes de executar
  executeAt?: 'IMMEDIATE' | 'HOURS_BEFORE' | 'SPECIFIC_TIME'
  timing?: number // Para HOURS_BEFORE ou SPECIFIC_TIME
}

interface ExecutedIntervention {
  id: string
  ruleId: string
  appointmentId: string
  clientId: string
  executedAt: Date
  actions: {
    type: string
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RESPONDED'
    sentAt?: Date
    responseAt?: Date
    response?: string
  }[]
  result: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  effectiveness?: number // 0-1, medido após o agendamento
}

interface InterventionTemplate {
  type: string
  templates: Record<string, string>
}

export class AutomatedInterventionSystem {
  private readonly INTERVENTION_RULES: InterventionRule[] = [
    // Regra Crítica - Confirmação Obrigatória
    {
      id: 'critical_confirmation',
      name: 'Confirmação Crítica',
      description: 'Exige confirmação para clientes de risco crítico',
      triggerConditions: {
        riskLevel: ['CRITICAL'],
        hoursBeforeAppointment: { min: 24, max: 48 }
      },
      actions: [
        {
          type: 'WHATSAPP',
          template: 'critical_confirmation_whatsapp',
          parameters: { requiresResponse: true },
          executeAt: 'HOURS_BEFORE',
          timing: 24
        },
        {
          type: 'PHONE_CALL',
          template: 'critical_confirmation_call',
          parameters: { maxAttempts: 3 },
          executeAt: 'HOURS_BEFORE',
          timing: 4,
          delay: 60 // Se não responder WhatsApp em 1h
        },
        {
          type: 'PAYMENT_REQUEST',
          template: 'advance_payment_required',
          parameters: { percentage: 50 },
          executeAt: 'IMMEDIATE'
        }
      ],
      priority: 1,
      isActive: true,
      cooldownHours: 12
    },

    // Regra Alto Risco - Lembretes Intensivos
    {
      id: 'high_risk_intensive',
      name: 'Lembretes Intensivos',
      description: 'Lembretes múltiplos para clientes de alto risco',
      triggerConditions: {
        riskLevel: ['HIGH'],
        hoursBeforeAppointment: { min: 12, max: 72 }
      },
      actions: [
        {
          type: 'SMS',
          template: 'high_risk_reminder_sms',
          parameters: {},
          executeAt: 'HOURS_BEFORE',
          timing: 48
        },
        {
          type: 'WHATSAPP',
          template: 'high_risk_reminder_whatsapp',
          parameters: { includeIncentive: true },
          executeAt: 'HOURS_BEFORE',
          timing: 24
        },
        {
          type: 'EMAIL',
          template: 'high_risk_reminder_email',
          parameters: { includePolicies: true },
          executeAt: 'HOURS_BEFORE',
          timing: 12
        },
        {
          type: 'INCENTIVE_OFFER',
          template: 'loyalty_point_bonus',
          parameters: { bonusPoints: 20 },
          executeAt: 'HOURS_BEFORE',
          timing: 6
        }
      ],
      priority: 2,
      isActive: true,
      cooldownHours: 24
    },

    // Regra Primeiro Atendimento
    {
      id: 'first_time_client',
      name: 'Cliente Primeira Vez',
      description: 'Cuidados especiais para novos clientes',
      triggerConditions: {
        riskLevel: ['MEDIUM', 'HIGH'],
        isFirstTime: true
      },
      actions: [
        {
          type: 'WHATSAPP',
          template: 'welcome_first_client',
          parameters: { includeDirections: true },
          executeAt: 'HOURS_BEFORE',
          timing: 24
        },
        {
          type: 'SMS',
          template: 'first_client_reminder',
          parameters: { includeContact: true },
          executeAt: 'HOURS_BEFORE',
          timing: 2
        }
      ],
      priority: 3,
      isActive: true,
      cooldownHours: 0
    },

    // Regra Valor Alto
    {
      id: 'high_value_appointment',
      name: 'Agendamento Alto Valor',
      description: 'Cuidados especiais para serviços caros',
      triggerConditions: {
        riskLevel: ['MEDIUM', 'HIGH'],
        appointmentValue: { min: 200 }
      },
      actions: [
        {
          type: 'PHONE_CALL',
          template: 'high_value_confirmation',
          parameters: { emphasizeValue: true },
          executeAt: 'HOURS_BEFORE',
          timing: 24
        },
        {
          type: 'PAYMENT_REQUEST',
          template: 'partial_advance_payment',
          parameters: { percentage: 30 },
          executeAt: 'IMMEDIATE'
        }
      ],
      priority: 2,
      isActive: true,
      cooldownHours: 48
    },

    // Regra Histórico de No-Shows
    {
      id: 'noshow_history',
      name: 'Histórico de Faltas',
      description: 'Intervenção para clientes com histórico de no-shows',
      triggerConditions: {
        riskLevel: ['HIGH', 'CRITICAL'],
        hasNoShowHistory: true
      },
      actions: [
        {
          type: 'CONFIRMATION_REQUIRED',
          template: 'mandatory_confirmation',
          parameters: { deadline: 4 },
          executeAt: 'HOURS_BEFORE',
          timing: 24
        },
        {
          type: 'INCENTIVE_OFFER',
          template: 'attendance_reward',
          parameters: { rewardType: 'discount', value: 10 },
          executeAt: 'HOURS_BEFORE',
          timing: 12
        }
      ],
      priority: 1,
      isActive: true,
      cooldownHours: 24
    }
  ]

  private readonly MESSAGE_TEMPLATES: InterventionTemplate[] = [
    {
      type: 'WHATSAPP',
      templates: {
        critical_confirmation_whatsapp: `🚨 *Confirmação Obrigatória* - {{clientName}}

Seu agendamento para {{serviceName}} está marcado para {{appointmentDate}} às {{appointmentTime}}.

⚠️ *É OBRIGATÓRIO confirmar sua presença*
📱 Responda "CONFIRMO" para garantir seu horário

Sem confirmação, o agendamento será cancelado automaticamente.

{{businessName}} - {{businessPhone}}`,

        high_risk_reminder_whatsapp: `💄 Lembrete do seu agendamento - {{clientName}}

📅 {{serviceName}}
🕒 {{appointmentDate}} às {{appointmentTime}}
💰 Valor: R$ {{serviceValue}}

🎁 *Bonus especial*: Ganhe {{bonusPoints}} pontos extras por comparecer!

Para confirmar: responda este WhatsApp ou ligue {{businessPhone}}

{{businessName}}`,

        welcome_first_client: `🌟 Bem-vinda ao {{businessName}}, {{clientName}}!

Estamos ansiosas para conhecê-la! 

📅 Seu primeiro agendamento:
🕒 {{appointmentDate}} às {{appointmentTime}}
💄 {{serviceName}}

📍 Endereço: {{businessAddress}}
📱 Dúvidas: {{businessPhone}}

Chegue 10 min antes. Até amanhã! 💖`
      }
    },
    {
      type: 'SMS',
      templates: {
        high_risk_reminder_sms: `{{businessName}}: Lembrete agendamento {{serviceName}} em {{appointmentDate}} às {{appointmentTime}}. Confirme presença: {{businessPhone}}`,

        first_client_reminder: `{{businessName}}: Seu primeiro atendimento é hoje às {{appointmentTime}}! Estamos te esperando. Dúvidas: {{businessPhone}}`
      }
    },
    {
      type: 'EMAIL',
      templates: {
        high_risk_reminder_email: `Confirmação de Agendamento - {{serviceName}}

Olá {{clientName}},

Este é um lembrete importante sobre seu agendamento:

Data: {{appointmentDate}}
Horário: {{appointmentTime}}
Serviço: {{serviceName}}
Valor: R$ {{serviceValue}}

POLÍTICAS IMPORTANTES:
- Cancelamentos devem ser feitos com no mínimo 4h de antecedência
- No-shows são cobrados integralmente
- Confirmação é obrigatória até 2h antes

Para confirmar: responda este email ou ligue {{businessPhone}}

Obrigada,
{{businessName}}`
      }
    }
  ]

  /**
   * Avalia se uma intervenção deve ser executada
   */
  async evaluateInterventions(
    appointment: any,
    prediction: NoShowPrediction,
    clientProfile: ClientRiskProfile
  ): Promise<InterventionRule[]> {
    
    const applicableRules: InterventionRule[] = []
    const now = new Date()
    const appointmentTime = new Date(appointment.scheduledFor)
    const hoursUntilAppointment = differenceInHours(appointmentTime, now)

    for (const rule of this.INTERVENTION_RULES) {
      if (!rule.isActive) continue

      // Verificar se já foi executada recentemente
      const lastExecution = await this.getLastExecution(rule.id, appointment.id)
      if (lastExecution && differenceInHours(now, lastExecution.executedAt) < rule.cooldownHours) {
        continue
      }

      // Verificar condições de trigger
      if (this.checkTriggerConditions(rule.triggerConditions, {
        riskLevel: prediction.riskLevel,
        riskScore: prediction.riskScore,
        hoursUntilAppointment,
        appointmentValue: appointment.servicePrice,
        isFirstTime: appointment.isFirstTime,
        hasNoShowHistory: clientProfile.factors.reliability < 70
      })) {
        applicableRules.push(rule)
      }
    }

    // Ordenar por prioridade
    return applicableRules.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Executa uma intervenção específica
   */
  async executeIntervention(
    rule: InterventionRule,
    appointment: any,
    client: any,
    professional: any
  ): Promise<ExecutedIntervention> {
    
    const intervention: ExecutedIntervention = {
      id: `intervention_${Date.now()}`,
      ruleId: rule.id,
      appointmentId: appointment.id,
      clientId: client.id,
      executedAt: new Date(),
      actions: [],
      result: 'SUCCESS'
    }

    for (const action of rule.actions) {
      try {
        const actionResult = await this.executeAction(action, appointment, client, professional)
        intervention.actions.push(actionResult)
      } catch (error) {
        console.error(`Falha ao executar ação ${action.type}:`, error)
        intervention.actions.push({
          type: action.type,
          status: 'FAILED',
          sentAt: new Date()
        })
        intervention.result = 'PARTIAL'
      }
    }

    // Salvar no histórico
    await this.saveInterventionHistory(intervention)

    return intervention
  }

  /**
   * Executa uma ação específica
   */
  private async executeAction(
    action: InterventionAction,
    appointment: any,
    client: any,
    professional: any
  ) {
    const message = this.buildMessage(action.template, {
      clientName: client.name,
      serviceName: appointment.serviceName,
      appointmentDate: format(new Date(appointment.scheduledFor), 'dd/MM/yyyy', { locale: ptBR }),
      appointmentTime: format(new Date(appointment.scheduledFor), 'HH:mm'),
      serviceValue: appointment.servicePrice.toFixed(2),
      businessName: professional.businessName || professional.user.name,
      businessPhone: professional.phone || '(11) 99999-9999',
      businessAddress: professional.address || 'Endereço do salão',
      ...action.parameters
    })

    switch (action.type) {
      case 'WHATSAPP':
        return await this.sendWhatsApp(client.phone, message)
      
      case 'SMS':
        return await this.sendSMS(client.phone, message)
      
      case 'EMAIL':
        return await this.sendEmail(client.email, `Agendamento ${appointment.serviceName}`, message)
      
      case 'PHONE_CALL':
        return await this.schedulePhoneCall(client.phone, message, action.parameters)
      
      case 'PAYMENT_REQUEST':
        return await this.requestPayment(appointment, action.parameters)
      
      case 'INCENTIVE_OFFER':
        return await this.offerIncentive(client.id, action.parameters)
      
      case 'CONFIRMATION_REQUIRED':
        return await this.requireConfirmation(appointment.id, action.parameters)
      
      default:
        throw new Error(`Tipo de ação não suportado: ${action.type}`)
    }
  }

  /**
   * Verifica se as condições de trigger são atendidas
   */
  private checkTriggerConditions(
    conditions: InterventionRule['triggerConditions'],
    context: {
      riskLevel: string
      riskScore: number
      hoursUntilAppointment: number
      appointmentValue: number
      isFirstTime: boolean
      hasNoShowHistory: boolean
    }
  ): boolean {
    
    // Verificar nível de risco
    if (!conditions.riskLevel.includes(context.riskLevel as any)) {
      return false
    }

    // Verificar score de risco
    if (conditions.riskScore) {
      if (conditions.riskScore.min && context.riskScore < conditions.riskScore.min) return false
      if (conditions.riskScore.max && context.riskScore > conditions.riskScore.max) return false
    }

    // Verificar tempo até agendamento
    if (conditions.hoursBeforeAppointment) {
      if (conditions.hoursBeforeAppointment.min && context.hoursUntilAppointment < conditions.hoursBeforeAppointment.min) return false
      if (conditions.hoursBeforeAppointment.max && context.hoursUntilAppointment > conditions.hoursBeforeAppointment.max) return false
    }

    // Verificar valor do agendamento
    if (conditions.appointmentValue?.min && context.appointmentValue < conditions.appointmentValue.min) {
      return false
    }

    // Verificar se é primeira vez
    if (conditions.isFirstTime !== undefined && conditions.isFirstTime !== context.isFirstTime) {
      return false
    }

    // Verificar histórico de no-shows
    if (conditions.hasNoShowHistory !== undefined && conditions.hasNoShowHistory !== context.hasNoShowHistory) {
      return false
    }

    return true
  }

  /**
   * Constrói mensagem baseada no template
   */
  private buildMessage(templateName: string, variables: Record<string, any>): string {
    // Encontrar template
    let template = ''
    
    for (const templateGroup of this.MESSAGE_TEMPLATES) {
      if (templateGroup.templates[templateName]) {
        template = templateGroup.templates[templateName]
        break
      }
    }

    if (!template) {
      console.warn(`Template ${templateName} não encontrado`)
      return `Mensagem sobre agendamento para ${variables.clientName}`
    }

    // Substituir variáveis
    let message = template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      message = message.replace(regex, String(value))
    }

    return message
  }

  /**
   * Simula envio de WhatsApp
   */
  private async sendWhatsApp(phone: string, message: string) {
    // Em produção, integraria com WhatsApp Business API
    console.log(`📱 WhatsApp para ${phone}: ${message}`)
    
    return {
      type: 'WHATSAPP',
      status: 'SENT' as const,
      sentAt: new Date()
    }
  }

  /**
   * Simula envio de SMS
   */
  private async sendSMS(phone: string, message: string) {
    // Em produção, integraria com provedor SMS
    console.log(`📨 SMS para ${phone}: ${message}`)
    
    return {
      type: 'SMS',
      status: 'SENT' as const,
      sentAt: new Date()
    }
  }

  /**
   * Simula envio de email
   */
  private async sendEmail(email: string, subject: string, message: string) {
    // Em produção, integraria com provedor email
    console.log(`📧 Email para ${email}: ${subject}`)
    
    return {
      type: 'EMAIL',
      status: 'SENT' as const,
      sentAt: new Date()
    }
  }

  /**
   * Agenda ligação telefônica
   */
  private async schedulePhoneCall(phone: string, script: string, parameters: any) {
    console.log(`📞 Ligação agendada para ${phone}`)
    
    return {
      type: 'PHONE_CALL',
      status: 'PENDING' as const,
      sentAt: new Date()
    }
  }

  /**
   * Solicita pagamento antecipado
   */
  private async requestPayment(appointment: any, parameters: any) {
    const amount = appointment.servicePrice * (parameters.percentage / 100)
    console.log(`💰 Solicitando pagamento antecipado de R$ ${amount.toFixed(2)}`)
    
    return {
      type: 'PAYMENT_REQUEST',
      status: 'SENT' as const,
      sentAt: new Date()
    }
  }

  /**
   * Oferece incentivo
   */
  private async offerIncentive(clientId: string, parameters: any) {
    console.log(`🎁 Oferecendo incentivo para cliente ${clientId}:`, parameters)
    
    return {
      type: 'INCENTIVE_OFFER',
      status: 'SENT' as const,
      sentAt: new Date()
    }
  }

  /**
   * Exige confirmação
   */
  private async requireConfirmation(appointmentId: string, parameters: any) {
    console.log(`✅ Exigindo confirmação para agendamento ${appointmentId}`)
    
    return {
      type: 'CONFIRMATION_REQUIRED',
      status: 'SENT' as const,
      sentAt: new Date()
    }
  }

  /**
   * Obtém última execução de uma regra
   */
  private async getLastExecution(ruleId: string, appointmentId: string): Promise<ExecutedIntervention | null> {
    // Em produção, consultaria o banco de dados
    return null
  }

  /**
   * Salva histórico de intervenção
   */
  private async saveInterventionHistory(intervention: ExecutedIntervention): Promise<void> {
    // Em produção, salvaria no banco de dados
    console.log(`💾 Salvando histórico de intervenção:`, intervention.id)
  }

  /**
   * Obtém estatísticas de eficácia
   */
  async getEffectivenessStats(professionalId: string): Promise<{
    totalInterventions: number
    successRate: number
    averageEffectiveness: number
    byRiskLevel: Record<string, { count: number; successRate: number }>
    byActionType: Record<string, { count: number; successRate: number }>
  }> {
    // Em produção, calcularia estatísticas reais do banco de dados
    return {
      totalInterventions: 150,
      successRate: 0.78,
      averageEffectiveness: 0.73,
      byRiskLevel: {
        CRITICAL: { count: 25, successRate: 0.88 },
        HIGH: { count: 60, successRate: 0.75 },
        MEDIUM: { count: 45, successRate: 0.72 },
        LOW: { count: 20, successRate: 0.65 }
      },
      byActionType: {
        WHATSAPP: { count: 80, successRate: 0.82 },
        SMS: { count: 40, successRate: 0.70 },
        EMAIL: { count: 30, successRate: 0.65 },
        PHONE_CALL: { count: 20, successRate: 0.90 }
      }
    }
  }

  /**
   * Obtém regras de intervenção ativas
   */
  getActiveRules(): InterventionRule[] {
    return this.INTERVENTION_RULES.filter(rule => rule.isActive)
  }

  /**
   * Atualiza configurações de uma regra
   */
  async updateRule(ruleId: string, updates: Partial<InterventionRule>): Promise<boolean> {
    const ruleIndex = this.INTERVENTION_RULES.findIndex(rule => rule.id === ruleId)
    if (ruleIndex === -1) return false

    this.INTERVENTION_RULES[ruleIndex] = {
      ...this.INTERVENTION_RULES[ruleIndex],
      ...updates
    }

    return true
  }
}