import { formatDate, formatTime } from './utils'
import { validateAppointmentConflicts, findAvailableSlots, type Appointment, type WorkingHours, type Holiday } from './appointment-validation'

export interface RescheduleRequest {
  appointmentId: string
  currentDateTime: Date
  newDateTime: Date
  reason?: string
  initiatedBy: 'client' | 'professional'
  clientContact?: string
  notifyClient?: boolean
}

export interface RescheduleResult {
  success: boolean
  newAppointment?: Appointment
  conflicts?: string[]
  suggestedTimes?: string[]
  notificationSent?: boolean
  error?: string
}

export interface ReschedulePolicy {
  allowClientReschedule: boolean
  minHoursBeforeReschedule: number
  maxReschedulesPerAppointment: number
  autoConfirmReschedule: boolean
  sendNotifications: boolean
  allowSameDayReschedule: boolean
  rescheduleDeadlineHours: number
}

export interface RescheduleHistory {
  id: string
  appointmentId: string
  originalDateTime: Date
  newDateTime: Date
  reason: string
  initiatedBy: 'client' | 'professional'
  timestamp: Date
  status: 'pending' | 'confirmed' | 'rejected'
}

// Política padrão de reagendamento
export const defaultReschedulePolicy: ReschedulePolicy = {
  allowClientReschedule: true,
  minHoursBeforeReschedule: 4,
  maxReschedulesPerAppointment: 3,
  autoConfirmReschedule: false,
  sendNotifications: true,
  allowSameDayReschedule: false,
  rescheduleDeadlineHours: 2
}

/**
 * Valida se um reagendamento é permitido
 */
