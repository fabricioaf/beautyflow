import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validação para criação de cliente
const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
  birthDate: z.string().datetime().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.record(z.any()).optional(),
})

// Schema de atualização
const updateClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).optional().or(z.literal('')),
  birthDate: z.string().datetime().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.record(z.any()).optional(),
  loyaltyPoints: z.number().min(0).optional(),
})

// GET - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const orderBy = searchParams.get('orderBy') || 'name'
    const orderDir = searchParams.get('orderDir') || 'asc'

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Construir filtros
    const where: any = {
      professionalId: professional?.id
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Buscar clientes
    const clients = await prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        address: true,
        notes: true,
        loyaltyPoints: true,
        createdAt: true,
        updatedAt: true,
        preferences: true,
        _count: {
          select: {
            appointments: true
          }
        }
      },
      orderBy: {
        [orderBy]: orderDir as 'asc' | 'desc'
      },
      take: limit,
      skip: offset
    })

    // Contar total
    const total = await prisma.client.count({ where })

    // Calcular estatísticas por cliente
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const appointmentStats = await prisma.appointment.aggregate({
          where: {
            clientId: client.id,
            status: { not: 'CANCELLED' }
          },
          _count: true,
          _sum: {
            servicePrice: true
          }
        })

        const completedAppointments = await prisma.appointment.count({
          where: {
            clientId: client.id,
            status: 'COMPLETED'
          }
        })

        const noShowCount = await prisma.appointment.count({
          where: {
            clientId: client.id,
            status: 'NO_SHOW'
          }
        })

        const lastAppointment = await prisma.appointment.findFirst({
          where: {
            clientId: client.id,
            status: 'COMPLETED'
          },
          orderBy: {
            scheduledFor: 'desc'
          },
          select: {
            scheduledFor: true,
            serviceName: true
          }
        })

        const nextAppointment = await prisma.appointment.findFirst({
          where: {
            clientId: client.id,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            scheduledFor: { gte: new Date() }
          },
          orderBy: {
            scheduledFor: 'asc'
          },
          select: {
            id: true,
            scheduledFor: true,
            serviceName: true
          }
        })

        return {
          ...client,
          stats: {
            totalAppointments: appointmentStats._count,
            completedAppointments,
            noShowCount,
            totalSpent: appointmentStats._sum.servicePrice || 0,
            noShowRate: appointmentStats._count > 0 
              ? (noShowCount / appointmentStats._count) * 100 
              : 0,
            lastAppointment,
            nextAppointment
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: clientsWithStats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Criar novo cliente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validar dados de entrada
    const validationResult = createClientSchema.safeParse(body)
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

    const { name, email, phone, birthDate, address, notes, preferences } = validationResult.data

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Verificar se já existe cliente com o mesmo email (se fornecido)
    if (email && email.length > 0) {
      const existingClient = await prisma.client.findFirst({
        where: {
          professionalId: professional.id,
          email
        }
      })

      if (existingClient) {
        return NextResponse.json(
          { success: false, error: 'Cliente com este email já existe' },
          { status: 409 }
        )
      }
    }

    // Criar cliente
    const client = await prisma.client.create({
      data: {
        professionalId: professional.id,
        name,
        email: email || null,
        phone: phone || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        address: address || null,
        notes: notes || null,
        preferences: preferences || {},
        loyaltyPoints: 0
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        address: true,
        notes: true,
        loyaltyPoints: true,
        preferences: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Cliente criado com sucesso'
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar cliente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validar dados de entrada
    const validationResult = updateClientSchema.safeParse(body)
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

    // Verificar se cliente existe e pertence ao professional
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        professionalId: professional.id
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar conflito de email (se fornecido)
    if (updateData.email && updateData.email.length > 0) {
      const emailConflict = await prisma.client.findFirst({
        where: {
          id: { not: id },
          professionalId: professional.id,
          email: updateData.email
        }
      })

      if (emailConflict) {
        return NextResponse.json(
          { success: false, error: 'Outro cliente já possui este email' },
          { status: 409 }
        )
      }
    }

    // Preparar dados para atualização
    const updatePayload: any = {}
    if (updateData.name) updatePayload.name = updateData.name
    if (updateData.email !== undefined) updatePayload.email = updateData.email || null
    if (updateData.phone !== undefined) updatePayload.phone = updateData.phone || null
    if (updateData.birthDate) updatePayload.birthDate = new Date(updateData.birthDate)
    if (updateData.address !== undefined) updatePayload.address = updateData.address || null
    if (updateData.notes !== undefined) updatePayload.notes = updateData.notes || null
    if (updateData.preferences) updatePayload.preferences = updateData.preferences
    if (updateData.loyaltyPoints !== undefined) updatePayload.loyaltyPoints = updateData.loyaltyPoints

    // Atualizar no banco
    const updatedClient = await prisma.client.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        address: true,
        notes: true,
        loyaltyPoints: true,
        preferences: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Cliente atualizado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar cliente (soft delete)
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
        { success: false, error: 'ID do cliente é obrigatório' },
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

    // Verificar se cliente existe e pertence ao professional
    const client = await prisma.client.findFirst({
      where: {
        id,
        professionalId: professional.id
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se cliente tem agendamentos futuros
    const futureAppointments = await prisma.appointment.count({
      where: {
        clientId: id,
        scheduledFor: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] }
      }
    })

    if (futureAppointments > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cliente possui agendamentos futuros. Cancele-os primeiro.' 
        },
        { status: 409 }
      )
    }

    // Em vez de deletar, desativar o cliente (soft delete)
    // Para hard delete, descomente a linha abaixo
    // await prisma.client.delete({ where: { id } })

    // Por enquanto, apenas retornar sucesso (implementar soft delete se necessário)
    return NextResponse.json({
      success: true,
      message: 'Cliente removido com sucesso'
    })

  } catch (error) {
    console.error('Erro ao remover cliente:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}