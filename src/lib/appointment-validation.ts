import { formatDate, formatDateTime } from './utils'

export interface Appointment {
  id: string
  professionalId: string
  clientId: string
  serviceName: string
  servicePrice: number
  serviceDuration: number
  scheduledFor: Date
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
  notes?: string
}

export interface WorkingHours {
  dayOfWeek: number // 0 = domingo, 1 = segunda, ...
  isOpen: boolean
  openTime: string
  closeTime: string
  breakStart?: string
  breakEnd?: string
}

export interface Holiday {
  id: string
  date: string
  name: string
  type: 'holiday' | 'vacation' | 'event'
}

export interface ConflictValidationResult {
  isValid: boolean
  conflicts: ConflictDetail[]
  warnings: string[]
}

export interface ConflictDetail {
  type: 'appointment' | 'working_hours' | 'holiday' | 'break'
  message: string
  conflictingAppointment?: Appointment
  suggestedTimes?: string[]
}

/**
 * Valida se um novo agendamento pode ser criado sem conflitos
 */
export function validateAppointmentConflicts(
  newAppointment: {
    professionalId: string
    scheduledFor: Date
    serviceDuration: number
    excludeId?: string // Para edição
  },
  existingAppointments: Appointment[],
  workingHours: WorkingHours[],
  holidays: Holiday[]
): ConflictValidationResult {
  const conflicts: ConflictDetail[] = []
  const warnings: string[] = []

  const { scheduledFor, serviceDuration, professionalId, excludeId } = newAppointment
  const appointmentEnd = new Date(scheduledFor.getTime() + serviceDuration * 60000)
  const dayOfWeek = scheduledFor.getDay()

  // 1. Validar horário de funcionamento
  const workingHour = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)
  if (!workingHour || !workingHour.isOpen) {
    conflicts.push({
      type: 'working_hours',
      message: `Estabelecimento fechado em ${formatDate(scheduledFor)}`,
      suggestedTimes: getNextAvailableDays(scheduledFor, workingHours)
    })
  } else {
    // Verificar se está dentro do horário de funcionamento
    const openTime = parseTime(workingHour.openTime)
    const closeTime = parseTime(workingHour.closeTime)
    const appointmentTime = parseTime(formatTime(scheduledFor))
    const appointmentEndTime = parseTime(formatTime(appointmentEnd))

    if (appointmentTime < openTime || appointmentEndTime > closeTime) {
      conflicts.push({
        type: 'working_hours',
        message: `Horário fora do funcionamento (${workingHour.openTime} - ${workingHour.closeTime})`,
        suggestedTimes: getSuggestedTimesForDay(scheduledFor, workingHour, serviceDuration)
      })
    }

    // Verificar intervalo de almoço
    if (workingHour.breakStart && workingHour.breakEnd) {
      const breakStart = parseTime(workingHour.breakStart)
      const breakEnd = parseTime(workingHour.breakEnd)
      
      if ((appointmentTime < breakEnd && appointmentEndTime > breakStart)) {
        conflicts.push({
          type: 'break',
          message: `Conflito com horário de almoço (${workingHour.breakStart} - ${workingHour.breakEnd})`,
          suggestedTimes: getSuggestedTimesAvoidingBreak(scheduledFor, workingHour, serviceDuration)
        })
      }
    }
  }

  // 2. Verificar feriados
  const appointmentDate = formatDate(scheduledFor)
  const holiday = holidays.find(h => h.date === appointmentDate)
  if (holiday) {
    conflicts.push({
      type: 'holiday',
      message: `${holiday.name} - ${getHolidayTypeText(holiday.type)}`,
      suggestedTimes: getNextAvailableDays(scheduledFor, workingHours, holidays)
    })
  }

  // 3. Verificar conflitos com outros agendamentos
  const conflictingAppointments = existingAppointments.filter(apt => {
    if (apt.id === excludeId) return false // Excluir o próprio agendamento ao editar
    if (apt.professionalId !== professionalId) return false
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') return false

    const existingStart = new Date(apt.scheduledFor)
    const existingEnd = new Date(existingStart.getTime() + apt.serviceDuration * 60000)

    // Verificar sobreposição de tempo
    return (scheduledFor < existingEnd && appointmentEnd > existingStart)
  })

  conflictingAppointments.forEach(conflictApt => {
    conflicts.push({
      type: 'appointment',
      message: `Conflito com agendamento existente: ${conflictApt.serviceName} às ${formatTime(new Date(conflictApt.scheduledFor))}`,
      conflictingAppointment: conflictApt,
      suggestedTimes: getSuggestedTimesAroundConflict(scheduledFor, conflictApt, serviceDuration)
    })
  })

  // 4. Avisos adicionais
  if (isWeekend(scheduledFor)) {
    warnings.push('Agendamento em fim de semana')
  }

  if (isAfterHours(scheduledFor)) {
    warnings.push('Agendamento fora do horário comercial comum')
  }

  if (isTooSoon(scheduledFor)) {
    warnings.push('Agendamento muito próximo (menos de 2 horas)')
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
    warnings
  }
}

