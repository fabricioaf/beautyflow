import { formatDate, formatTime } from './utils'

export interface NotificationTemplate {
  type: NotificationType
  title: string
  message: string
  variables: string[]
}

export type NotificationType = 
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_REMINDER'
  | 'PAYMENT_CONFIRMATION'
  | 'APPOINTMENT_CANCELLATION'
  | 'NO_SHOW_WARNING'
  | 'MARKETING'

export interface NotificationData {
  id: string
  professionalId: string
  appointmentId?: string
  type: NotificationType
  title: string
  message: string
  channel: 'whatsapp' | 'sms' | 'email'
  recipient: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  sentAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
}

export interface NotificationVariables {
  clientName: string
  serviceName: string
  appointmentDate: string
  appointmentTime: string
  professionalName: string
  businessName: string
  price: string
  duration: string
  address?: string
  phone?: string
  confirmationLink?: string
  cancelationLink?: string
}

// Templates padrão de notificações
export const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
  APPOINTMENT_CONFIRMATION: {
    type: 'APPOINTMENT_CONFIRMATION',
    title: 'Agendamento Confirmado',
    message: `Olá {{clientName}}! ✅ Seu agendamento foi confirmado:

📅 **{{serviceName}}**
🗓️ Data: {{appointmentDate}}
⏰ Horário: {{appointmentTime}}
💰 Valor: {{price}}
📍 Local: {{businessName}}

Estamos ansiosos para atendê-la! 

Para cancelar ou reagendar: {{cancelationLink}}`,
    variables: ['clientName', 'serviceName', 'appointmentDate', 'appointmentTime', 'price', 'businessName', 'cancelationLink']
  },

  APPOINTMENT_REMINDER: {
    type: 'APPOINTMENT_REMINDER',
    title: 'Lembrete de Agendamento',
    message: `Olá {{clientName}}! ⏰ Lembrete do seu agendamento:

📅 **{{serviceName}}**
🗓️ Amanhã - {{appointmentDate}}
⏰ Horário: {{appointmentTime}}
📍 Local: {{businessName}}

Nos vemos em breve! 💄✨

Precisa reagendar? {{cancelationLink}}`,
    variables: ['clientName', 'serviceName', 'appointmentDate', 'appointmentTime', 'businessName', 'cancelationLink']
  },

  PAYMENT_CONFIRMATION: {
    type: 'PAYMENT_CONFIRMATION',
    title: 'Pagamento Confirmado',
    message: `Olá {{clientName}}! 💳 Pagamento confirmado:

✅ {{serviceName}} - {{price}}
📅 {{appointmentDate}} às {{appointmentTime}}

Obrigada pela preferência! 🙏`,
    variables: ['clientName', 'serviceName', 'price', 'appointmentDate', 'appointmentTime']
  },

  APPOINTMENT_CANCELLATION: {
    type: 'APPOINTMENT_CANCELLATION',
    title: 'Agendamento Cancelado',
    message: `Olá {{clientName}}, 

Seu agendamento foi cancelado:
📅 {{serviceName}} - {{appointmentDate}} às {{appointmentTime}}

Para reagendar: {{confirmationLink}}

Esperamos vê-la em breve! 💄`,
    variables: ['clientName', 'serviceName', 'appointmentDate', 'appointmentTime', 'confirmationLink']
  },

  NO_SHOW_WARNING: {
    type: 'NO_SHOW_WARNING',
    title: 'Você perdeu seu agendamento',
    message: `Olá {{clientName}},

Notamos que você não compareceu ao agendamento:
📅 {{serviceName}} - {{appointmentDate}} às {{appointmentTime}}

Para reagendar: {{confirmationLink}}

Política de faltas: após 3 faltas consecutivas, será necessário pagamento antecipado.`,
    variables: ['clientName', 'serviceName', 'appointmentDate', 'appointmentTime', 'confirmationLink']
  },

  MARKETING: {
    type: 'MARKETING',
    title: 'Oferta Especial',
    message: `Olá {{clientName}}! 🌟

Que tal agendar seu próximo {{serviceName}}?
💄 Oferta especial: 15% de desconto
📅 Válido até o final do mês

Agende já: {{confirmationLink}}`,
    variables: ['clientName', 'serviceName', 'confirmationLink']
  }
}

/**
 * Cria uma notificação processando o template com as variáveis
 */
export function createNotification(
  type: NotificationType,
  variables: NotificationVariables,
  professionalId: string,
  appointmentId?: string,
  channel: 'whatsapp' | 'sms' | 'email' = 'whatsapp'
): Omit<NotificationData, 'id' | 'createdAt'> {
  const template = notificationTemplates[type]
  
  const processedMessage = processTemplate(template.message, variables)
  const processedTitle = processTemplate(template.title, variables)

  return {
    professionalId,
    appointmentId,
    type,
    title: processedTitle,
    message: processedMessage,
    channel,
    recipient: channel === 'email' ? variables.clientName : '', // Será preenchido com o contato real
    status: 'pending',
    metadata: {
      variables,
      template: template.type
    }
  }
}

/**
 * Processa template substituindo variáveis
 */
