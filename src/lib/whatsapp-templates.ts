/**
 * WhatsApp Message Templates System
 * Manages customizable message templates for different scenarios
 */

export interface MessageTemplate {
  id: string
  name: string
  category: 'APPOINTMENT' | 'PAYMENT' | 'MARKETING' | 'CUSTOMER_SERVICE'
  type: 'REMINDER' | 'CONFIRMATION' | 'WELCOME' | 'NOTIFICATION' | 'PROMOTIONAL'
  subject: string
  content: string
  variables: string[] // Available variables like {clientName}, {serviceName}, etc.
  isActive: boolean
  language: string
  businessId?: string // For business-specific templates
  createdAt: Date
  updatedAt: Date
}

export interface TemplateVariable {
  key: string
  description: string
  example: string
  required: boolean
}

export class WhatsAppTemplateService {
  private static defaultVariables: TemplateVariable[] = [
    { key: 'clientName', description: 'Nome do cliente', example: 'Maria Silva', required: true },
    { key: 'businessName', description: 'Nome do salão', example: 'Studio Bella', required: true },
    { key: 'professionalName', description: 'Nome do profissional', example: 'Ana Costa', required: false },
    { key: 'serviceName', description: 'Nome do serviço', example: 'Corte + Escova', required: false },
    { key: 'appointmentDate', description: 'Data do agendamento', example: '15/12/2024', required: false },
    { key: 'appointmentTime', description: 'Horário do agendamento', example: '14:30', required: false },
    { key: 'amount', description: 'Valor formatado', example: 'R$ 85,00', required: false },
    { key: 'paymentMethod', description: 'Método de pagamento', example: 'PIX', required: false },
    { key: 'riskScore', description: 'Score de risco', example: '85%', required: false },
    { key: 'loyaltyPoints', description: 'Pontos de fidelidade', example: '150 pontos', required: false }
  ]

