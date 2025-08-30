import { validateAppointmentConflicts, findAvailableSlots } from './appointment-validation'
import { scheduleAppointmentNotifications } from './notifications'

export interface RescheduleRequest {
  appointmentId: string
  newDate: Date
  newDuration?: number
  reason?: string
  notifyClient?: boolean
}

export interface RescheduleResult {
  success: boolean
  newAppointment?: any
  conflicts?: any[]
  suggestedTimes?: string[]
  error?: string
}

export interface RescheduleOptions {
  allowConflicts?: boolean
  autoSuggestAlternatives?: boolean
  notificationSettings?: {
    sendConfirmation?: boolean
    sendCancellation?: boolean
  }
}

/**
 * Reagenda um agendamento existente
 */
export async function rescheduleAppointment(
  request: RescheduleRequest,
  existingAppointments: any[],
  workingHours: any[],
  holidays: any[],
  options: RescheduleOptions = {}
): Promise<RescheduleResult> {
  try {
    // 1. Buscar agendamento original
    const originalAppointment = existingAppointments.find(apt => apt.id === request.appointmentId)
    
    if (!originalAppointment) {
      return {
        success: false,
        error: 'Agendamento não encontrado'
      }
    }

    // 2. Validar novo horário
    const validationResult = validateAppointmentConflicts(
      {
        professionalId: originalAppointment.professionalId,
        scheduledFor: request.newDate,
        serviceDuration: request.newDuration || originalAppointment.serviceDuration,
        excludeId: request.appointmentId // Excluir o próprio agendamento
      },
      existingAppointments,
      workingHours,
      holidays
    )

    // 3. Se há conflitos e não permitidos, retornar sugestões
    if (!validationResult.isValid && !options.allowConflicts) {
      const suggestedTimes = findAvailableSlots(
        request.newDate,
        request.newDuration || originalAppointment.serviceDuration,
        originalAppointment.professionalId,
        existingAppointments,
        workingHours,
        holidays,
        5
      )

      return {
        success: false,
        conflicts: validationResult.conflicts,
        suggestedTimes,
        error: 'Novo horário possui conflitos. Verifique os horários sugeridos.'
      }
    }

    // 4. Atualizar agendamento
    const updatedAppointment = {
      ...originalAppointment,
      scheduledFor: request.newDate,
      serviceDuration: request.newDuration || originalAppointment.serviceDuration,
      notes: request.reason ? 
        `${originalAppointment.notes || ''}\n\nReagendado: ${request.reason}`.trim() : 
        originalAppointment.notes,
      updatedAt: new Date()
    }

    // 5. Agendar notificações se necessário
    if (request.notifyClient && options.notificationSettings) {
      // Notificação de cancelamento do horário original
      if (options.notificationSettings.sendCancellation) {
        // Implementar notificação de cancelamento
        console.log('Enviando notificação de cancelamento do horário original')
      }

      // Notificação de confirmação do novo horário
      if (options.notificationSettings.sendConfirmation) {
        const businessSettings = {
          name: 'BeautyFlow Studio',
          autoNotifications: {
            confirmation: true,
            reminder24h: true,
            reminder2h: true
          }
        }

        const notifications = scheduleAppointmentNotifications(
          {
            id: updatedAppointment.id,
            professionalId: updatedAppointment.professionalId,
            clientName: 'Cliente', // Seria obtido do banco
            serviceName: updatedAppointment.serviceName,
            servicePrice: updatedAppointment.servicePrice,
            serviceDuration: updatedAppointment.serviceDuration,
            scheduledFor: updatedAppointment.scheduledFor
          },
          businessSettings
        )

        console.log('Notificações de reagendamento programadas:', notifications.length)
      }
    }

    return {
      success: true,
      newAppointment: updatedAppointment
    }
  } catch (error) {
    console.error('Erro ao reagendar:', error)
    return {
      success: false,
      error: 'Erro interno ao processar reagendamento'
    }
  }
}

/**
 * Sugere horários alternativos para reagendamento
 */