function processTemplate(template: string, variables: NotificationVariables): string {
  let processed = template

  Object.entries(variables).forEach(([key, value]) => {
    if (value) {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
  })

  return processed
}

/**
 * Agenda notificações automáticas para um agendamento
 */
export function scheduleAppointmentNotifications(
  appointment: {
    id: string
    professionalId: string
    clientName: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    scheduledFor: Date
  },
  businessSettings: {
    name: string
    address?: string
    phone?: string
    autoNotifications: {
      confirmation: boolean
      reminder24h: boolean
      reminder2h: boolean
    }
  }
): Omit<NotificationData, 'id' | 'createdAt'>[] {
  const notifications: Omit<NotificationData, 'id' | 'createdAt'>[] = []
  
  const variables: NotificationVariables = {
    clientName: appointment.clientName,
    serviceName: appointment.serviceName,
    appointmentDate: formatDate(appointment.scheduledFor),
    appointmentTime: formatTime(appointment.scheduledFor),
    professionalName: businessSettings.name,
    businessName: businessSettings.name,
    price: `R$ ${appointment.servicePrice.toFixed(2)}`,
    duration: `${appointment.serviceDuration} min`,
    address: businessSettings.address,
    phone: businessSettings.phone,
    confirmationLink: `${process.env.NEXT_PUBLIC_APP_URL}/book/${appointment.professionalId}`,
    cancelationLink: `${process.env.NEXT_PUBLIC_APP_URL}/cancel/${appointment.id}`
  }

  // Confirmação imediata
  if (businessSettings.autoNotifications.confirmation) {
    notifications.push(createNotification(
      'APPOINTMENT_CONFIRMATION',
      variables,
      appointment.professionalId,
      appointment.id
    ))
  }

  // Lembrete 24h antes
  if (businessSettings.autoNotifications.reminder24h) {
    const reminder24h = createNotification(
      'APPOINTMENT_REMINDER',
      variables,
      appointment.professionalId,
      appointment.id
    )
    reminder24h.metadata = {
      ...reminder24h.metadata,
      scheduleFor: new Date(appointment.scheduledFor.getTime() - 24 * 60 * 60 * 1000)
    }
    notifications.push(reminder24h)
  }

  // Lembrete 2h antes
  if (businessSettings.autoNotifications.reminder2h) {
    const reminder2h = createNotification(
      'APPOINTMENT_REMINDER',
      { ...variables, appointmentDate: 'hoje' },
      appointment.professionalId,
      appointment.id
    )
    reminder2h.metadata = {
      ...reminder2h.metadata,
      scheduleFor: new Date(appointment.scheduledFor.getTime() - 2 * 60 * 60 * 1000)
    }
    notifications.push(reminder2h)
  }

  return notifications
}

/**
 * Envia notificação via WhatsApp (mock)
 */
export async function sendWhatsAppNotification(
  notification: NotificationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Mock implementation - em produção integraria com API do WhatsApp Business
  console.log('Enviando WhatsApp:', {
    to: notification.recipient,
    message: notification.message
  })

  // Simular delay de envio
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Simular sucesso/falha (90% sucesso)
  const success = Math.random() > 0.1

  if (success) {
    return {
      success: true,
      messageId: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  } else {
    return {
      success: false,
      error: 'Falha ao enviar mensagem WhatsApp'
    }
  }
}

/**
 * Envia notificação via SMS (mock)
 */
export async function sendSMSNotification(
  notification: NotificationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Mock implementation
  console.log('Enviando SMS:', {
    to: notification.recipient,
    message: notification.message
  })

  await new Promise(resolve => setTimeout(resolve, 800))

  const success = Math.random() > 0.05

  if (success) {
    return {
      success: true,
      messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  } else {
    return {
      success: false,
      error: 'Falha ao enviar SMS'
    }
  }
}

/**
 * Envia notificação via Email (mock)
 */
export async function sendEmailNotification(
  notification: NotificationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Mock implementation
  console.log('Enviando Email:', {
    to: notification.recipient,
    subject: notification.title,
    body: notification.message
  })

  await new Promise(resolve => setTimeout(resolve, 1200))

  const success = Math.random() > 0.02

  if (success) {
    return {
      success: true,
      messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  } else {
    return {
      success: false,
      error: 'Falha ao enviar email'
    }
  }
}

/**
 * Processa fila de notificações
 */
export async function processNotificationQueue(
  notifications: NotificationData[]
): Promise<{ processed: number; sent: number; failed: number }> {
  let processed = 0
  let sent = 0
  let failed = 0

  for (const notification of notifications) {
    processed++

    try {
      let result
      
      switch (notification.channel) {
        case 'whatsapp':
          result = await sendWhatsAppNotification(notification)
          break
        case 'sms':
          result = await sendSMSNotification(notification)
          break
        case 'email':
          result = await sendEmailNotification(notification)
          break
        default:
          throw new Error(`Canal não suportado: ${notification.channel}`)
      }

      if (result.success) {
        sent++
        // Aqui atualizaria o status no banco
        console.log(`✅ Notificação ${notification.id} enviada com sucesso`)
      } else {
        failed++
        console.error(`❌ Falha ao enviar notificação ${notification.id}:`, result.error)
      }
    } catch (error) {
      failed++
      console.error(`❌ Erro ao processar notificação ${notification.id}:`, error)
    }
  }

  return { processed, sent, failed }
}