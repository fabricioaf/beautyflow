import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obter conversas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    // Buscar profissional
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    if (conversationId) {
      // Buscar mensagens de uma conversa específica
      // Em produção seria uma tabela separada de mensagens
      // Por enquanto simulamos com notificações
      const messages = await prisma.notification.findMany({
        where: {
          professionalId: professional.id,
          // Simular filtro por conversa usando metadata
        },
        orderBy: { createdAt: 'asc' },
        take: 50
      })

      return NextResponse.json({ messages })
    } else {
      // Buscar lista de conversas
      const clients = await prisma.client.findMany({
        where: { professionalId: professional.id },
        include: {
          appointments: {
            orderBy: { scheduledFor: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      // Simular conversas baseadas nos clientes
      const conversations = clients.map(client => ({
        id: client.id,
        clientName: client.name,
        clientAvatar: null,
        lastMessage: 'Última interação via sistema',
        lastMessageTime: client.updatedAt,
        unreadCount: 0, // Seria calculado em produção
        isOnline: false // Seria verificado em tempo real
      }))

      return NextResponse.json({ conversations })
    }

  } catch (error) {
    console.error('Erro ao buscar conversas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Enviar mensagem
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, message, type = 'text' } = body

    if (!clientId || !message) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    // Buscar profissional
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Buscar cliente
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        professionalId: professional.id
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Criar notificação como mensagem (simulação)
    const messageRecord = await prisma.notification.create({
      data: {
        id: `msg_${Date.now()}`,
        professionalId: professional.id,
        type: 'MARKETING', // Usar um tipo mais específico em produção
        title: 'Nova mensagem',
        message: message,
        channel: client.phone ? 'whatsapp' : 'email',
        recipient: client.phone || client.email || '',
        metadata: {
          clientId,
          messageType: type,
          isFromProfessional: true,
          conversationId: `conv_${professional.id}_${clientId}`
        }
      }
    })

    // Em produção, aqui seria enviada via WhatsApp API, SMS, etc.
    console.log(`Sending message to ${client.name}: ${message}`)

    return NextResponse.json({
      success: true,
      messageId: messageRecord.id,
      sentAt: messageRecord.createdAt,
      message: 'Mensagem enviada com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Marcar mensagens como lidas
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, messageIds } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'ID da conversa obrigatório' }, { status: 400 })
    }

    // Buscar profissional
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Marcar notificações como lidas (simulação)
    const updateResult = await prisma.notification.updateMany({
      where: {
        professionalId: professional.id,
        ...(messageIds && { id: { in: messageIds } })
      },
      data: {
        // Em produção teria um campo `readAt`
        status: 'read'
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count,
      message: 'Mensagens marcadas como lidas'
    })

  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}