export function suggestRescheduleOptions(
  originalDate: Date,
  duration: number,
  professionalId: string,
  existingAppointments: any[],
  workingHours: any[],
  holidays: any[],
  preferences: {
    sameDayPreferred?: boolean
    timeRange?: { start: string, end: string }
    daysAhead?: number
  } = {}
): {
  sameDay: string[]
  nextDays: string[]
  nextWeek: string[]
} {
  const suggestions = {
    sameDay: [] as string[],
    nextDays: [] as string[],
    nextWeek: [] as string[]
  }

  // Mesmo dia
  if (preferences.sameDayPreferred) {
    suggestions.sameDay = findAvailableSlots(
      originalDate,
      duration,
      professionalId,
      existingAppointments,
      workingHours,
      holidays,
      3
    )
  }

  // Próximos dias (3 dias)
  const tomorrow = new Date(originalDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  for (let i = 0; i < 3; i++) {
    const checkDate = new Date(tomorrow)
    checkDate.setDate(checkDate.getDate() + i)
    
    const daySlots = findAvailableSlots(
      checkDate,
      duration,
      professionalId,
      existingAppointments,
      workingHours,
      holidays,
      2
    )
    
    suggestions.nextDays.push(...daySlots)
  }

  // Próxima semana
  const nextWeek = new Date(originalDate)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  suggestions.nextWeek = findAvailableSlots(
    nextWeek,
    duration,
    professionalId,
    existingAppointments,
    workingHours,
    holidays,
    5
  )

  return suggestions
}

/**
 * Calcula impacto de um reagendamento
 */
export function calculateRescheduleImpact(
  originalDate: Date,
  newDate: Date,
  appointmentDuration: number
): {
  timeChange: number // em horas
  dayChange: number // em dias
  impact: 'low' | 'medium' | 'high'
  warnings: string[]
} {
  const warnings: string[] = []
  
  const timeDiff = Math.abs(newDate.getTime() - originalDate.getTime())
  const timeChangeHours = timeDiff / (1000 * 60 * 60)
  const dayChange = Math.abs(Math.floor(timeDiff / (1000 * 60 * 60 * 24)))
  
  let impact: 'low' | 'medium' | 'high' = 'low'
  
  // Determinar impacto
  if (dayChange === 0) {
    // Mesmo dia
    if (timeChangeHours <= 2) {
      impact = 'low'
    } else if (timeChangeHours <= 4) {
      impact = 'medium'
      warnings.push('Mudança significativa de horário no mesmo dia')
    } else {
      impact = 'high'
      warnings.push('Grande mudança de horário no mesmo dia')
    }
  } else if (dayChange <= 3) {
    impact = 'medium'
    warnings.push('Reagendamento para próximos dias')
  } else if (dayChange <= 7) {
    impact = 'medium'
    warnings.push('Reagendamento para próxima semana')
  } else {
    impact = 'high'
    warnings.push('Reagendamento para mais de uma semana')
  }
  
  // Verificações adicionais
  if (isWeekend(newDate) && !isWeekend(originalDate)) {
    warnings.push('Mudança de dia útil para fim de semana')
  }
  
  if (!isWeekend(newDate) && isWeekend(originalDate)) {
    warnings.push('Mudança de fim de semana para dia útil')
  }
  
  const now = new Date()
  const hoursUntilOriginal = (originalDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  if (hoursUntilOriginal < 24) {
    impact = 'high'
    warnings.push('Reagendamento com menos de 24h de antecedência')
  }
  
  return {
    timeChange: timeChangeHours,
    dayChange,
    impact,
    warnings
  }
}

/**
 * Processa reagendamento em lote
 */
export async function batchReschedule(
  requests: RescheduleRequest[],
  existingAppointments: any[],
  workingHours: any[],
  holidays: any[],
  options: RescheduleOptions = {}
): Promise<{
  successful: RescheduleResult[]
  failed: RescheduleResult[]
  summary: {
    total: number
    successful: number
    failed: number
  }
}> {
  const results = {
    successful: [] as RescheduleResult[],
    failed: [] as RescheduleResult[]
  }
  
  for (const request of requests) {
    const result = await rescheduleAppointment(
      request,
      existingAppointments,
      workingHours,
      holidays,
      options
    )
    
    if (result.success) {
      results.successful.push(result)
    } else {
      results.failed.push(result)
    }
  }
  
  return {
    ...results,
    summary: {
      total: requests.length,
      successful: results.successful.length,
      failed: results.failed.length
    }
  }
}

// Funções auxiliares
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Domingo ou sábado
}

/**
 * Verifica se um reagendamento é automaticamente aprovado
 */
export function shouldAutoApproveReschedule(
  impact: ReturnType<typeof calculateRescheduleImpact>,
  clientLoyaltyLevel: 'Bronze' | 'Prata' | 'Ouro' | 'Diamante',
  hoursInAdvance: number
): boolean {
  // Regras de auto-aprovação
  const rules = {
    Bronze: { minHours: 48, allowedImpact: 'low' as const },
    Prata: { minHours: 24, allowedImpact: 'medium' as const },
    Ouro: { minHours: 12, allowedImpact: 'medium' as const },
    Diamante: { minHours: 2, allowedImpact: 'high' as const }
  }
  
  const rule = rules[clientLoyaltyLevel]
  
  return hoursInAdvance >= rule.minHours && 
         (impact.impact === 'low' || 
          (impact.impact === rule.allowedImpact) ||
          (clientLoyaltyLevel === 'Diamante'))
}