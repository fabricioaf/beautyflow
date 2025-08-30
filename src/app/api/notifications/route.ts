import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'
import { 
  createNotification, 
  scheduleAppointmentNotifications,
  processNotificationQueue
} from '@/lib/notifications'

/**
 * GET /api/notifications - Lista todas as notificações
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
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

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type as NotificationType
    }

    // Buscar notificações
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        appointment: {
          select: {
            id: true,
            serviceName: true,
            scheduledFor: true,
            client: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Contar total
    const total = await prisma.notification.count({ where })

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
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
 * POST /api/notifications - Cria uma nova notificação
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, professionalId, appointmentId, recipient, channel = 'whatsapp', title, message, priority = 'NORMAL', metadata } = body

    if (!type || !recipient || !title || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Campos obrigatórios: type, recipient, title, message' 
        },
        { status: 400 }
      )
    }

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && !professionalId) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    const targetProfessionalId = professionalId || professional?.id

    // Criar notificação no banco
    const newNotification = await prisma.notification.create({
      data: {
        type: type as NotificationType,
        title,
        message,
        channel,
        recipient,
        priority,
        professionalId: targetProfessionalId,
        appointmentId: appointmentId || null,
        userId: session.user.id,
        metadata: metadata || {},
        status: 'pending'
      },
      include: {
        appointment: {
          select: {
            id: true,
            serviceName: true,
            scheduledFor: true,
            client: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: newNotification,
      message: 'Notificação criada com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar notificação:', error)
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
 * PUT /api/notifications - Atualiza status de uma notificação
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, sentAt, readAt, read, metadata } = body

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID da notificação é obrigatório' 
        },
        { status: 400 }
      )
    }

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Verificar se a notificação existe e pertence ao profissional
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id,
        OR: [
          { professionalId: professional?.id },
          { userId: session.user.id }
        ]
      }
    })

    if (!existingNotification) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Notificação não encontrada' 
        },
        { status: 404 }
      )
    }

    // Preparar dados para atualização
    const updateData: any = {}
    
    if (status) updateData.status = status
    if (sentAt) updateData.sentAt = new Date(sentAt)
    if (readAt) updateData.readAt = new Date(readAt)
    if (read !== undefined) {
      updateData.read = read
      if (read && !existingNotification.readAt) {
        updateData.readAt = new Date()
      }
    }
    if (metadata) {
      updateData.metadata = {
        ...existingNotification.metadata,
        ...metadata
      }
    }

    // Atualizar notificação
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: updateData,
      include: {
        appointment: {
          select: {
            id: true,
            serviceName: true,
            scheduledFor: true,
            client: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedNotification,
      message: 'Notificação atualizada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar notificação:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}