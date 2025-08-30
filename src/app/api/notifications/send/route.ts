import { NextRequest, NextResponse } from 'next/server'
import { processNotificationQueue } from '@/lib/notifications'

// Mock data - em produção viria do banco de dados
const notifications = [
  {
    id: 'notif_1',
    professionalId: 'prof_1',
    appointmentId: 'apt_1',
    type: 'APPOINTMENT_CONFIRMATION' as const,
    title: 'Agendamento Confirmado',
    message: 'Seu agendamento foi confirmado para amanhã às 14:00',
    channel: 'whatsapp' as const,
    recipient: '+5511999999999',
    status: 'pending' as const,
    createdAt: new Date()
  },
  {
    id: 'notif_2',
    professionalId: 'prof_1',
    appointmentId: 'apt_2',
    type: 'APPOINTMENT_REMINDER' as const,
    title: 'Lembrete de Agendamento',
    message: 'Lembrete: seu agendamento é hoje às 16:00',
    channel: 'whatsapp' as const,
    recipient: '+5511888888888',
    status: 'pending' as const,
    createdAt: new Date()
  }
]

/**
 * POST /api/notifications/send - Processa fila de notificações pendentes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { professionalId, notificationIds } = body

    // Filtrar notificações a serem processadas
    let notificationsToProcess = notifications.filter(n => n.status === 'pending')

    if (professionalId) {
      notificationsToProcess = notificationsToProcess.filter(n => n.professionalId === professionalId)
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      notificationsToProcess = notificationsToProcess.filter(n => notificationIds.includes(n.id))
    }

    // Processar fila de notificações
    const result = await processNotificationQueue(notificationsToProcess)

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        processedNotifications: notificationsToProcess.length
      }
    })
  } catch (error) {
    console.error('Erro ao processar fila de notificações:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/send - Retorna estatísticas da fila de notificações
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')

    let filteredNotifications = notifications

    if (professionalId) {
      filteredNotifications = filteredNotifications.filter(n => n.professionalId === professionalId)
    }

    const stats = {
      total: filteredNotifications.length,
      pending: filteredNotifications.filter(n => n.status === 'pending').length,
      sent: filteredNotifications.filter(n => n.status === 'sent').length,
      delivered: filteredNotifications.filter(n => n.status === 'delivered').length,
      failed: filteredNotifications.filter(n => n.status === 'failed').length,
      byChannel: {
        whatsapp: filteredNotifications.filter(n => n.channel === 'whatsapp').length,
        sms: filteredNotifications.filter(n => n.channel === 'sms').length,
        email: filteredNotifications.filter(n => n.channel === 'email').length
      },
      byType: Object.fromEntries(
        ['APPOINTMENT_CONFIRMATION', 'APPOINTMENT_REMINDER', 'PAYMENT_CONFIRMATION', 'APPOINTMENT_CANCELLATION', 'NO_SHOW_WARNING', 'MARKETING']
          .map(type => [
            type, 
            filteredNotifications.filter(n => n.type === type).length
          ])
      )
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de notificações:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}