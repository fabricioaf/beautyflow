import { NextRequest, NextResponse } from 'next/server'
import { 
  rescheduleAppointment, 
  suggestRescheduleOptions,
  calculateRescheduleImpact,
  shouldAutoApproveReschedule
} from '@/lib/reschedule'

// Mock data - em produção viria do banco de dados
const mockAppointments = [
  {
    id: 'apt_1',
    professionalId: 'prof_1',
    clientId: 'client_1',
    serviceName: 'Corte + Escova',
    servicePrice: 120.00,
    serviceDuration: 90,
    scheduledFor: new Date('2024-02-01T14:00:00'),
    status: 'SCHEDULED'
  }
]

const mockWorkingHours = [
  { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '15:00' },
  { dayOfWeek: 0, isOpen: false, openTime: '', closeTime: '' }
]

/**
 * POST /api/reschedule - Reagenda um agendamento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appointmentId, newDate, newDuration, reason, notifyClient = true } = body

    if (!appointmentId || !newDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'appointmentId e newDate são obrigatórios' 
        },
        { status: 400 }
      )
    }

    // Buscar agendamento original
    const originalAppointment = mockAppointments.find(apt => apt.id === appointmentId)
    
    if (!originalAppointment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agendamento não encontrado' 
        },
        { status: 404 }
      )
    }

    // Calcular impacto do reagendamento
    const impact = calculateRescheduleImpact(
      originalAppointment.scheduledFor,
      new Date(newDate),
      originalAppointment.serviceDuration
    )

    // Verificar se pode ser auto-aprovado (assumindo cliente Ouro)
    const hoursInAdvance = (new Date(newDate).getTime() - new Date().getTime()) / (1000 * 60 * 60)
    const autoApproved = shouldAutoApproveReschedule(impact, 'Ouro', hoursInAdvance)

    // Executar reagendamento
    const result = await rescheduleAppointment(
      {
        appointmentId,
        newDate: new Date(newDate),
        newDuration,
        reason,
        notifyClient
      },
      mockAppointments,
      mockWorkingHours,
      [],
      {
        allowConflicts: autoApproved,
        notificationSettings: {
          sendConfirmation: notifyClient,
          sendCancellation: notifyClient
        }
      }
    )

    return NextResponse.json({
      success: result.success,
      data: result.success ? {
        appointment: result.newAppointment,
        impact,
        autoApproved
      } : undefined,
      error: result.error,
      conflicts: result.conflicts,
      suggestedTimes: result.suggestedTimes
    })
  } catch (error) {
    console.error('Erro ao reagendar:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}