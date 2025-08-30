import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus, PaymentStatus } from '@prisma/client'
import { z } from 'zod'

// Schema de validação para atualização de status
const updateStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  paymentStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PAID']).optional(),
  notes: z.string().optional()
})

// GET - Buscar agendamento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Buscar agendamento
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        professionalId: professional?.id
      },
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
      }
    })
    
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: appointment
    })

  } catch (error) {
    console.error('Erro ao buscar agendamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar status do agendamento
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    // Validar dados de entrada
    const validationResult = updateStatusSchema.safeParse(body)
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

    const updateData = validationResult.data

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Verificar se agendamento existe e pertence ao profissional
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        professionalId: professional?.id
      }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar agendamento
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
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
            duration: true
          }
        },
        teamMember: {
          select: {
            id: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

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

// DELETE - Cancelar/deletar agendamento específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Verificar se agendamento existe e pertence ao profissional
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        professionalId: professional?.id
      }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Em vez de deletar, marcar como cancelado
    const cancelledAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED
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
            duration: true
          }
        }
      }
    })

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