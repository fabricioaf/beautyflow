import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { reminderScheduler } from '@/lib/reminder-scheduler'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema para configuração de lembretes
const reminderConfigSchema = z.object({
  enabled: z.boolean().default(true),
  hoursBeforeAppointment: z.array(z.number().min(0).max(168)).default([24, 2]), // máximo 1 semana
  useWhatsApp: z.boolean().default(true),
  useEmail: z.boolean().default(false),
  useSMS: z.boolean().default(false),
  customTemplate: z.string().optional()
})

// Schema para filtros de consulta
const querySchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELED']).optional(),
  type: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  action: z.enum(['list', 'stats', 'config']).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = querySchema.parse(queryParams)

    // Buscar profissional
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id },
      include: {
        reminderSettings: true
      }
    })

    if (!professional && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      )
    }

    const professionalId = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' 
      ? undefined 
      : professional!.id

    switch (validatedQuery.action) {
      case 'stats':
        const stats = await reminderScheduler.getReminderStats(professionalId)
        return NextResponse.json({ stats })

      case 'config':
        if (!professional) {
          return NextResponse.json(
            { error: 'Professional not found' },
            { status: 404 }
          )
        }

        const config = professional.reminderSettings || {
          enabled: true,
          hoursBeforeAppointment: [24, 2],
          useWhatsApp: true,
          useEmail: false,
          useSMS: false
        }

        return NextResponse.json({ config })

      case 'list':
      default:
        const filters = {
          professionalId,
          status: validatedQuery.status,
          type: validatedQuery.type,
          dateFrom: validatedQuery.dateFrom ? new Date(validatedQuery.dateFrom) : undefined,
          dateTo: validatedQuery.dateTo ? new Date(validatedQuery.dateTo) : undefined,
          page: parseInt(validatedQuery.page),
          limit: parseInt(validatedQuery.limit)
        }

        const result = await reminderScheduler.listReminders(filters)
        return NextResponse.json(result)
    }

  } catch (error) {
    console.error('Error in reminders API:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, appointmentId, config } = body

    // Buscar profissional
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'schedule':
        if (!appointmentId) {
          return NextResponse.json(
            { error: 'appointmentId is required' },
            { status: 400 }
          )
        }

        // Verificar se o agendamento pertence ao profissional
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId }
        })

        if (!appointment) {
          return NextResponse.json(
            { error: 'Appointment not found' },
            { status: 404 }
          )
        }

        if (appointment.professionalId !== professional?.id && 
            session.user.role !== 'ADMIN' && 
            session.user.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Unauthorized to schedule reminders for this appointment' },
            { status: 403 }
          )
        }

        await reminderScheduler.scheduleReminders(appointmentId)

        return NextResponse.json({
          success: true,
          message: 'Lembretes agendados com sucesso'
        })

      case 'reschedule':
        if (!appointmentId) {
          return NextResponse.json(
            { error: 'appointmentId is required' },
            { status: 400 }
          )
        }

        // Verificar permissões
        const appointmentToReschedule = await prisma.appointment.findUnique({
          where: { id: appointmentId }
        })

        if (!appointmentToReschedule) {
          return NextResponse.json(
            { error: 'Appointment not found' },
            { status: 404 }
          )
        }

        if (appointmentToReschedule.professionalId !== professional?.id && 
            session.user.role !== 'ADMIN' && 
            session.user.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Unauthorized to reschedule reminders for this appointment' },
            { status: 403 }
          )
        }

        await reminderScheduler.rescheduleReminders(appointmentId)

        return NextResponse.json({
          success: true,
          message: 'Lembretes reagendados com sucesso'
        })

      case 'cancel':
        if (!appointmentId) {
          return NextResponse.json(
            { error: 'appointmentId is required' },
            { status: 400 }
          )
        }

        // Verificar permissões
        const appointmentToCancel = await prisma.appointment.findUnique({
          where: { id: appointmentId }
        })

        if (!appointmentToCancel) {
          return NextResponse.json(
            { error: 'Appointment not found' },
            { status: 404 }
          )
        }

        if (appointmentToCancel.professionalId !== professional?.id && 
            session.user.role !== 'ADMIN' && 
            session.user.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Unauthorized to cancel reminders for this appointment' },
            { status: 403 }
          )
        }

        await reminderScheduler.cancelExistingReminders(appointmentId)

        return NextResponse.json({
          success: true,
          message: 'Lembretes cancelados com sucesso'
        })

      case 'update_config':
        if (!professional) {
          return NextResponse.json(
            { error: 'Professional not found' },
            { status: 404 }
          )
        }

        if (!config) {
          return NextResponse.json(
            { error: 'config is required' },
            { status: 400 }
          )
        }

        const validatedConfig = reminderConfigSchema.parse(config)

        // Atualizar ou criar configuração de lembretes
        await prisma.professional.update({
          where: { id: professional.id },
          data: {
            reminderSettings: validatedConfig
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Configuração de lembretes atualizada com sucesso',
          config: validatedConfig
        })

      case 'process_pending':
        // Apenas admins podem processar lembretes pendentes manualmente
        if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }

        await reminderScheduler.processPendingReminders()

        return NextResponse.json({
          success: true,
          message: 'Lembretes pendentes processados com sucesso'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in reminders POST API:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reminderId, status } = body

    if (!reminderId || !status) {
      return NextResponse.json(
        { error: 'reminderId and status are required' },
        { status: 400 }
      )
    }

    // Buscar lembrete
    const reminder = await prisma.appointmentReminder.findUnique({
      where: { id: reminderId },
      include: {
        appointment: {
          include: {
            professional: true
          }
        }
      }
    })

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      )
    }

    // Verificar permissões
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (reminder.appointment.professionalId !== professional?.id && 
        session.user.role !== 'ADMIN' && 
        session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to update this reminder' },
        { status: 403 }
      )
    }

    // Atualizar status do lembrete
    const updatedReminder = await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: { status }
    })

    return NextResponse.json({
      success: true,
      reminder: updatedReminder
    })

  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}