/**
 * Encontra próximos horários disponíveis
 */
export function findAvailableSlots(
  date: Date,
  duration: number,
  professionalId: string,
  existingAppointments: Appointment[],
  workingHours: WorkingHours[],
  holidays: Holiday[],
  slotCount: number = 5
): string[] {
  const availableSlots: string[] = []
  let currentDate = new Date(date)
  let daysChecked = 0
  const maxDaysToCheck = 14

  while (availableSlots.length < slotCount && daysChecked < maxDaysToCheck) {
    const dayOfWeek = currentDate.getDay()
    const workingHour = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)

    if (workingHour && workingHour.isOpen) {
      // Verificar se não é feriado
      const dateStr = formatDate(currentDate)
      const isHoliday = holidays.some(h => h.date === dateStr)

      if (!isHoliday) {
        const daySlots = generateDaySlotsAvailable(
          currentDate,
          duration,
          professionalId,
          existingAppointments,
          workingHour
        )
        availableSlots.push(...daySlots)
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
    daysChecked++
  }

  return availableSlots.slice(0, slotCount)
}

// Funções auxiliares
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5)
}

function getHolidayTypeText(type: string): string {
  switch (type) {
    case 'holiday': return 'Feriado'
    case 'vacation': return 'Férias'
    case 'event': return 'Evento'
    default: return type
  }
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function isAfterHours(date: Date): boolean {
  const hour = date.getHours()
  return hour < 8 || hour > 18
}

function isTooSoon(date: Date): boolean {
  const now = new Date()
  const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours < 2
}

function getNextAvailableDays(
  date: Date,
  workingHours: WorkingHours[],
  holidays: Holiday[] = []
): string[] {
  const suggestions: string[] = []
  let currentDate = new Date(date)
  let daysChecked = 0

  while (suggestions.length < 3 && daysChecked < 14) {
    currentDate.setDate(currentDate.getDate() + 1)
    const dayOfWeek = currentDate.getDay()
    const workingHour = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)

    if (workingHour && workingHour.isOpen) {
      const dateStr = formatDate(currentDate)
      const isHoliday = holidays.some(h => h.date === dateStr)
      
      if (!isHoliday) {
        suggestions.push(`${formatDate(currentDate)} às ${workingHour.openTime}`)
      }
    }
    daysChecked++
  }

  return suggestions
}

