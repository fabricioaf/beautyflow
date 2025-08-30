import { PrismaClient } from '@prisma/client'
import { WhatsAppService } from './whatsapp-service'
import { WhatsAppTemplateService } from './whatsapp-templates'
import { reminderScheduler } from './reminder-scheduler'

const prisma = new PrismaClient()
const whatsappService = new WhatsAppService()
const templateService = new WhatsAppTemplateService()

export interface ConfirmationAction {
  type: 'CONFIRM' | 'CANCEL' | 'RESCHEDULE' | 'INFO' | 'UNKNOWN'
  appointmentId?: string
  newDate?: Date
  newTime?: string
  message: string
  confidence: number // 0-1, confiança na interpretação
}

export interface AppointmentConfirmation {
  id: string
  appointmentId: string
  clientPhone: string
  action: string
  originalMessage: string
  interpretedAction: ConfirmationAction
  processedAt: Date
  status: 'PROCESSED' | 'FAILED' | 'PENDING'
  responseMessage?: string
  metadata?: any
}

export class WhatsAppConfirmationService {
  private confirmationKeywords = {
    confirm: [
      'sim', 'confirmo', 'confirmado', 'ok', 'tudo bem', 'certo', 'perfeito',
      'vai dar certo', 'estarei lá', 'confirma', 'vou', 'compareço',
      'positivo', 'beleza', '👍', '✅', 'confirm'
    ],
    cancel: [
      'cancelar', 'cancela', 'não vou', 'não posso', 'não consigo',
      'desmarcar', 'desmarca', 'não vai dar', 'impossível', 'inviável',
      'problema', 'imprevisto', 'cancel', '❌', '🚫'
    ],
    reschedule: [
      'reagendar', 'remarcar', 'mudar', 'alterar', 'trocar',
      'outro dia', 'outro horário', 'diferente', 'reschedule',
      'change', 'mover', 'transferir'
    ],
    info: [
      'onde', 'endereço', 'local', 'localização', 'como chegar',
      'valor', 'preço', 'quanto custa', 'horário', 'que horas',
      'info', 'informação', '?', 'dúvida', 'ajuda'
    ]
  }

  private timePatterns = [
    /(\d{1,2}):(\d{2})/g, // 14:30
    /(\d{1,2})h(\d{2})?/g, // 14h30 ou 14h
    /(\d{1,2})\s*(da manhã|manhã|am)/gi, // 9 da manhã
    /(\d{1,2})\s*(da tarde|tarde|pm)/gi, // 2 da tarde
    /(\d{1,2})\s*(da noite|noite)/gi // 8 da noite
  ]

  private datePatterns = [
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?/g, // 15/12 ou 15/12/2024
    /(segunda|terça|quarta|quinta|sexta|sábado|domingo)/gi,
    /(hoje|amanhã|depois de amanhã)/gi,
    /(próxima|próximo)\s+(segunda|terça|quarta|quinta|sexta|sábado|domingo)/gi
  ]

