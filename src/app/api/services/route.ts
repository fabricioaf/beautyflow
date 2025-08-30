import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validação para criação de serviço
const createServiceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  price: z.number().min(0.01, 'Preço deve ser maior que zero'),
  duration: z.number().min(5, 'Duração deve ser pelo menos 5 minutos'),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
})

// Schema de atualização
const updateServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().min(0.01).optional(),
  duration: z.number().min(5).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})

// GET - Listar serviços
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
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
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category) {
      where.category = category
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // Buscar serviços
    const services = await prisma.service.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        category: true,
        isActive: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            appointments: true
          }
        }
      },
      orderBy: {
        [orderBy]: orderDir as 'asc' | 'desc'
      }
    })

    // Calcular estatísticas por serviço
    const servicesWithStats = await Promise.all(
      services.map(async (service) => {
        const appointmentStats = await prisma.appointment.aggregate({
          where: {
            serviceId: service.id,
            status: 'COMPLETED'
          },
          _count: true,
          _sum: {
            servicePrice: true
          }
        })

        const lastBooking = await prisma.appointment.findFirst({
          where: {
            serviceId: service.id,
            status: 'COMPLETED'
          },
          orderBy: {
            scheduledFor: 'desc'
          },
          select: {
            scheduledFor: true,
            client: {
              select: {
                name: true
              }
            }
          }
        })

        return {
          ...service,
          stats: {
            totalBookings: appointmentStats._count,
            totalRevenue: appointmentStats._sum.servicePrice || 0,
            lastBooking
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: servicesWithStats
    })

  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Criar novo serviço
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validar dados de entrada
    const validationResult = createServiceSchema.safeParse(body)
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

    const { name, description, price, duration, category, isActive, metadata } = validationResult.data

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Verificar se já existe serviço com o mesmo nome
    const existingService = await prisma.service.findFirst({
      where: {
        professionalId: professional.id,
        name: { equals: name, mode: 'insensitive' }
      }
    })

    if (existingService) {
      return NextResponse.json(
        { success: false, error: 'Serviço com este nome já existe' },
        { status: 409 }
      )
    }

    // Criar serviço
    const service = await prisma.service.create({
      data: {
        professionalId: professional.id,
        name,
        description: description || null,
        price,
        duration,
        category: category || null,
        isActive: isActive ?? true,
        metadata: metadata || {}
      }
    })

    return NextResponse.json({
      success: true,
      data: service,
      message: 'Serviço criado com sucesso'
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar serviço:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar serviço
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validar dados de entrada
    const validationResult = updateServiceSchema.safeParse(body)
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

    // Verificar se serviço existe e pertence ao professional
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        professionalId: professional.id
      }
    })

    if (!existingService) {
      return NextResponse.json(
        { success: false, error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    // Verificar conflito de nome (se fornecido)
    if (updateData.name) {
      const nameConflict = await prisma.service.findFirst({
        where: {
          id: { not: id },
          professionalId: professional.id,
          name: { equals: updateData.name, mode: 'insensitive' }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: 'Outro serviço já possui este nome' },
          { status: 409 }
        )
      }
    }

    // Atualizar no banco
    const updatedService = await prisma.service.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: updatedService,
      message: 'Serviço atualizado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar serviço
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
        { success: false, error: 'ID do serviço é obrigatório' },
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

    // Verificar se serviço existe e pertence ao professional
    const service = await prisma.service.findFirst({
      where: {
        id,
        professionalId: professional.id
      }
    })

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se serviço tem agendamentos futuros
    const futureAppointments = await prisma.appointment.count({
      where: {
        serviceId: id,
        scheduledFor: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] }
      }
    })

    if (futureAppointments > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Serviço possui agendamentos futuros. Desative-o em vez de excluir.' 
        },
        { status: 409 }
      )
    }

    // Desativar em vez de deletar
    const deactivatedService = await prisma.service.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      data: deactivatedService,
      message: 'Serviço desativado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao desativar serviço:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}