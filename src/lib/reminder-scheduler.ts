import { PrismaClient } from '@prisma/client'
import { WhatsAppService } from './whatsapp-service'
import { WhatsAppTemplateService } from './whatsapp-templates'

const prisma = new PrismaClient()
const whatsappService = new WhatsAppService()
const templateService = new WhatsAppTemplateService()

export interface ReminderConfig {
  enabled: boolean
  hoursBeforeAppointment: number[]
  useWhatsApp: boolean
  useEmail: boolean
  useSMS: boolean
  customTemplate?: string
}

export interface AppointmentReminder {
  id: string
  appointmentId: string
  scheduledFor: Date
  type: 'WHATSAPP' | 'EMAIL' | 'SMS'
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELED'
  sentAt?: Date
  errorMessage?: string
  metadata?: any
}

export class ReminderScheduler {
  /**
   * Agendar lembretes para um agendamento específico
   */
  async scheduleReminders(appointmentId: string): Promise<void> {
    try {
      // Buscar agendamento com dados do profissional e cliente
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: true,
          professional: {
            include: {
              user: true,
              reminderSettings: true
            }
          },
          service: true
        }
      })

      if (!appointment) {
        throw new Error('Agendamento não encontrado')
      }

      if (appointment.status === 'CANCELED' || appointment.status === 'COMPLETED') {
        console.log(`Agendamento ${appointmentId} cancelado ou concluído, não agendando lembretes`)
        return
      }

      // Obter configurações de lembrete do profissional
      const reminderConfig = appointment.professional.reminderSettings || {
        enabled: true,
        hoursBeforeAppointment: [24, 2], // 24h e 2h antes
        useWhatsApp: true,
        useEmail: false,
        useSMS: false
      }

      if (!reminderConfig.enabled) {
        console.log(`Lembretes desabilitados para o profissional ${appointment.professional.id}`)
        return
      }

      // Cancelar lembretes existentes
      await this.cancelExistingReminders(appointmentId)

      // Agendar novos lembretes
      for (const hours of reminderConfig.hoursBeforeAppointment) {
        const reminderTime = new Date(appointment.scheduledFor)
        reminderTime.setHours(reminderTime.getHours() - hours)

        // Não agendar lembretes para o passado
        if (reminderTime <= new Date()) {
          continue
        }

        // Criar lembretes baseados nas preferências
        if (reminderConfig.useWhatsApp && appointment.client.phone) {
          await this.createReminder({
            appointmentId,
            scheduledFor: reminderTime,
            type: 'WHATSAPP',
            metadata: {
              hoursBeforeAppointment: hours,
              customTemplate: reminderConfig.customTemplate
            }
          })
        }

        if (reminderConfig.useEmail && appointment.client.email) {
          await this.createReminder({
            appointmentId,
            scheduledFor: reminderTime,
            type: 'EMAIL',
            metadata: {
              hoursBeforeAppointment: hours,
              customTemplate: reminderConfig.customTemplate
            }
          })
        }

        if (reminderConfig.useSMS && appointment.client.phone) {
          await this.createReminder({
            appointmentId,
            scheduledFor: reminderTime,
            type: 'SMS',
            metadata: {
              hoursBeforeAppointment: hours,
              customTemplate: reminderConfig.customTemplate
            }
          })
        }
      }

      console.log(`Lembretes agendados para o agendamento ${appointmentId}`)

    } catch (error) {
      console.error('Erro ao agendar lembretes:', error)
      throw error
    }
  }

  /**
   * Cancelar lembretes existentes para um agendamento
   */
  async cancelExistingReminders(appointmentId: string): Promise<void> {
    await prisma.appointmentReminder.updateMany({
      where: {
        appointmentId,
        status: 'PENDING'
      },
      data: {
        status: 'CANCELED'
      }
    })
  }

  /**
   * Criar um lembrete individual
   */
  private async createReminder(data: {
    appointmentId: string
    scheduledFor: Date
    type: 'WHATSAPP' | 'EMAIL' | 'SMS'
    metadata?: any
  }): Promise<void> {
    await prisma.appointmentReminder.create({
      data: {
        appointmentId: data.appointmentId,
        scheduledFor: data.scheduledFor,
        type: data.type,
        status: 'PENDING',
        metadata: data.metadata
      }
    })
  }

  /**
   * Processar lembretes pendentes (deve ser executado periodicamente)
   */
  async processPendingReminders(): Promise<void> {
    try {
      const now = new Date()
      
      // Buscar lembretes que devem ser enviados agora
      const pendingReminders = await prisma.appointmentReminder.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: {
            lte: now
          }
        },
        include: {
          appointment: {
            include: {
              client: true,
              professional: {
                include: {
                  user: true
                }
              },
              service: true
            }
          }
        },
        take: 50 // Processar em lotes
      })

      console.log(`Processando ${pendingReminders.length} lembretes pendentes`)

      for (const reminder of pendingReminders) {
        try {
          // Verificar se o agendamento ainda está válido
          if (reminder.appointment.status === 'CANCELED' || 
              reminder.appointment.status === 'COMPLETED') {
            await this.markReminderAsCanceled(reminder.id)
            continue
          }

          // Enviar lembrete baseado no tipo
          switch (reminder.type) {
            case 'WHATSAPP':
              await this.sendWhatsAppReminder(reminder)
              break
            case 'EMAIL':
              await this.sendEmailReminder(reminder)
              break
            case 'SMS':
              await this.sendSMSReminder(reminder)
              break
          }

          // Marcar como enviado
          await this.markReminderAsSent(reminder.id)

        } catch (error) {
          console.error(`Erro ao enviar lembrete ${reminder.id}:`, error)
          await this.markReminderAsFailed(reminder.id, error.message)
        }
      }

    } catch (error) {
      console.error('Erro ao processar lembretes pendentes:', error)
    }
  }

  /**
   * Enviar lembrete via WhatsApp
   */
  private async sendWhatsAppReminder(reminder: AppointmentReminder & {
    appointment: any
  }): Promise<void> {
    const { appointment } = reminder
    const clientPhone = appointment.client.phone

    if (!clientPhone) {
      throw new Error('Cliente não possui telefone cadastrado')
    }

    // Preparar dados para o template
    const templateData = {
      clientName: appointment.client.name,
      serviceName: appointment.service?.name || appointment.serviceName,
      appointmentDate: appointment.scheduledFor.toLocaleDateString('pt-BR'),
      appointmentTime: appointment.scheduledFor.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      professionalName: appointment.professional.user.name,
      businessName: appointment.professional.businessName || appointment.professional.user.name,
      hoursBeforeAppointment: reminder.metadata?.hoursBeforeAppointment || 24,
      price: appointment.service?.price ? `R$ ${(appointment.service.price / 100).toFixed(2)}` : null
    }

    // Usar template customizado ou padrão
    let message: string
    if (reminder.metadata?.customTemplate) {
      message = templateService.renderTemplate(reminder.metadata.customTemplate, templateData)
    } else {
      // Determinar template baseado no tempo
      const hours = reminder.metadata?.hoursBeforeAppointment || 24
      const templateName = hours <= 2 ? 'reminder_2hours' : 'reminder_24hours'
      message = templateService.generateMessage(templateName, templateData)
    }

    // Enviar mensagem
    await whatsappService.sendTextMessage(clientPhone, message)
  }

  /**
   * Enviar lembrete via Email (implementação futura)
   */
  private async sendEmailReminder(reminder: AppointmentReminder & {
    appointment: any
  }): Promise<void> {
    // TODO: Implementar envio de email
    console.log('Envio de email ainda não implementado')
    throw new Error('Envio de email ainda não implementado')
  }

  /**
   * Enviar lembrete via SMS (implementação futura)
   */
  private async sendSMSReminder(reminder: AppointmentReminder & {
    appointment: any
  }): Promise<void> {
    // TODO: Implementar envio de SMS
    console.log('Envio de SMS ainda não implementado')
    throw new Error('Envio de SMS ainda não implementado')
  }

  /**
   * Marcar lembrete como enviado
   */
  private async markReminderAsSent(reminderId: string): Promise<void> {
    await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    })
  }

  /**
   * Marcar lembrete como falhado
   */
  private async markReminderAsFailed(reminderId: string, errorMessage: string): Promise<void> {
    await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        status: 'FAILED',
        errorMessage: errorMessage.substring(0, 500) // Limitar tamanho
      }
    })
  }

  /**
   * Marcar lembrete como cancelado
   */
  private async markReminderAsCanceled(reminderId: string): Promise<void> {
    await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        status: 'CANCELED'
      }
    })
  }

  /**
   * Reagendar lembretes quando um agendamento é alterado
   */
  async rescheduleReminders(appointmentId: string): Promise<void> {
    await this.cancelExistingReminders(appointmentId)
    await this.scheduleReminders(appointmentId)
  }

  /**
   * Obter estatísticas de lembretes
   */
  async getReminderStats(professionalId?: string): Promise<{
    total: number
    sent: number
    pending: number
    failed: number
    canceled: number
    successRate: number
  }> {
    const whereClause: any = {}
    
    if (professionalId) {
      whereClause.appointment = {
        professionalId
      }
    }

    const stats = await prisma.appointmentReminder.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true
      }
    })

    const total = stats.reduce((acc, curr) => acc + curr._count.id, 0)
    const sent = stats.find(s => s.status === 'SENT')?._count.id || 0
    const pending = stats.find(s => s.status === 'PENDING')?._count.id || 0
    const failed = stats.find(s => s.status === 'FAILED')?._count.id || 0
    const canceled = stats.find(s => s.status === 'CANCELED')?._count.id || 0
    const successRate = total > 0 ? (sent / (total - pending)) * 100 : 0

    return {
      total,
      sent,
      pending,
      failed,
      canceled,
      successRate: Math.round(successRate * 100) / 100
    }
  }

  /**
   * Listar lembretes com filtros
   */
  async listReminders(filters: {
    professionalId?: string
    status?: string
    type?: string
    dateFrom?: Date
    dateTo?: Date
    page?: number
    limit?: number
  } = {}): Promise<{
    reminders: any[]
    total: number
    page: number
    totalPages: number
  }> {
    const { page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const whereClause: any = {}

    if (filters.professionalId) {
      whereClause.appointment = {
        professionalId: filters.professionalId
      }
    }

    if (filters.status) {
      whereClause.status = filters.status
    }

    if (filters.type) {
      whereClause.type = filters.type
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.scheduledFor = {}
      if (filters.dateFrom) {
        whereClause.scheduledFor.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        whereClause.scheduledFor.lte = filters.dateTo
      }
    }

    const [reminders, total] = await Promise.all([
      prisma.appointmentReminder.findMany({
        where: whereClause,
        include: {
          appointment: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true
                }
              },
              professional: {
                select: {
                  id: true,
                  businessName: true,
                  user: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              service: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          scheduledFor: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.appointmentReminder.count({
        where: whereClause
      })
    ])

    return {
      reminders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }
}

// Instância singleton
export const reminderScheduler = new ReminderScheduler()