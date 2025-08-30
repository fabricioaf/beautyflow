/**
 * WhatsApp Business API Integration Service
 * Handles all WhatsApp communications for BeautyFlow
 */

interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  webhookVerifyToken: string
  businessAccountId?: string
}

interface WhatsAppMessage {
  to: string
  type: 'text' | 'template' | 'interactive'
  text?: {
    body: string
  }
  template?: {
    name: string
    language: {
      code: string
    }
    components?: Array<{
      type: string
      parameters: Array<{
        type: string
        text: string
      }>
    }>
  }
  interactive?: {
    type: 'button' | 'list'
    body: {
      text: string
    }
    action: any
  }
}

interface WhatsAppResponse {
  messaging_product: string
  contacts: Array<{
    input: string
    wa_id: string
  }>
  messages: Array<{
    id: string
  }>
}

export class WhatsAppService {
  private config: WhatsAppConfig
  private baseUrl = 'https://graph.facebook.com/v19.0'

  constructor(config: WhatsAppConfig) {
    this.config = config
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse | null> {
    try {
      const payload: WhatsAppMessage = {
        to,
        type: 'text',
        text: {
          body: message
        }
      }

      return await this.sendMessage(payload)
    } catch (error) {
      console.error('Error sending text message:', error)
      return null
    }
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    languageCode: string = 'pt_BR',
    parameters?: Array<{ type: string; text: string }>
  ): Promise<WhatsAppResponse | null> {
    try {
      const payload: WhatsAppMessage = {
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          }
        }
      }

      if (parameters && parameters.length > 0) {
        payload.template!.components = [{
          type: 'body',
          parameters
        }]
      }

      return await this.sendMessage(payload)
    } catch (error) {
      console.error('Error sending template message:', error)
      return null
    }
  }

  /**
   * Send interactive button message
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<WhatsAppResponse | null> {
    try {
      const payload: WhatsAppMessage = {
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText
          },
          action: {
            buttons: buttons.map(button => ({
              type: 'reply',
              reply: {
                id: button.id,
                title: button.title
              }
            }))
          }
        }
      }

      return await this.sendMessage(payload)
    } catch (error) {
      console.error('Error sending button message:', error)
      return null
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(
    to: string,
    clientName: string,
    serviceName: string,
    appointmentDate: string,
    appointmentTime: string,
    professionalName: string,
    businessName: string
  ): Promise<boolean> {
    try {
      const message = `🌸 *Lembrete de Agendamento - ${businessName}*\n\nOlá *${clientName}*!\n\nLembramos que você tem um agendamento marcado:\n\n📅 *Serviço:* ${serviceName}\n🕐 *Data:* ${appointmentDate}\n⏰ *Horário:* ${appointmentTime}\n👩‍💄 *Profissional:* ${professionalName}\n\nPor favor, confirme sua presença respondendo SIM ou cancele se não puder comparecer.\n\nObrigado! 💅✨`

      const buttons = [
        { id: 'confirm_yes', title: '✅ Confirmar' },
        { id: 'confirm_no', title: '❌ Cancelar' }
      ]

      const response = await this.sendButtonMessage(to, message, buttons)
      return response !== null
    } catch (error) {
      console.error('Error sending appointment reminder:', error)
      return false
    }
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    to: string,
    clientName: string,
    amount: number,
    serviceName: string,
    paymentMethod: string,
    businessName: string
  ): Promise<boolean> {
    try {
      const formattedAmount = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(amount / 100)

      const message = `💳 *Pagamento Confirmado - ${businessName}*\n\nOlá *${clientName}*!\n\nSeu pagamento foi processado com sucesso:\n\n💰 *Valor:* ${formattedAmount}\n🛍️ *Serviço:* ${serviceName}\n💳 *Método:* ${paymentMethod}\n\nObrigado pela preferência! 😊\n\nNos vemos em breve! 💅✨`

      const response = await this.sendTextMessage(to, message)
      return response !== null
    } catch (error) {
      console.error('Error sending payment notification:', error)
      return false
    }
  }

  /**
   * Send welcome message for new clients
   */
  async sendWelcomeMessage(
    to: string,
    clientName: string,
    businessName: string
  ): Promise<boolean> {
    try {
      const message = `🌸 *Bem-vinda ao ${businessName}!*\n\nOlá *${clientName}*!\n\nÉ um prazer tê-la como nossa cliente! 😊\n\nAqui você encontrará:\n✨ Profissionais especializados\n💅 Serviços de qualidade\n📱 Agendamento online fácil\n🎁 Programa de fidelidade\n\nEstamos ansiosos para cuidar da sua beleza!\n\nPrecisa de alguma coisa? É só chamar! 💕`

      const response = await this.sendTextMessage(to, message)
      return response !== null
    } catch (error) {
      console.error('Error sending welcome message:', error)
      return false
    }
  }

  /**
   * Send no-show warning message
   */
  async sendNoShowWarning(
    to: string,
    clientName: string,
    riskScore: number,
    appointmentDate: string,
    appointmentTime: string,
    businessName: string
  ): Promise<boolean> {
    try {
      let urgencyLevel = ''
      let emoji = ''
      
      if (riskScore >= 80) {
        urgencyLevel = 'ALTA'
        emoji = '🚨'
      } else if (riskScore >= 60) {
        urgencyLevel = 'MÉDIA'
        emoji = '⚠️'
      } else {
        urgencyLevel = 'BAIXA'
        emoji = '💛'
      }

      const message = `${emoji} *Confirmação Importante - ${businessName}*\n\nOlá *${clientName}*!\n\nNotamos que você tem um agendamento próximo e queremos confirmar sua presença:\n\n📅 *Data:* ${appointmentDate}\n⏰ *Horário:* ${appointmentTime}\n\n${emoji} *Prioridade:* ${urgencyLevel}\n\nPor favor, confirme sua presença para que possamos nos preparar adequadamente para recebê-la.\n\nSe não puder comparecer, avise-nos para que possamos disponibilizar o horário para outra cliente.\n\nObrigado! 💅✨`

      const buttons = [
        { id: 'confirm_presence', title: '✅ Vou comparecer' },
        { id: 'cancel_appointment', title: '❌ Preciso cancelar' }
      ]

      const response = await this.sendButtonMessage(to, message, buttons)
      return response !== null
    } catch (error) {
      console.error('Error sending no-show warning:', error)
      return false
    }
  }

  /**
   * Core message sending method
   */
  private async sendMessage(payload: WhatsAppMessage): Promise<WhatsAppResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          ...payload
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error in sendMessage:', error)
      throw error
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhook(
    signature: string,
    body: string,
    verifyToken: string
  ): boolean {
    try {
      // In production, implement proper signature verification
      // For now, we'll use a simple token verification
      return signature === verifyToken
    } catch (error) {
      console.error('Error verifying webhook:', error)
      return false
    }
  }

  /**
   * Get WhatsApp service instance
   */
  static getInstance(): WhatsAppService {
    const config: WhatsAppConfig = {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''
    }

    if (!config.phoneNumberId || !config.accessToken) {
      throw new Error('WhatsApp configuration is missing')
    }

    return new WhatsAppService(config)
  }

  /**
   * Check if WhatsApp is properly configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.WHATSAPP_PHONE_NUMBER_ID && 
      process.env.WHATSAPP_ACCESS_TOKEN && 
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    )
  }

  /**
   * Format phone number for WhatsApp (Brazil format)
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Add country code if not present
    if (cleaned.length === 11 && cleaned.startsWith('11')) {
      return `55${cleaned}` // Brazil country code
    } else if (cleaned.length === 10) {
      return `5511${cleaned}` // Add Brazil code and São Paulo area code
    } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return cleaned
    }
    
    return cleaned
  }
}

export default WhatsAppService