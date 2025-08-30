import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { whatsappConfirmationService } from '@/lib/whatsapp-confirmation-service'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema para validação de query parameters
const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  status: z.enum(['PROCESSED', 'FAILED', 'PENDING']).optional(),
  action: z.enum(['CONFIRM', 'CANCEL', 'RESCHEDULE', 'INFO']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  clientId: z.string().optional(),
  appointmentId: z.string().optional()
})

// Schema para teste de interpretação
const testSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória'),
  phoneNumber: z.string().min(10, 'Número de telefone inválido')
})

// Schema para simular confirmação
const simulateSchema = z.object({
  appointmentId: z.string().min(1, 'ID do agendamento é obrigatório'),
  action: z.enum(['CONFIRM', 'CANCEL', 'RESCHEDULE']),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  newDate: z.string().optional(),
  newTime: z.string().optional()
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

    const page = parseInt(validatedQuery.page)
    const limit = parseInt(validatedQuery.limit)
    const offset = (page - 1) * limit

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

    // Construir filtros
    const whereClause: any = {}

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      whereClause.appointment = {
        professionalId: professional!.id
      }
    }

    if (validatedQuery.status) {
      whereClause.status = validatedQuery.status
    }

    if (validatedQuery.action) {
      whereClause.action = validatedQuery.action
    }

    if (validatedQuery.clientId) {
      whereClause.appointment = {
        ...whereClause.appointment,
        clientId: validatedQuery.clientId
      }
    }

    if (validatedQuery.appointmentId) {
      whereClause.appointmentId = validatedQuery.appointmentId
    }

    if (validatedQuery.dateFrom || validatedQuery.dateTo) {
      whereClause.processedAt = {}
      if (validatedQuery.dateFrom) {
        whereClause.processedAt.gte = new Date(validatedQuery.dateFrom)
      }
      if (validatedQuery.dateTo) {
        whereClause.processedAt.lte = new Date(validatedQuery.dateTo)
      }
    }

    // Buscar confirmações
    const [confirmations, totalCount] = await Promise.all([
      prisma.appointmentConfirmation.findMany({
        where: whereClause,
        include: {
          appointment: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true
                }
              },
              professional: {
                select: {
                  id: true,
                  businessName: true,
                  user: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              service: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          processedAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.appointmentConfirmation.count({
        where: whereClause
      })
    ])

    // Calcular estatísticas
    const stats = await prisma.appointmentConfirmation.groupBy({
      by: ['action', 'status'],
      where: session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN'
        ? {}
        : {
            appointment: {
              professionalId: professional!.id
            }
          },
      _count: {
        id: true
      }
    })

    // Organizar estatísticas
    const organizedStats = {
      total: stats.reduce((acc, curr) => acc + curr._count.id, 0),
      byAction: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      successRate: 0
    }

    stats.forEach(stat => {
      organizedStats.byAction[stat.action] = (organizedStats.byAction[stat.action] || 0) + stat._count.id
      organizedStats.byStatus[stat.status] = (organizedStats.byStatus[stat.status] || 0) + stat._count.id
    })

    const processedCount = organizedStats.byStatus['PROCESSED'] || 0
    organizedStats.successRate = organizedStats.total > 0 
      ? Math.round((processedCount / organizedStats.total) * 100 * 100) / 100
      : 0

    return NextResponse.json({
      confirmations: confirmations.map(conf => ({
        id: conf.id,
        appointmentId: conf.appointmentId,
        clientPhone: conf.clientPhone,
        action: conf.action,
        originalMessage: conf.originalMessage,
        interpretedAction: conf.interpretedAction,
        processedAt: conf.processedAt,
        status: conf.status,
        responseMessage: conf.responseMessage,
        appointment: conf.appointment,
        metadata: conf.metadata
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: organizedStats
    })

  } catch (error) {
    console.error('Error fetching confirmations:', error)

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
    const { action, ...data } = body

    switch (action) {
      case 'test_interpretation':
        return await handleTestInterpretation(data)
      
      case 'simulate_confirmation':
        return await handleSimulateConfirmation(data, session.user)
      
      case 'reprocess_confirmation':
        return await handleReprocessConfirmation(data, session.user)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in confirmations POST:', error)

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

async function handleTestInterpretation(data: any) {
  const validatedData = testSchema.parse(data)

  try {
    const interpretedAction = await whatsappConfirmationService.processIncomingMessage(
      validatedData.phoneNumber,
      validatedData.message
    )

    return NextResponse.json({
      success: true,
      interpretation: interpretedAction,
      analysis: {
        confidence: interpretedAction.confidence,
        recommendedAction: interpretedAction.confidence > 0.7 ? 'AUTO_EXECUTE' : 'MANUAL_REVIEW',
        riskLevel: interpretedAction.confidence < 0.3 ? 'HIGH' : 
                  interpretedAction.confidence < 0.7 ? 'MEDIUM' : 'LOW'
      }
    })

  } catch (error) {
    console.error('Error testing interpretation:', error)
    return NextResponse.json(
      { error: 'Error processing interpretation test' },
      { status: 500 }
    )
  }
}

async function handleSimulateConfirmation(data: any, user: any) {
  const validatedData = simulateSchema.parse(data)

  try {
    // Verificar se o agendamento existe e pertence ao usuário
    const professional = await prisma.professional.findUnique({
      where: { userId: user.id }
    })

    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedData.appointmentId },
      include: {
        client: true,
        professional: true
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    if (appointment.professionalId !== professional?.id && 
        user.role !== 'ADMIN' && 
        user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to simulate confirmation for this appointment' },
        { status: 403 }
      )
    }

    // Criar ação simulada
    const simulatedAction = {
      type: validatedData.action as any,
      appointmentId: validatedData.appointmentId,
      message: validatedData.message,
      confidence: 1.0, // Simulação tem confiança máxima
      newDate: validatedData.newDate ? new Date(validatedData.newDate) : undefined,
      newTime: validatedData.newTime
    }

    // Executar ação
    const result = await whatsappConfirmationService.executeAction(
      simulatedAction,
      appointment.client.phone || '5511999999999'
    )

    return NextResponse.json({
      success: true,
      simulation: {
        action: simulatedAction,
        result,
        appointment: {
          id: appointment.id,
          clientName: appointment.client.name,
          serviceName: appointment.serviceName,
          scheduledFor: appointment.scheduledFor
        }
      }
    })

  } catch (error) {
    console.error('Error simulating confirmation:', error)
    return NextResponse.json(
      { error: 'Error processing simulation' },
      { status: 500 }
    )
  }
}

async function handleReprocessConfirmation(data: any, user: any) {
  const { confirmationId } = data

  if (!confirmationId) {
    return NextResponse.json(
      { error: 'confirmationId is required' },
      { status: 400 }
    )
  }

  try {
    // Buscar confirmação
    const confirmation = await prisma.appointmentConfirmation.findUnique({
      where: { id: confirmationId },
      include: {
        appointment: {
          include: {
            client: true,
            professional: true
          }
        }
      }
    })

    if (!confirmation) {
      return NextResponse.json(
        { error: 'Confirmation not found' },
        { status: 404 }
      )
    }

    // Verificar permissões
    const professional = await prisma.professional.findUnique({
      where: { userId: user.id }
    })

    if (confirmation.appointment.professionalId !== professional?.id && 
        user.role !== 'ADMIN' && 
        user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to reprocess this confirmation' },
        { status: 403 }
      )
    }

    // Reprocessar mensagem
    const reinterpretedAction = await whatsappConfirmationService.processIncomingMessage(
      confirmation.clientPhone,
      confirmation.originalMessage
    )

    // Executar nova ação se a confiança for suficiente
    let newResult = null
    if (reinterpretedAction.confidence > 0.5) {
      newResult = await whatsappConfirmationService.executeAction(
        reinterpretedAction,
        confirmation.clientPhone
      )
    }

    // Atualizar confirmação
    await prisma.appointmentConfirmation.update({
      where: { id: confirmationId },
      data: {
        interpretedAction: reinterpretedAction,
        status: newResult?.success ? 'PROCESSED' : 'FAILED',
        responseMessage: newResult?.responseMessage,
        metadata: {
          ...confirmation.metadata as any,
          reprocessedAt: new Date(),
          reprocessedBy: user.id,
          previousAction: confirmation.action
        }
      }
    })

    return NextResponse.json({
      success: true,
      reprocessing: {
        originalAction: confirmation.interpretedAction,
        newAction: reinterpretedAction,
        executionResult: newResult,
        confidenceImprovement: reinterpretedAction.confidence - (confirmation.interpretedAction as any)?.confidence || 0
      }
    })

  } catch (error) {
    console.error('Error reprocessing confirmation:', error)
    return NextResponse.json(
      { error: 'Error reprocessing confirmation' },
      { status: 500 }
    )
  }
}