export function validateRescheduleRequest(
  appointment: Appointment,
  newDateTime: Date,
  policy: ReschedulePolicy,
  rescheduleHistory: RescheduleHistory[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const now = new Date()

  // 1. Verificar se o agendamento ainda não aconteceu
  if (appointment.scheduledFor <= now) {
    errors.push('Não é possível reagendar um agendamento que já passou')
    return { isValid: false, errors, warnings }
  }

  // 2. Verificar se está dentro do prazo limite
  const hoursUntilAppointment = (appointment.scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilAppointment < policy.rescheduleDeadlineHours) {
    errors.push(`Reagendamento deve ser feito com pelo menos ${policy.rescheduleDeadlineHours} horas de antecedência`)
  }

  // 3. Verificar número máximo de reagendamentos
  const appointmentReschedules = rescheduleHistory.filter(r => r.appointmentId === appointment.id)
  if (appointmentReschedules.length >= policy.maxReschedulesPerAppointment) {
    errors.push(`Máximo de ${policy.maxReschedulesPerAppointment} reagendamentos atingido`)
  }

  // 4. Verificar se a nova data é futura
  if (newDateTime <= now) {
    errors.push('A nova data deve ser no futuro')
  }

  // 5. Verificar reagendamento no mesmo dia
  const isSameDay = formatDate(newDateTime) === formatDate(now)
  if (isSameDay && !policy.allowSameDayReschedule) {
    errors.push('Reagendamento no mesmo dia não é permitido')
  }

  // 6. Verificar antecedência mínima para nova data
  const hoursUntilNewDate = (newDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilNewDate < policy.minHoursBeforeReschedule) {
    warnings.push(`Recomendado agendar com pelo menos ${policy.minHoursBeforeReschedule} horas de antecedência`)
  }

  // 7. Verificar se não está muito longe no futuro (6 meses)
  const maxFutureDate = new Date()
  maxFutureDate.setMonth(maxFutureDate.getMonth() + 6)
  if (newDateTime > maxFutureDate) {
    warnings.push('Agendamento muito distante no futuro')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Processa um pedido de reagendamento
 */
export async function processRescheduleRequest(
  request: RescheduleRequest,
  appointment: Appointment,
  existingAppointments: Appointment[],
  workingHours: WorkingHours[],
  holidays: Holiday[],
  policy: ReschedulePolicy,
  rescheduleHistory: RescheduleHistory[]
): Promise<RescheduleResult> {
  // 1. Validar o pedido de reagendamento
  const validation = validateRescheduleRequest(appointment, request.newDateTime, policy, rescheduleHistory)
  
  if (!validation.isValid) {
    return {
      success: false,
      conflicts: validation.errors,
      error: 'Reagendamento não permitido'
    }
  }

  // 2. Validar conflitos no novo horário
  const conflictValidation = validateAppointmentConflicts(
    {
      professionalId: appointment.professionalId,
      scheduledFor: request.newDateTime,
      serviceDuration: appointment.serviceDuration,
      excludeId: appointment.id
    },
    existingAppointments,
    workingHours,
    holidays
  )

  if (!conflictValidation.isValid) {
    const suggestedTimes = findAvailableSlots(
      request.newDateTime,
      appointment.serviceDuration,
      appointment.professionalId,
      existingAppointments,
      workingHours,
      holidays,
      5
    )

    return {
      success: false,
      conflicts: conflictValidation.conflicts.map(c => c.message),
      suggestedTimes,
      error: 'Horário não disponível'
    }
  }

  // 3. Criar novo agendamento reagendado
  const rescheduledAppointment: Appointment = {
    ...appointment,
    scheduledFor: request.newDateTime,
    status: policy.autoConfirmReschedule ? 'CONFIRMED' : 'SCHEDULED',
    notes: appointment.notes ? 
      `${appointment.notes}\n\nReagendado em ${formatDate(new Date())} - Motivo: ${request.reason || 'Não informado'}` :
      `Reagendado em ${formatDate(new Date())} - Motivo: ${request.reason || 'Não informado'}`
  }

  // 4. Registrar histórico de reagendamento
  const rescheduleRecord: RescheduleHistory = {
    id: `reschedule_${Date.now()}`,
    appointmentId: appointment.id,
    originalDateTime: appointment.scheduledFor,
    newDateTime: request.newDateTime,
    reason: request.reason || 'Não informado',
    initiatedBy: request.initiatedBy,
    timestamp: new Date(),
    status: policy.autoConfirmReschedule ? 'confirmed' : 'pending'
  }

  // 5. Enviar notificações se habilitado
  let notificationSent = false
  if (policy.sendNotifications && request.notifyClient) {
    try {
      // Aqui integraria com o sistema de notificações
      notificationSent = await sendRescheduleNotification(
        rescheduledAppointment,
        rescheduleRecord,
        request.clientContact
      )
    } catch (error) {
      console.error('Erro ao enviar notificação de reagendamento:', error)
    }
  }

  return {
    success: true,
    newAppointment: rescheduledAppointment,
    notificationSent
  }
}

/**
 * Encontra os melhores horários alternativos para reagendamento
 */
export function findRescheduleOptions(
  originalDate: Date,
  duration: number,
  professionalId: string,
  existingAppointments: Appointment[],
  workingHours: WorkingHours[],
  holidays: Holiday[],
  preferences: {
    preferSameWeek?: boolean
    preferMorning?: boolean
    preferAfternoon?: boolean
    avoidWeekends?: boolean
  } = {}
): { date: Date; available: boolean; reason?: string }[] {
  const options: { date: Date; available: boolean; reason?: string }[] = []
  const startDate = new Date(originalDate)
  startDate.setDate(startDate.getDate() + 1) // Começar no dia seguinte

  let daysChecked = 0
  const maxDaysToCheck = 21 // 3 semanas

  while (options.length < 10 && daysChecked < maxDaysToCheck) {
    const checkDate = new Date(startDate)
    checkDate.setDate(checkDate.getDate() + daysChecked)

    // Aplicar preferências
    const dayOfWeek = checkDate.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    if (preferences.avoidWeekends && isWeekend) {
      daysChecked++
      continue
    }

    if (preferences.preferSameWeek) {
      const originalWeek = getWeekOfYear(originalDate)
      const checkWeek = getWeekOfYear(checkDate)
      
      if (checkWeek !== originalWeek && options.length >= 3) {
        daysChecked++
        continue
      }
    }

    // Verificar horários disponíveis no dia
    const workingHour = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)
    
    if (!workingHour || !workingHour.isOpen) {
      options.push({
        date: checkDate,
        available: false,
        reason: 'Estabelecimento fechado'
      })
      daysChecked++
      continue
    }

    // Verificar feriados
    const isHoliday = holidays.some(h => h.date === formatDate(checkDate))
    if (isHoliday) {
      options.push({
        date: checkDate,
        available: false,
        reason: 'Feriado'
      })
      daysChecked++
      continue
    }

    // Encontrar horários específicos no dia
    const timeSlots = generateTimeSlots(checkDate, workingHour, preferences)
    
    for (const timeSlot of timeSlots) {
      const validation = validateAppointmentConflicts(
        {
          professionalId,
          scheduledFor: timeSlot,
          serviceDuration: duration
        },
        existingAppointments,
        workingHours,
        holidays
      )

      options.push({
        date: timeSlot,
        available: validation.isValid,
        reason: validation.isValid ? undefined : validation.conflicts[0]?.message
      })

      if (options.length >= 10) break
    }

    daysChecked++
  }

  return options.sort((a, b) => {
    // Priorizar horários disponíveis
    if (a.available && !b.available) return -1
    if (!a.available && b.available) return 1
    
    // Depois ordenar por data
    return a.date.getTime() - b.date.getTime()
  })
}

/**
 * Envia notificação de reagendamento
 */
async function sendRescheduleNotification(
  appointment: Appointment,
  rescheduleRecord: RescheduleHistory,
  clientContact?: string
): Promise<boolean> {
  // Mock implementation - integraria com sistema de notificações real
  const message = `🔄 Reagendamento confirmado!

Seu agendamento foi alterado:
📅 De: ${formatDate(rescheduleRecord.originalDateTime)} às ${formatTime(rescheduleRecord.originalDateTime)}
📅 Para: ${formatDate(rescheduleRecord.newDateTime)} às ${formatTime(rescheduleRecord.newDateTime)}

Serviço: ${appointment.serviceName}
${rescheduleRecord.reason ? `Motivo: ${rescheduleRecord.reason}` : ''}

Nos vemos no novo horário! 💄✨`

  console.log('Enviando notificação de reagendamento:', message)
  
  // Simular envio
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return Math.random() > 0.1 // 90% sucesso
}

// Funções auxiliares
function getWeekOfYear(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function generateTimeSlots(
  date: Date,
  workingHour: WorkingHours,
  preferences: {
    preferMorning?: boolean
    preferAfternoon?: boolean
  }
): Date[] {
  const slots: Date[] = []
  const [openHour, openMinute] = workingHour.openTime.split(':').map(Number)
  const [closeHour, closeMinute] = workingHour.closeTime.split(':').map(Number)

  let currentHour = openHour
  let currentMinute = openMinute

  while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
    // Verificar preferências de período
    const isMorning = currentHour < 12
    const isAfternoon = currentHour >= 12

    let shouldInclude = true
    if (preferences.preferMorning && !isMorning) shouldInclude = false
    if (preferences.preferAfternoon && !isAfternoon) shouldInclude = false

    if (shouldInclude) {
      const slotDate = new Date(date)
      slotDate.setHours(currentHour, currentMinute, 0, 0)
      slots.push(slotDate)
    }

    // Avançar 30 minutos
    currentMinute += 30
    if (currentMinute >= 60) {
      currentHour++
      currentMinute = 0
    }

    if (slots.length >= 6) break // Máximo 6 slots por dia
  }

  return slots
}