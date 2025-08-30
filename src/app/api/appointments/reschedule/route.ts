import { NextRequest, NextResponse } from 'next/server'
import { 
  processRescheduleRequest, 
  findRescheduleOptions,
  validateRescheduleRequest,
  defaultReschedulePolicy,
  type RescheduleRequest,
  type RescheduleHistory
} from '@/lib/rescheduling'

// Mock data - em produção viria do banco de dados
const mockAppointments = [
  {
    id: 'apt_1',
    professionalId: 'prof_1',
    clientId: 'client_1',
    serviceName: 'Corte + Escova',
    servicePrice: 120,
    serviceDuration: 90,
    scheduledFor: new Date('2024-02-01T14:00:00'),
    status: 'SCHEDULED' as const,
    paymentStatus: 'PENDING' as const,
    notes: 'Cliente prefere corte moderno'
  }
]

const mockWorkingHours = [
  { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { dayOfWeek: 0, isOpen: false, openTime: '00:00', closeTime: '00:00' }
]

const mockHolidays = [
  { id: 'holiday_1', date: '2024-02-13', name: 'Carnaval', type: 'holiday' as const },
  { id: 'holiday_2', date: '2024-04-21', name: 'Tiradentes', type: 'holiday' as const }
]

let rescheduleHistory: RescheduleHistory[] = []

/**
 * POST /api/appointments/reschedule - Solicita reagendamento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appointmentId, newDateTime, reason, initiatedBy, clientContact, notifyClient } = body

    if (!appointmentId || !newDateTime || !initiatedBy) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Campos obrigatórios: appointmentId, newDateTime, initiatedBy' 
        },
        { status: 400 }
      )
    }

    // Buscar agendamento existente
    const appointment = mockAppointments.find(apt => apt.id === appointmentId)
    if (!appointment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agendamento não encontrado' 
        },
        { status: 404 }
      )
    }

    const rescheduleRequest: RescheduleRequest = {
      appointmentId,
      currentDateTime: appointment.scheduledFor,
      newDateTime: new Date(newDateTime),
      reason,
      initiatedBy,
      clientContact,
      notifyClient: notifyClient ?? true
    }

    // Processar reagendamento
    const result = await processRescheduleRequest(
      rescheduleRequest,
      appointment,
      mockAppointments,
      mockWorkingHours,
      mockHolidays,
      defaultReschedulePolicy,
      rescheduleHistory
    )

    if (result.success && result.newAppointment) {
      // Atualizar agendamento (em produção seria no banco)
      const index = mockAppointments.findIndex(apt => apt.id === appointmentId)
      if (index !== -1) {
        mockAppointments[index] = result.newAppointment
      }

      // Adicionar ao histórico
      rescheduleHistory.push({
        id: `reschedule_${Date.now()}`,
        appointmentId,
        originalDateTime: appointment.scheduledFor,
        newDateTime: new Date(newDateTime),
        reason: reason || 'Não informado',
        initiatedBy,
        timestamp: new Date(),
        status: 'confirmed'
      })
    }

    return NextResponse.json({
      success: result.success,
      data: result.newAppointment,
      conflicts: result.conflicts,
      suggestedTimes: result.suggestedTimes,
      notificationSent: result.notificationSent,
      error: result.error
    })
  } catch (error) {
    console.error('Erro ao processar reagendamento:', error)
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
 * GET /api/appointments/reschedule?appointmentId=xxx - Busca opções de reagendamento
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointmentId')

    if (!appointmentId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'appointmentId é obrigatório' 
        },
        { status: 400 }
      )
    }

    // Buscar agendamento
    const appointment = mockAppointments.find(apt => apt.id === appointmentId)
    if (!appointment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agendamento não encontrado' 
        },
        { status: 404 }
      )
    }

    // Validar se reagendamento é possível
    const validation = validateRescheduleRequest(
      appointment,
      new Date(), // Data placeholder
      defaultReschedulePolicy,
      rescheduleHistory
    )

    // Buscar opções de reagendamento
    const options = findRescheduleOptions(
      appointment.scheduledFor,
      appointment.serviceDuration,
      appointment.professionalId,
      mockAppointments,
      mockWorkingHours,
      mockHolidays,
      {
        preferSameWeek: true,
        avoidWeekends: false
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        appointment,
        canReschedule: validation.isValid,
        validationErrors: validation.errors,
        validationWarnings: validation.warnings,
        availableOptions: options.filter(opt => opt.available).slice(0, 10),
        unavailableOptions: options.filter(opt => !opt.available).slice(0, 5),
        policy: defaultReschedulePolicy,
        rescheduleCount: rescheduleHistory.filter(r => r.appointmentId === appointmentId).length
      }
    })
  } catch (error) {
    console.error('Erro ao buscar opções de reagendamento:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}