  /**
   * Processar mensagem recebida do WhatsApp para identificar ação do cliente
   */
  async processIncomingMessage(
    phoneNumber: string, 
    message: string, 
    messageId?: string
  ): Promise<ConfirmationAction> {
    try {
      console.log(`Processando mensagem de ${phoneNumber}: "${message}"`)

      // Normalizar mensagem para análise
      const normalizedMessage = this.normalizeMessage(message)

      // Buscar agendamentos próximos do cliente
      const client = await this.findClientByPhone(phoneNumber)
      if (!client) {
        return {
          type: 'UNKNOWN',
          message: 'Cliente não encontrado',
          confidence: 0
        }
      }

      const upcomingAppointments = await this.getUpcomingAppointments(client.id)
      if (upcomingAppointments.length === 0) {
        return {
          type: 'UNKNOWN',
          message: 'Nenhum agendamento próximo encontrado',
          confidence: 0
        }
      }

      // Se há apenas um agendamento próximo, assumir que se refere a ele
      const targetAppointment = upcomingAppointments[0]

      // Identificar tipo de ação
      const actionType = this.identifyActionType(normalizedMessage)
      let confidence = this.calculateConfidence(normalizedMessage, actionType)

      // Processar baseado no tipo identificado
      const result: ConfirmationAction = {
        type: actionType,
        appointmentId: targetAppointment.id,
        message: normalizedMessage,
        confidence
      }

      // Se for reagendamento, tentar extrair nova data/hora
      if (actionType === 'RESCHEDULE') {
        const timeInfo = this.extractTimeInfo(normalizedMessage)
        if (timeInfo.newDate) {
          result.newDate = timeInfo.newDate
          confidence += 0.2 // Aumentar confiança se extraiu data
        }
        if (timeInfo.newTime) {
          result.newTime = timeInfo.newTime
          confidence += 0.2 // Aumentar confiança se extraiu horário
        }
        result.confidence = Math.min(confidence, 1)
      }

      return result

    } catch (error) {
      console.error('Erro ao processar mensagem:', error)
      return {
        type: 'UNKNOWN',
        message: 'Erro no processamento',
        confidence: 0
      }
    }
  }

  /**
   * Executar ação identificada
   */
  async executeAction(action: ConfirmationAction, phoneNumber: string): Promise<{
    success: boolean
    message: string
    responseMessage?: string
  }> {
    try {
      if (!action.appointmentId) {
        return {
          success: false,
          message: 'ID do agendamento não encontrado'
        }
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: action.appointmentId },
        include: {
          client: true,
          professional: {
            include: {
              user: true
            }
          },
          service: true
        }
      })

      if (!appointment) {
        return {
          success: false,
          message: 'Agendamento não encontrado'
        }
      }

      let responseMessage = ''
      let success = false

      switch (action.type) {
        case 'CONFIRM':
          success = await this.confirmAppointment(appointment)
          responseMessage = this.generateConfirmationResponse(appointment, 'confirmed')
          break

        case 'CANCEL':
          success = await this.cancelAppointment(appointment)
          responseMessage = this.generateConfirmationResponse(appointment, 'canceled')
          break

        case 'RESCHEDULE':
          const rescheduleResult = await this.requestReschedule(appointment, action)
          success = rescheduleResult.success
          responseMessage = rescheduleResult.message
          break

        case 'INFO':
          success = true
          responseMessage = this.generateInfoResponse(appointment)
          break

        default:
          success = false
          responseMessage = this.generateUnknownResponse(appointment)
      }

      // Enviar resposta via WhatsApp
      if (responseMessage) {
        await whatsappService.sendTextMessage(phoneNumber, responseMessage)
      }

      // Registrar confirmação no banco
      await this.saveConfirmation({
        appointmentId: action.appointmentId,
        clientPhone: phoneNumber,
        action: action.type,
        originalMessage: action.message,
        interpretedAction: action,
        processedAt: new Date(),
        status: success ? 'PROCESSED' : 'FAILED',
        responseMessage
      })