function getSuggestedTimesForDay(
  date: Date,
  workingHour: WorkingHours,
  duration: number
): string[] {
  const suggestions: string[] = []
  const openMinutes = parseTime(workingHour.openTime)
  const closeMinutes = parseTime(workingHour.closeTime)
  const durationMinutes = duration

  // Sugerir início do dia
  if (openMinutes + durationMinutes <= closeMinutes) {
    suggestions.push(`${formatDate(date)} às ${workingHour.openTime}`)
  }

  // Sugerir meio do dia (evitando almoço se houver)
  let midDayTime = Math.floor((openMinutes + closeMinutes) / 2)
  if (workingHour.breakStart) {
    const breakStart = parseTime(workingHour.breakStart)
    const breakEnd = parseTime(workingHour.breakEnd!)
    
    if (midDayTime >= breakStart && midDayTime <= breakEnd) {
      midDayTime = breakEnd + 30 // 30 min após o almoço
    }
  }

  if (midDayTime + durationMinutes <= closeMinutes) {
    const midHours = Math.floor(midDayTime / 60)
    const midMins = midDayTime % 60
    suggestions.push(`${formatDate(date)} às ${midHours.toString().padStart(2, '0')}:${midMins.toString().padStart(2, '0')}`)
  }

  return suggestions.slice(0, 2)
}

function getSuggestedTimesAvoidingBreak(
  date: Date,
  workingHour: WorkingHours,
  duration: number
): string[] {
  const suggestions: string[] = []
  
  if (workingHour.breakStart && workingHour.breakEnd) {
    const breakStart = parseTime(workingHour.breakStart)
    const breakEnd = parseTime(workingHour.breakEnd)
    const openMinutes = parseTime(workingHour.openTime)
    const closeMinutes = parseTime(workingHour.closeTime)

    // Antes do almoço
    if (openMinutes + duration <= breakStart) {
      const beforeBreakTime = breakStart - duration
      const hours = Math.floor(beforeBreakTime / 60)
      const mins = beforeBreakTime % 60
      suggestions.push(`${formatDate(date)} às ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`)
    }

    // Depois do almoço
    if (breakEnd + duration <= closeMinutes) {
      const afterBreakHours = Math.floor(breakEnd / 60)
      const afterBreakMins = breakEnd % 60
      suggestions.push(`${formatDate(date)} às ${afterBreakHours.toString().padStart(2, '0')}:${afterBreakMins.toString().padStart(2, '0')}`)
    }
  }

  return suggestions
}

function getSuggestedTimesAroundConflict(
  date: Date,
  conflictingAppointment: Appointment,
  duration: number
): string[] {
  const suggestions: string[] = []
  const conflictStart = new Date(conflictingAppointment.scheduledFor)
  const conflictEnd = new Date(conflictStart.getTime() + conflictingAppointment.serviceDuration * 60000)

  // Antes do conflito
  const beforeTime = new Date(conflictStart.getTime() - duration * 60000)
  if (beforeTime > new Date()) {
    suggestions.push(`${formatDate(beforeTime)} às ${formatTime(beforeTime)}`)
  }

  // Depois do conflito
  suggestions.push(`${formatDate(conflictEnd)} às ${formatTime(conflictEnd)}`)

  return suggestions
}

function generateDaySlotsAvailable(
  date: Date,
  duration: number,
  professionalId: string,
  existingAppointments: Appointment[],
  workingHour: WorkingHours
): string[] {
  const slots: string[] = []
  const openMinutes = parseTime(workingHour.openTime)
  const closeMinutes = parseTime(workingHour.closeTime)
  const slotInterval = 30 // 30 minutos entre slots

  for (let minutes = openMinutes; minutes + duration <= closeMinutes; minutes += slotInterval) {
    const slotTime = new Date(date)
    slotTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)

    // Verificar se não conflita com outros agendamentos
    const hasConflict = existingAppointments.some(apt => {
      if (apt.professionalId !== professionalId) return false
      if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') return false

      const existingStart = new Date(apt.scheduledFor)
      const existingEnd = new Date(existingStart.getTime() + apt.serviceDuration * 60000)
      const slotEnd = new Date(slotTime.getTime() + duration * 60000)

      return (slotTime < existingEnd && slotEnd > existingStart)
    })

    if (!hasConflict) {
      slots.push(`${formatDate(slotTime)} às ${formatTime(slotTime)}`)
    }

    if (slots.length >= 3) break // Máximo 3 slots por dia
  }

  return slots
}