  private static defaultTemplates: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Lembrete de Agendamento - 24h',
      category: 'APPOINTMENT',
      type: 'REMINDER',
      subject: 'Lembrete: Seu agendamento é amanhã!',
      content: `🌸 *Lembrete de Agendamento - {businessName}*

Olá *{clientName}*!

Lembramos que você tem um agendamento marcado:

📅 *Serviço:* {serviceName}
🕐 *Data:* {appointmentDate}
⏰ *Horário:* {appointmentTime}
👩‍💄 *Profissional:* {professionalName}

Por favor, confirme sua presença respondendo SIM ou cancele se não puder comparecer.

Obrigado! 💅✨`,
      variables: ['clientName', 'businessName', 'serviceName', 'appointmentDate', 'appointmentTime', 'professionalName'],
      isActive: true,
      language: 'pt_BR'
    },
    {
      name: 'Lembrete de Agendamento - 2h',
      category: 'APPOINTMENT',
      type: 'REMINDER',
      subject: 'Seu agendamento é em 2 horas!',
      content: `⏰ *Lembrete Urgente - {businessName}*

Olá *{clientName}*!

Seu agendamento é em 2 horas:

🕐 *Horário:* {appointmentTime}
👩‍💄 *Profissional:* {professionalName}
🛍️ *Serviço:* {serviceName}

Nos vemos em breve! 😊💅`,
      variables: ['clientName', 'businessName', 'appointmentTime', 'professionalName', 'serviceName'],
      isActive: true,
      language: 'pt_BR'
    },
    {
      name: 'Confirmação de Agendamento',
      category: 'APPOINTMENT',
      type: 'CONFIRMATION',
      subject: 'Agendamento confirmado!',
      content: `✅ *Agendamento Confirmado - {businessName}*

Olá *{clientName}*!

Seu agendamento foi confirmado com sucesso:

📅 *Data:* {appointmentDate}
⏰ *Horário:* {appointmentTime}
🛍️ *Serviço:* {serviceName}
👩‍💄 *Profissional:* {professionalName}
💰 *Valor:* {amount}

Estamos ansiosos para recebê-la! 💅✨`,
      variables: ['clientName', 'businessName', 'appointmentDate', 'appointmentTime', 'serviceName', 'professionalName', 'amount'],
      isActive: true,
      language: 'pt_BR'
    },
    {
      name: 'Pagamento Confirmado',
      category: 'PAYMENT',
      type: 'NOTIFICATION',
      subject: 'Pagamento confirmado!',
      content: `💳 *Pagamento Confirmado - {businessName}*

Olá *{clientName}*!

Seu pagamento foi processado com sucesso:

💰 *Valor:* {amount}
🛍️ *Serviço:* {serviceName}
💳 *Método:* {paymentMethod}

Obrigado pela preferência! 😊

Nos vemos em breve! 💅✨`,
      variables: ['clientName', 'businessName', 'amount', 'serviceName', 'paymentMethod'],
      isActive: true,
      language: 'pt_BR'
    },
    {
      name: 'Bem-vinda Nova Cliente',
      category: 'CUSTOMER_SERVICE',
      type: 'WELCOME',
      subject: 'Bem-vinda ao nosso salão!',
      content: `🌸 *Bem-vinda ao {businessName}!*

Olá *{clientName}*!

É um prazer tê-la como nossa cliente! 😊

Aqui você encontrará:
✨ Profissionais especializados
💅 Serviços de qualidade
📱 Agendamento online fácil
🎁 Programa de fidelidade

Estamos ansiosos para cuidar da sua beleza!

Precisa de alguma coisa? É só chamar! 💕`,
      variables: ['clientName', 'businessName'],
      isActive: true,
      language: 'pt_BR'
    },
    {
      name: 'Alerta de Risco de Falta - Alto',
      category: 'APPOINTMENT',
      type: 'REMINDER',
      subject: 'Confirmação importante do seu agendamento',
      content: `🚨 *Confirmação Importante - {businessName}*

Olá *{clientName}*!

Notamos que você tem um agendamento próximo e queremos confirmar sua presença:

📅 *Data:* {appointmentDate}
⏰ *Horário:* {appointmentTime}

🚨 *Prioridade:* ALTA

Por favor, confirme sua presença para que possamos nos preparar adequadamente para recebê-la.

Se não puder comparecer, avise-nos para que possamos disponibilizar o horário para outra cliente.

Obrigado! 💅✨`,
      variables: ['clientName', 'businessName', 'appointmentDate', 'appointmentTime'],
      isActive: true,
      language: 'pt_BR'
    },
    {
      name: 'Programa de Fidelidade - Pontos Acumulados',
      category: 'MARKETING',
      type: 'PROMOTIONAL',
      subject: 'Você ganhou pontos!',
      content: `🎁 *Programa de Fidelidade - {businessName}*

Parabéns *{clientName}*!

Você acumulou {loyaltyPoints} em nosso programa de fidelidade! 🎉

Continue conosco e ganhe ainda mais benefícios:
⭐ Descontos exclusivos
🎁 Serviços gratuitos
💅 Atendimento VIP

Obrigado pela sua fidelidade! 💕`,
      variables: ['clientName', 'businessName', 'loyaltyPoints'],
      isActive: true,
      language: 'pt_BR'
    },
    {
      name: 'Cancelamento de Agendamento',
      category: 'APPOINTMENT',
      type: 'NOTIFICATION',
      subject: 'Agendamento cancelado',
      content: `😔 *Agendamento Cancelado - {businessName}*

Olá *{clientName}*!

Seu agendamento foi cancelado:

📅 *Data:* {appointmentDate}
⏰ *Horário:* {appointmentTime}
🛍️ *Serviço:* {serviceName}

Esperamos você em uma próxima oportunidade! Para reagendar, entre em contato conosco.

Obrigado! 😊💅`,
      variables: ['clientName', 'businessName', 'appointmentDate', 'appointmentTime', 'serviceName'],
      isActive: true,
      language: 'pt_BR'
    }
  ]

  /**
   * Get all available template variables
   */
  static getAvailableVariables(): TemplateVariable[] {
    return this.defaultVariables
  }

  /**
   * Get default templates
   */
  static getDefaultTemplates(): Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>[] {
    return this.defaultTemplates
  }

  /**
   * Process template content by replacing variables
   */
  static processTemplate(
    content: string, 
    variables: Record<string, string>
  ): string {
    let processedContent = content

    // Replace all variables in the format {variableName}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processedContent = processedContent.replace(regex, value || '')
    })

    return processedContent
  }

  /**
   * Validate template content
   */
  static validateTemplate(content: string, requiredVariables: string[] = []): {
    isValid: boolean
    errors: string[]
    missingVariables: string[]
  } {
    const errors: string[] = []
    const missingVariables: string[] = []

    // Extract variables from content
    const variableMatches = content.match(/\{([^}]+)\}/g) || []
    const usedVariables = variableMatches.map(match => match.slice(1, -1))

    // Check for invalid variables
    const validVariableKeys = this.defaultVariables.map(v => v.key)
    const invalidVariables = usedVariables.filter(v => !validVariableKeys.includes(v))
    
    if (invalidVariables.length > 0) {
      errors.push(`Variáveis inválidas: ${invalidVariables.join(', ')}`)
    }

    // Check for missing required variables
    const missingRequired = requiredVariables.filter(v => !usedVariables.includes(v))
    if (missingRequired.length > 0) {
      missingVariables.push(...missingRequired)
      errors.push(`Variáveis obrigatórias ausentes: ${missingRequired.join(', ')}`)
    }

    // Check content length (WhatsApp has limits)
    if (content.length > 4096) {
      errors.push('Conteúdo muito longo (máximo 4096 caracteres)')
    }

    if (content.length < 10) {
      errors.push('Conteúdo muito curto (mínimo 10 caracteres)')
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingVariables
    }
  }

  /**
   * Get template by category and type
   */
  static getTemplateByType(
    category: MessageTemplate['category'],
    type: MessageTemplate['type']
  ): Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'> | null {
    return this.defaultTemplates.find(t => t.category === category && t.type === type) || null
  }

  /**
   * Format variables for a specific context
   */
  static formatVariables(context: {
    client?: any
    appointment?: any
    professional?: any
    business?: any
    payment?: any
    amount?: number
    riskScore?: number
  }): Record<string, string> {
    const variables: Record<string, string> = {}

    if (context.client) {
      variables.clientName = context.client.name || ''
    }

    if (context.business) {
      variables.businessName = context.business.name || context.business.businessName || ''
    }

    if (context.professional) {
      variables.professionalName = context.professional.name || context.professional.user?.name || ''
    }

    if (context.appointment) {
      variables.serviceName = context.appointment.serviceName || ''
      variables.appointmentDate = context.appointment.scheduledFor 
        ? new Date(context.appointment.scheduledFor).toLocaleDateString('pt-BR')
        : ''
      variables.appointmentTime = context.appointment.scheduledFor 
        ? new Date(context.appointment.scheduledFor).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        : ''
    }

    if (context.payment) {
      variables.paymentMethod = context.payment.method || ''
    }

    if (context.amount) {
      variables.amount = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(context.amount / 100)
    }

    if (context.riskScore !== undefined) {
      variables.riskScore = `${Math.round(context.riskScore)}%`
    }

    if (context.client?.loyaltyPoints) {
      variables.loyaltyPoints = `${context.client.loyaltyPoints} pontos`
    }

    return variables
  }

  /**
   * Generate preview of template with sample data
   */
  static generatePreview(template: string): string {
    const sampleData = {
      clientName: 'Maria Silva',
      businessName: 'Studio Bella',
      professionalName: 'Ana Costa',
      serviceName: 'Corte + Escova',
      appointmentDate: '15/12/2024',
      appointmentTime: '14:30',
      amount: 'R$ 85,00',
      paymentMethod: 'PIX',
      riskScore: '85%',
      loyaltyPoints: '150 pontos'
    }

    return this.processTemplate(template, sampleData)
  }
}

export default WhatsAppTemplateService