      return {
        success,
        message: success ? 'Ação executada com sucesso' : 'Falha na execução',
        responseMessage
      }

    } catch (error) {
      console.error('Erro ao executar ação:', error)
      return {
        success: false,
        message: 'Erro interno'
      }
    }
  }

  /**
   * Confirmar agendamento
   */
  private async confirmAppointment(appointment: any): Promise<boolean> {
    try {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CONFIRMED',
          updatedAt: new Date()
        }
      })

      // Cancelar lembretes de confirmação pendentes (manter lembretes próximos ao horário)
      await prisma.appointmentReminder.updateMany({
        where: {
          appointmentId: appointment.id,
          status: 'PENDING',
          metadata: {
            path: ['hoursBeforeAppointment'],
            gte: 12 // Cancelar apenas lembretes de 12h+ antes
          }
        },
        data: {
          status: 'CANCELED'
        }
      })

      // Criar notificação para o profissional
      await prisma.notification.create({
        data: {
          userId: appointment.professional.userId,
          title: 'Agendamento Confirmado',
          message: `${appointment.client.name} confirmou o agendamento para ${appointment.scheduledFor.toLocaleDateString('pt-BR')}`,
          type: 'APPOINTMENT_CONFIRMATION',
          metadata: {
            appointmentId: appointment.id,
            confirmedVia: 'WhatsApp'
          }
        }
      })

      return true
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error)
      return false
    }
  }

  /**
   * Cancelar agendamento
   */
  private async cancelAppointment(appointment: any): Promise<boolean> {
    try {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      })

      // Cancelar todos os lembretes pendentes
      await reminderScheduler.cancelExistingReminders(appointment.id)

      // Criar notificação para o profissional
      await prisma.notification.create({
        data: {
          userId: appointment.professional.userId,
          title: 'Agendamento Cancelado',
          message: `${appointment.client.name} cancelou o agendamento de ${appointment.scheduledFor.toLocaleDateString('pt-BR')}`,
          type: 'APPOINTMENT_CANCELLATION',
          metadata: {
            appointmentId: appointment.id,
            canceledVia: 'WhatsApp',
            canceledAt: new Date()
          }
        }
      })

      return true
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
      return false
    }
  }

  /**
   * Solicitar reagendamento
   */
  private async requestReschedule(appointment: any, action: ConfirmationAction): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // Se foi extraída data/hora específica, tentar reagendar automaticamente
      if (action.newDate && action.newTime) {
        const newDateTime = this.combineDateTime(action.newDate, action.newTime)
        
        // Verificar disponibilidade
        const isAvailable = await this.checkAvailability(
          appointment.professionalId, 
          newDateTime, 
          appointment.serviceDuration
        )

        if (isAvailable) {
          // Reagendar automaticamente
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              scheduledFor: newDateTime,
              updatedAt: new Date()
            }
          })

          // Reagendar lembretes
          await reminderScheduler.rescheduleReminders(appointment.id)

          return {
            success: true,
            message: `Perfeito! Seu agendamento foi reagendado para ${newDateTime.toLocaleDateString('pt-BR')} às ${newDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. ✅`
          }
        } else {
          return {
            success: false,
            message: `Infelizmente o horário ${action.newTime} do dia ${action.newDate?.toLocaleDateString('pt-BR')} não está disponível. Entre em contato para verificar outros horários disponíveis.`
          }
        }
      } else {
        // Solicitar mais informações para reagendar
        return {
          success: true,
          message: 'Entendi que você gostaria de reagendar. Por favor, me informe o novo dia e horário de sua preferência, ou entre em contato conosco para verificar a disponibilidade.'
        }
      }
    } catch (error) {
      console.error('Erro ao processar reagendamento:', error)
      return {
        success: false,
        message: 'Houve um erro ao processar o reagendamento. Entre em contato conosco.'
      }
    }
  }

  /**
   * Normalizar mensagem para análise
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\d\/:-]/g, ' ') // Manter apenas letras, números, espaços e alguns símbolos
      .replace(/\s+/g, ' ') // Remover espaços múltiplos
  }

  /**
   * Identificar tipo de ação baseado na mensagem
   */
  private identifyActionType(message: string): ConfirmationAction['type'] {
    const scores = {
      CONFIRM: 0,
      CANCEL: 0,
      RESCHEDULE: 0,
      INFO: 0
    }

    // Calcular scores para cada tipo
    Object.entries(this.confirmationKeywords).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        if (message.includes(keyword)) {
          scores[type.toUpperCase() as keyof typeof scores] += 1
        }
      })
    })

    // Encontrar o tipo com maior score
    const maxScore = Math.max(...Object.values(scores))
    if (maxScore === 0) {
      return 'UNKNOWN'
    }

    const topType = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0]
    return (topType as ConfirmationAction['type']) || 'UNKNOWN'
  }

  /**
   * Calcular confiança na interpretação
   */
  private calculateConfidence(message: string, actionType: string): number {
    if (actionType === 'UNKNOWN') return 0

    const keywords = this.confirmationKeywords[actionType.toLowerCase()]
    if (!keywords) return 0

    const matchCount = keywords.filter(keyword => message.includes(keyword)).length
    const maxPossibleMatches = keywords.length
    const wordCount = message.split(' ').length

    // Confiança baseada em:
    // - Número de palavras-chave encontradas
    // - Tamanho da mensagem (mensagens muito longas podem ser ambíguas)
    let confidence = matchCount / Math.max(maxPossibleMatches, 1)
    
    // Penalizar mensagens muito longas (possível ambiguidade)
    if (wordCount > 20) {
      confidence *= 0.8
    }

    // Bonificar mensagens muito diretas
    if (wordCount <= 3 && matchCount > 0) {
      confidence *= 1.2
    }

    return Math.min(confidence, 1)
  }

  /**
   * Extrair informações de data/hora da mensagem
   */
  private extractTimeInfo(message: string): {
    newDate?: Date
    newTime?: string
  } {
    const result: { newDate?: Date; newTime?: string } = {}

    // Tentar extrair horário
    for (const pattern of this.timePatterns) {
      const matches = Array.from(message.matchAll(pattern))
      if (matches.length > 0) {
        const match = matches[0]
        result.newTime = match[0]
        break
      }
    }

    // Tentar extrair data
    for (const pattern of this.datePatterns) {
      const matches = Array.from(message.matchAll(pattern))
      if (matches.length > 0) {
        const match = matches[0]
        result.newDate = this.parseDate(match[0])
        break
      }
    }

    return result
  }

  /**
   * Buscar cliente pelo telefone
   */
  private async findClientByPhone(phoneNumber: string): Promise<any> {
    // Normalizar número de telefone
    const normalizedPhone = whatsappService.formatPhoneNumber(phoneNumber)
    
    return await prisma.client.findFirst({
      where: {
        OR: [
          { phone: phoneNumber },
          { phone: normalizedPhone },
          { phone: phoneNumber.replace(/\D/g, '') } // Apenas números
        ]
      }
    })
  }

  /**
   * Buscar agendamentos próximos do cliente
   */
  private async getUpcomingAppointments(clientId: string) {
    const now = new Date()
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return await prisma.appointment.findMany({
      where: {
        clientId,
        scheduledFor: {
          gte: now,
          lte: oneWeekFromNow
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      },
      include: {
        client: true,
        professional: {
          include: {
            user: true
          }
        },
        service: true
      },
      orderBy: {
        scheduledFor: 'asc'
      }
    })
  }

  /**
   * Verificar disponibilidade de horário
   */
  private async checkAvailability(
    professionalId: string, 
    dateTime: Date, 
    duration: number
  ): Promise<boolean> {
    const endTime = new Date(dateTime.getTime() + duration * 60000)

    const conflicting = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        },
        OR: [
          {
            AND: [
              { scheduledFor: { lte: dateTime } },
              { scheduledFor: { gte: endTime } }
            ]
          },
          {
            AND: [
              { scheduledFor: { gte: dateTime } },
              { scheduledFor: { lt: endTime } }
            ]
          }
        ]
      }
    })

    return !conflicting
  }

  /**
   * Combinar data e hora em um objeto Date
   */
  private combineDateTime(date: Date, time: string): Date {
    const timeMatch = time.match(/(\d{1,2}):?(\d{2})?/)
    if (!timeMatch) return date

    const hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2] || '0')

    const combined = new Date(date)
    combined.setHours(hours, minutes, 0, 0)
    
    return combined
  }

  /**
   * Fazer parsing de data a partir de string
   */
  private parseDate(dateString: string): Date | undefined {
    // Implementação básica - pode ser expandida
    const today = new Date()
    
    if (dateString.includes('hoje')) {
      return today
    }
    
    if (dateString.includes('amanhã')) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    }

    // Tentar parsing de data no formato DD/MM
    const dateMatch = dateString.match(/(\d{1,2})\/(\d{1,2})/)
    if (dateMatch) {
      const day = parseInt(dateMatch[1])
      const month = parseInt(dateMatch[2]) - 1 // JavaScript months are 0-indexed
      const year = today.getFullYear()
      
      const parsedDate = new Date(year, month, day)
      
      // Se a data já passou este ano, assumir próximo ano
      if (parsedDate < today) {
        parsedDate.setFullYear(year + 1)
      }
      
      return parsedDate
    }

    return undefined
  }

  /**
   * Gerar resposta de confirmação
   */
  private generateConfirmationResponse(appointment: any, action: 'confirmed' | 'canceled'): string {
    const clientName = appointment.client.name
    const serviceName = appointment.service?.name || appointment.serviceName
    const date = appointment.scheduledFor.toLocaleDateString('pt-BR')
    const time = appointment.scheduledFor.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    const businessName = appointment.professional.businessName || appointment.professional.user.name

    if (action === 'confirmed') {
      return templateService.generateMessage('confirmation', {
        clientName,
        serviceName,
        appointmentDate: date,
        appointmentTime: time,
        professionalName: appointment.professional.user.name,
        businessName
      })
    } else {
      return templateService.generateMessage('cancellation', {
        clientName,
        serviceName,
        appointmentDate: date,
        appointmentTime: time,
        professionalName: appointment.professional.user.name,
        businessName
      })
    }
  }

  /**
   * Gerar resposta informativa
   */
  private generateInfoResponse(appointment: any): string {
    const serviceName = appointment.service?.name || appointment.serviceName
    const date = appointment.scheduledFor.toLocaleDateString('pt-BR')
    const time = appointment.scheduledFor.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    const price = appointment.service?.price 
      ? `R$ ${(appointment.service.price / 100).toFixed(2)}`
      : 'Consulte o valor'
    const businessName = appointment.professional.businessName || appointment.professional.user.name

    return `📋 *Detalhes do seu agendamento:*

🗓️ **Data:** ${date}
⏰ **Horário:** ${time}
💅 **Serviço:** ${serviceName}
💰 **Valor:** ${price}
📍 **Local:** ${businessName}

Para confirmar, cancelar ou reagendar, responda esta mensagem.

✨ ${businessName}`
  }

  /**
   * Gerar resposta para mensagem não compreendida
   */
  private generateUnknownResponse(appointment: any): string {
    const businessName = appointment.professional.businessName || appointment.professional.user.name

    return `Desculpe, não consegui entender sua mensagem. 

Para gerenciar seu agendamento, você pode responder com:
• "Sim" ou "Confirmo" para confirmar
• "Cancelar" para cancelar  
• "Reagendar" para remarcar
• "Info" para ver detalhes

Ou entre em contato conosco diretamente.

✨ ${businessName}`
  }

  /**
   * Salvar confirmação no banco de dados
   */
  private async saveConfirmation(confirmation: Omit<AppointmentConfirmation, 'id'>): Promise<void> {
    await prisma.appointmentConfirmation.create({
      data: {
        appointmentId: confirmation.appointmentId,
        clientPhone: confirmation.clientPhone,
        action: confirmation.action,
        originalMessage: confirmation.originalMessage,
        interpretedAction: confirmation.interpretedAction,
        processedAt: confirmation.processedAt,
        status: confirmation.status,
        responseMessage: confirmation.responseMessage,
        metadata: confirmation.metadata
      }
    })
  }
}

// Instância singleton
export const whatsappConfirmationService = new WhatsAppConfirmationService()