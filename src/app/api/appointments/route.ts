import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus, PaymentStatus } from '@prisma/client'
import { z } from 'zod'
import { reminderScheduler } from '@/lib/reminder-scheduler'

// Schema de validação para criação de agendamento
const createAppointmentSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  scheduledFor: z.string().datetime(),
  notes: z.string().optional(),
  teamMemberId: z.string().optional(),
})

// Schema de atualização
const updateAppointmentSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().optional(),
  serviceId: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  paymentStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PAID']).optional(),
  notes: z.string().optional(),
  teamMemberId: z.string().optional(),
})

// GET - Listar agendamentos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Construir filtros
    const where: any = {
      professionalId: professionalId || professional?.id
    }

    if (date) {
      const filterDate = new Date(date)
      const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999))
      
      where.scheduledFor = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    if (status) {
      where.status = status as AppointmentStatus
    }

    if (clientId) {
      where.clientId = clientId
    }

    // Buscar agendamentos
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            loyaltyPoints: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        },
        teamMember: {
          select: {
            id: true,
            user: {
              select: {
                name: true
              }
            },
            position: true
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            paidAt: true
          }
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      },
      take: limit,
      skip: offset
    })

    // Contar total
    const total = await prisma.appointment.count({ where })

    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Criar novo agendamento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validar dados de entrada
    const validationResult = createAppointmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { clientId, serviceId, scheduledFor, notes, teamMemberId } = validationResult.data

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Buscar serviço
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        professionalId: professional.id
      }
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Buscar cliente
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        professionalId: professional.id
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const appointmentDate = new Date(scheduledFor)
    
    // Verificar conflitos de horário
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        professionalId: professional.id,
        status: {
          not: AppointmentStatus.CANCELLED
        },
        AND: [
          {
            scheduledFor: {
              lt: new Date(appointmentDate.getTime() + service.duration * 60000)
            }
          },
          {
            scheduledFor: {
              gte: new Date(appointmentDate.getTime() - service.duration * 60000)
            }
          }
        ]
      },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true, duration: true } }
      }
    })

    if (conflictingAppointment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Conflito de horário detectado',
          conflictWith: {
            id: conflictingAppointment.id,
            clientName: conflictingAppointment.client.name,
            serviceName: conflictingAppointment.service?.name,
            scheduledFor: conflictingAppointment.scheduledFor
          }
        },
        { status: 409 }
      )
    }

    // Criar agendamento
    const appointment = await prisma.appointment.create({
      data: {
        professionalId: professional.id,
        clientId,
        serviceId,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,
        scheduledFor: appointmentDate,
        teamMemberId,
        notes,
        status: AppointmentStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        }
      }
    })

    // Agendar lembretes automáticos
    try {
      await reminderScheduler.scheduleReminders(appointment.id)
      console.log(`Lembretes agendados para o agendamento ${appointment.id}`)
    } catch (reminderError) {
      console.error('Erro ao agendar lembretes:', reminderError)
      // Não falhar o agendamento por causa dos lembretes
    }

    return NextResponse.json({
      success: true,
      data: appointment,
      message: 'Agendamento criado com sucesso'
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar agendamento
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validar dados de entrada
    const validationResult = updateAppointmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { id, ...updateData } = validationResult.data

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Buscar agendamento existente
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        professionalId: professional.id
      },
      include: {
        service: true
      }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Preparar dados para atualização
    const updatePayload: any = {}

    // Se está alterando o serviço
    if (updateData.serviceId && updateData.serviceId !== existingAppointment.serviceId) {
      const service = await prisma.service.findFirst({
        where: {
          id: updateData.serviceId,
          professionalId: professional.id
        }
      })

      if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 })
      }

      updatePayload.serviceId = service.id
      updatePayload.serviceName = service.name
      updatePayload.servicePrice = service.price
      updatePayload.serviceDuration = service.duration
    }

    // Se está alterando data/hora
    if (updateData.scheduledFor) {
      const newDate = new Date(updateData.scheduledFor)
      const serviceDuration = updatePayload.serviceDuration || existingAppointment.serviceDuration

      // Verificar conflitos de horário
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          professionalId: professional.id,
          status: {
            not: AppointmentStatus.CANCELLED
          },
          AND: [
            {
              scheduledFor: {
                lt: new Date(newDate.getTime() + serviceDuration * 60000)
              }
            },
            {
              scheduledFor: {
                gte: new Date(newDate.getTime() - serviceDuration * 60000)
              }
            }
          ]
        },
        include: {
          client: { select: { name: true } }
        }
      })

      if (conflictingAppointment) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Conflito de horário detectado',
            conflictWith: {
              id: conflictingAppointment.id,
              clientName: conflictingAppointment.client.name,
              scheduledFor: conflictingAppointment.scheduledFor
            }
          },
          { status: 409 }
        )
      }

      updatePayload.scheduledFor = newDate
    }

    // Adicionar outros campos
    if (updateData.clientId) updatePayload.clientId = updateData.clientId
    if (updateData.status) updatePayload.status = updateData.status
    if (updateData.paymentStatus) updatePayload.paymentStatus = updateData.paymentStatus
    if (updateData.notes !== undefined) updatePayload.notes = updateData.notes
    if (updateData.teamMemberId !== undefined) updatePayload.teamMemberId = updateData.teamMemberId

    // Atualizar no banco
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updatePayload,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        },
        teamMember: {
          select: {
            id: true,
            user: { select: { name: true } },
            position: true
          }
        }
      }
    })

    // Se alterou a data/hora, reagendar lembretes
    if (updateData.scheduledFor) {
      try {
        await reminderScheduler.rescheduleReminders(id)
        console.log(`Lembretes reagendados para o agendamento ${id}`)
      } catch (reminderError) {
        console.error('Erro ao reagendar lembretes:', reminderError)
        // Não falhar a atualização por causa dos lembretes
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: 'Agendamento atualizado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar agendamento
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do agendamento é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Buscar agendamento
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        professionalId: professional.id
      },
      include: {
        client: { select: { name: true, phone: true } }
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar status para cancelado em vez de deletar
    const cancelledAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        updatedAt: new Date()
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        }
      }
    })

    // Cancelar lembretes
    try {
      await reminderScheduler.cancelExistingReminders(id)
      console.log(`Lembretes cancelados para o agendamento ${id}`)
    } catch (reminderError) {
      console.error('Erro ao cancelar lembretes:', reminderError)
    }

    return NextResponse.json({
      success: true,
      data: cancelledAppointment,
      message: 'Agendamento cancelado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}