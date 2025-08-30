import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus, PaymentStatus } from '@prisma/client'

// GET - Buscar dados de analytics em tempo real
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const type = searchParams.get('type') || 'metrics'
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Buscar professional do usuário logado
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    const targetProfessionalId = professionalId || professional?.id
    if (!targetProfessionalId) {
      return NextResponse.json(
        { error: 'Professional ID é obrigatório' },
        { status: 400 }
      )
    }

    let responseData

    switch (type) {
      case 'metrics':
        // Calcular métricas do dia atual
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const startOfYesterday = new Date(yesterday)
        
        // Receita de hoje
        const todayRevenue = await prisma.appointment.aggregate({
          where: {
            professionalId: targetProfessionalId,
            scheduledFor: {
              gte: today,
              lt: tomorrow
            },
            status: AppointmentStatus.COMPLETED
          },
          _sum: {
            servicePrice: true
          }
        })
        
        // Receita de ontem
        const yesterdayRevenue = await prisma.appointment.aggregate({
          where: {
            professionalId: targetProfessionalId,
            scheduledFor: {
              gte: startOfYesterday,
              lt: today
            },
            status: AppointmentStatus.COMPLETED
          },
          _sum: {
            servicePrice: true
          }
        })
        
        // Agendamentos de hoje
        const todayAppointments = await prisma.appointment.groupBy({
          by: ['status'],
          where: {
            professionalId: targetProfessionalId,
            scheduledFor: {
              gte: today,
              lt: tomorrow
            }
          },
          _count: true
        })
        
        // Clientes totais
        const totalClients = await prisma.client.count({
          where: {
            professionalId: targetProfessionalId
          }
        })
        
        // Novos clientes hoje
        const newClientsToday = await prisma.client.count({
          where: {
            professionalId: targetProfessionalId,
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          }
        })
        
        const todayRevenueValue = todayRevenue._sum.servicePrice || 0
        const yesterdayRevenueValue = yesterdayRevenue._sum.servicePrice || 0
        const revenueGrowth = yesterdayRevenueValue > 0 
          ? ((todayRevenueValue - yesterdayRevenueValue) / yesterdayRevenueValue) * 100 
          : 0
        
        const appointmentCounts = todayAppointments.reduce((acc, curr) => {
          acc[curr.status] = curr._count
          return acc
        }, {} as Record<string, number>)
        
        const totalTodayAppointments = todayAppointments.reduce((sum, curr) => sum + curr._count, 0)
        
        responseData = {
          revenue: {
            today: todayRevenueValue,
            yesterday: yesterdayRevenueValue,
            growth: revenueGrowth,
            target: 2000.00, // TODO: buscar do perfil do profissional
            completion: todayRevenueValue / 2000 * 100
          },
          appointments: {
            today: totalTodayAppointments,
            scheduled: appointmentCounts.SCHEDULED || 0,
            completed: appointmentCounts.COMPLETED || 0,
            cancelled: appointmentCounts.CANCELLED || 0,
            growth: 12.5 // TODO: calcular crescimento real
          },
          clients: {
            total: totalClients,
            newToday: newClientsToday,
            returning: totalTodayAppointments - newClientsToday,
            satisfaction: 4.8 // TODO: implementar sistema de avaliações
          },
          performance: {
            occupancyRate: 87.5, // TODO: calcular com base nos horários de funcionamento
            averageService: 45,   // TODO: calcular média real de duração
            waitTime: 8,          // TODO: implementar tracking de tempo de espera
            efficiency: 94.2      // TODO: calcular eficiência real
          }
        }
        break

      case 'historical':
        const historicalData = []
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const startOfDay = new Date(date.setHours(0, 0, 0, 0))
          const endOfDay = new Date(date.setHours(23, 59, 59, 999))
          
          const [dayRevenue, dayAppointments, dayClients] = await Promise.all([
            // Receita do dia
            prisma.appointment.aggregate({
              where: {
                professionalId: targetProfessionalId,
                scheduledFor: {
                  gte: startOfDay,
                  lte: endOfDay
                },
                status: AppointmentStatus.COMPLETED
              },
              _sum: {
                servicePrice: true
              }
            }),
            // Agendamentos do dia
            prisma.appointment.count({
              where: {
                professionalId: targetProfessionalId,
                scheduledFor: {
                  gte: startOfDay,
                  lte: endOfDay
                }
              }
            }),
            // Clientes únicos do dia
            prisma.appointment.findMany({
              where: {
                professionalId: targetProfessionalId,
                scheduledFor: {
                  gte: startOfDay,
                  lte: endOfDay
                }
              },
              select: {
                clientId: true
              },
              distinct: ['clientId']
            })
          ])
          
          historicalData.push({
            date: startOfDay.toISOString().split('T')[0],
            revenue: dayRevenue._sum.servicePrice || 0,
            appointments: dayAppointments,
            clients: dayClients.length,
            satisfaction: 4.2 + Math.random() * 0.8 // TODO: implementar sistema de avaliações
          })
        }
        
        responseData = historicalData
        break

      case 'services':
        // Buscar estatísticas dos serviços
        const servicesStats = await prisma.appointment.groupBy({
          by: ['serviceName'],
          where: {
            professionalId: targetProfessionalId,
            status: AppointmentStatus.COMPLETED,
            scheduledFor: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
          },
          _count: true,
          _sum: {
            servicePrice: true
          }
        })
        
        // Calcular crescimento (comparar com período anterior)
        const previousPeriodStats = await prisma.appointment.groupBy({
          by: ['serviceName'],
          where: {
            professionalId: targetProfessionalId,
            status: AppointmentStatus.COMPLETED,
            scheduledFor: {
              gte: new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000),
              lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
          },
          _count: true
        })
        
        const previousPeriodMap = previousPeriodStats.reduce((acc, stat) => {
          acc[stat.serviceName] = stat._count
          return acc
        }, {} as Record<string, number>)
        
        responseData = servicesStats
          .map(stat => {
            const previousCount = previousPeriodMap[stat.serviceName] || 0
            const growth = previousCount > 0 
              ? ((stat._count - previousCount) / previousCount) * 100 
              : stat._count > 0 ? 100 : 0
              
            return {
              name: stat.serviceName,
              count: stat._count,
              revenue: stat._sum.servicePrice || 0,
              growth
            }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
        break

      case 'segmentation':
        // Calcular segmentação baseada em pontos de fidelidade e frequência
        const [vipClients, loyalClients, occasionalClients, totalClientCount] = await Promise.all([
          // Clientes VIP (100+ pontos de fidelidade)
          prisma.client.count({
            where: {
              professionalId: targetProfessionalId,
              loyaltyPoints: {
                gte: 100
              }
            }
          }),
          // Clientes Fiéis (20-99 pontos)
          prisma.client.count({
            where: {
              professionalId: targetProfessionalId,
              loyaltyPoints: {
                gte: 20,
                lt: 100
              }
            }
          }),
          // Clientes Ocasionais (0-19 pontos)
          prisma.client.count({
            where: {
              professionalId: targetProfessionalId,
              loyaltyPoints: {
                lt: 20
              }
            }
          }),
          // Total de clientes
          prisma.client.count({
            where: {
              professionalId: targetProfessionalId
            }
          })
        ])
        
        // Calcular receita por segmento (baseado em agendamentos dos últimos 30 dias)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        
        const [vipRevenue, loyalRevenue, occasionalRevenue] = await Promise.all([
          // Receita VIP
          prisma.appointment.aggregate({
            where: {
              professionalId: targetProfessionalId,
              status: AppointmentStatus.COMPLETED,
              scheduledFor: {
                gte: thirtyDaysAgo
              },
              client: {
                loyaltyPoints: {
                  gte: 100
                }
              }
            },
            _sum: {
              servicePrice: true
            }
          }),
          // Receita Fiéis
          prisma.appointment.aggregate({
            where: {
              professionalId: targetProfessionalId,
              status: AppointmentStatus.COMPLETED,
              scheduledFor: {
                gte: thirtyDaysAgo
              },
              client: {
                loyaltyPoints: {
                  gte: 20,
                  lt: 100
                }
              }
            },
            _sum: {
              servicePrice: true
            }
          }),
          // Receita Ocasionais
          prisma.appointment.aggregate({
            where: {
              professionalId: targetProfessionalId,
              status: AppointmentStatus.COMPLETED,
              scheduledFor: {
                gte: thirtyDaysAgo
              },
              client: {
                loyaltyPoints: {
                  lt: 20
                }
              }
            },
            _sum: {
              servicePrice: true
            }
          })
        ])
        
        const vipRevenueValue = vipRevenue._sum.servicePrice || 0
        const loyalRevenueValue = loyalRevenue._sum.servicePrice || 0
        const occasionalRevenueValue = occasionalRevenue._sum.servicePrice || 0
        
        responseData = [
          {
            segment: 'Clientes VIP',
            count: vipClients,
            percentage: totalClientCount > 0 ? (vipClients / totalClientCount) * 100 : 0,
            revenue: vipRevenueValue,
            avgTicket: vipClients > 0 ? vipRevenueValue / vipClients : 0,
            color: '#8B5CF6'
          },
          {
            segment: 'Clientes Fiéis',
            count: loyalClients,
            percentage: totalClientCount > 0 ? (loyalClients / totalClientCount) * 100 : 0,
            revenue: loyalRevenueValue,
            avgTicket: loyalClients > 0 ? loyalRevenueValue / loyalClients : 0,
            color: '#3B82F6'
          },
          {
            segment: 'Clientes Ocasionais',
            count: occasionalClients,
            percentage: totalClientCount > 0 ? (occasionalClients / totalClientCount) * 100 : 0,
            revenue: occasionalRevenueValue,
            avgTicket: occasionalClients > 0 ? occasionalRevenueValue / occasionalClients : 0,
            color: '#10B981'
          }
        ]
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de dados não suportado' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Erro no analytics realtime:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}