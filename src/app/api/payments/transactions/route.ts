import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema de validação para query parameters
const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  status: z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED']).optional(),
  method: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional()
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

    // Buscar o professional do usuário
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      )
    }

    // Construir where clause
    const whereClause: any = {}

    // Se não for admin, filtrar apenas transações do profissional
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      whereClause.professionalId = professional!.id
    }

    // Aplicar filtros
    if (validatedQuery.status) {
      whereClause.status = validatedQuery.status
    }

    if (validatedQuery.method) {
      whereClause.method = validatedQuery.method
    }

    if (validatedQuery.startDate || validatedQuery.endDate) {
      whereClause.createdAt = {}
      if (validatedQuery.startDate) {
        whereClause.createdAt.gte = new Date(validatedQuery.startDate)
      }
      if (validatedQuery.endDate) {
        whereClause.createdAt.lte = new Date(validatedQuery.endDate)
      }
    }

    // Busca por texto (cliente ou ID da transação)
    if (validatedQuery.search) {
      whereClause.OR = [
        {
          id: {
            contains: validatedQuery.search,
            mode: 'insensitive'
          }
        },
        {
          client: {
            name: {
              contains: validatedQuery.search,
              mode: 'insensitive'
            }
          }
        },
        {
          stripePaymentIntentId: {
            contains: validatedQuery.search,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Buscar transações
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          appointment: {
            select: {
              id: true,
              serviceName: true,
              scheduledFor: true,
              status: true
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
          disputes: {
            select: {
              id: true,
              status: true,
              reason: true,
              amount: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.transaction.count({
        where: whereClause
      })
    ])

    // Calcular estatísticas
    const stats = await prisma.transaction.groupBy({
      by: ['status'],
      where: session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' 
        ? {} 
        : { professionalId: professional!.id },
      _sum: {
        amount: true,
        netAmount: true,
        feeAmount: true
      },
      _count: {
        id: true
      }
    })

    // Estatísticas do mês atual
    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)

    const monthlyStats = await prisma.transaction.aggregate({
      where: {
        ...(session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' 
          ? {} 
          : { professionalId: professional!.id }),
        createdAt: {
          gte: currentMonthStart
        }
      },
      _sum: {
        amount: true,
        netAmount: true,
        feeAmount: true
      },
      _count: {
        id: true
      }
    })

    // Formatear dados para resposta
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      netAmount: transaction.netAmount,
      feeAmount: transaction.feeAmount,
      currency: transaction.currency,
      method: transaction.method,
      status: transaction.status,
      paidAt: transaction.paidAt,
      expiresAt: transaction.expiresAt,
      createdAt: transaction.createdAt,
      client: transaction.client,
      appointment: transaction.appointment,
      professional: session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' 
        ? transaction.professional 
        : undefined,
      disputes: transaction.disputes,
      metadata: transaction.metadata
    }))

    // Estatísticas consolidadas
    const consolidatedStats = {
      total: {
        transactions: stats.reduce((acc, curr) => acc + curr._count.id, 0),
        amount: stats.reduce((acc, curr) => acc + (curr._sum.amount || 0), 0),
        netAmount: stats.reduce((acc, curr) => acc + (curr._sum.netAmount || 0), 0),
        feeAmount: stats.reduce((acc, curr) => acc + (curr._sum.feeAmount || 0), 0)
      },
      monthly: {
        transactions: monthlyStats._count.id,
        amount: monthlyStats._sum.amount || 0,
        netAmount: monthlyStats._sum.netAmount || 0,
        feeAmount: monthlyStats._sum.feeAmount || 0
      },
      byStatus: stats.reduce((acc, curr) => {
        acc[curr.status] = {
          count: curr._count.id,
          amount: curr._sum.amount || 0,
          netAmount: curr._sum.netAmount || 0
        }
        return acc
      }, {} as any)
    }

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: consolidatedStats
    })

  } catch (error) {
    console.error('Error fetching transactions:', error)

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

// Endpoint para exportar transações (CSV/Excel)
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
    const { format = 'csv', filters = {} } = body

    // Buscar o professional do usuário
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      )
    }

    // Construir where clause para export
    const whereClause: any = {}

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      whereClause.professionalId = professional!.id
    }

    // Aplicar filtros do body
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        whereClause[key] = filters[key]
      }
    })

    // Buscar todas as transações para export (limitado a 10000)
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        appointment: {
          select: {
            serviceName: true,
            scheduledFor: true,
            status: true
          }
        },
        professional: {
          select: {
            businessName: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10000 // Limite para evitar problemas de memória
    })

    // Preparar dados para export
    const exportData = transactions.map(transaction => ({
      'ID Transação': transaction.id,
      'Data': transaction.createdAt.toLocaleDateString('pt-BR'),
      'Cliente': transaction.client.name,
      'Serviço': transaction.appointment?.serviceName || 'N/A',
      'Método': transaction.method,
      'Status': transaction.status,
      'Valor (R$)': (transaction.amount / 100).toFixed(2),
      'Taxa (R$)': (transaction.feeAmount / 100).toFixed(2),
      'Valor Líquido (R$)': (transaction.netAmount / 100).toFixed(2),
      'Data Pagamento': transaction.paidAt?.toLocaleDateString('pt-BR') || 'N/A',
      'Profissional': session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' 
        ? transaction.professional.businessName || transaction.professional.user.name
        : undefined
    }))

    return NextResponse.json({
      success: true,
      format,
      data: exportData,
      count: exportData.length,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error exporting transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}