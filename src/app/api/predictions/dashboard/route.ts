import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { NoShowPredictor } from '@/lib/no-show-prediction'
import { RiskScoringSystem } from '@/lib/risk-scoring-system'
import { AutomatedInterventionSystem } from '@/lib/automated-intervention-system'

const prisma = new PrismaClient()

// GET - Buscar dados do dashboard de predições
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!professionalId) {
      return NextResponse.json(
        { error: 'Professional ID é obrigatório' },
        { status: 400 }
      )
    }

    const targetDate = new Date(date)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    // Buscar agendamentos do dia
    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        scheduledFor: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      },
      include: {
        client: true
      },
      orderBy: {
        scheduledFor: 'asc'
      }
    })

    // Buscar histórico de todos os clientes do dia
    const clientIds = appointments.map(apt => apt.clientId)
    const clientHistories = await Promise.all(
      clientIds.map(async (clientId) => {
        const history = await prisma.appointment.findMany({
          where: {
            clientId,
            professionalId,
            scheduledFor: {
              lt: startOfDay
            }
          },
          orderBy: {
            scheduledFor: 'desc'
          }
        })
        return { clientId, history }
      })
    )

    const predictor = new NoShowPredictor()
    const riskScoring = new RiskScoringSystem()
    const interventionSystem = new AutomatedInterventionSystem()

    // Analisar cada agendamento
    const predictions = await Promise.all(
      appointments.map(async (appointment) => {
        const clientHistory = clientHistories.find(
          h => h.clientId === appointment.clientId
        )?.history || []

        // Simular dados de engajamento (em produção viriam do banco)
        const engagementData = {
          lastWhatsAppResponse: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          responseRate: 0.7 + Math.random() * 0.3,
          avgResponseTime: Math.random() * 120 + 10 // minutos
        }

        // Gerar predição
        const prediction = await predictor.predictNoShow({
          appointment,
          clientHistory,
          engagementData
        })

        // Calcular score de risco
        const riskScore = riskScoring.calculateRiskScore({
          clientId: appointment.clientId,
          appointmentHistory: clientHistory,
          currentAppointment: appointment,
          engagementMetrics: engagementData
        })

        // Obter recomendações de intervenção
        const interventions = interventionSystem.getRecommendedActions(
          riskScore.score,
          {
            timeUntilAppointment: appointment.scheduledFor.getTime() - Date.now(),
            clientSegment: riskScore.segment,
            lastNoShowDate: clientHistory.find(h => h.status === 'NO_SHOW')?.scheduledFor,
            hasWhatsApp: true,
            preferredContact: 'whatsapp'
          }
        )

        return {
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          clientName: appointment.client.name,
          clientPhone: appointment.client.phone,
          clientEmail: appointment.client.email,
          serviceName: appointment.serviceName,
          servicePrice: appointment.price,
          scheduledFor: appointment.scheduledFor,
          prediction: {
            probability: prediction.probability,
            confidence: prediction.confidence,
            riskLevel: prediction.riskLevel,
            factors: prediction.factors
          },
          riskScore: {
            score: riskScore.score,
            segment: riskScore.segment,
            trends: riskScore.trends,
            factors: riskScore.factors
          },
          recommendedActions: interventions.actions,
          interventionPriority: interventions.priority,
          potentialLoss: appointment.price || 0,
          clientStats: {
            totalAppointments: clientHistory.length + 1,
            noShowCount: clientHistory.filter(h => h.status === 'NO_SHOW').length,
            lastAppointment: clientHistory[0]?.scheduledFor || null,
            averageSpending: clientHistory.reduce((sum, h) => sum + (h.price || 0), 0) / Math.max(clientHistory.length, 1)
          }
        }
      })
    )

    // Separar por nível de risco
    const highRisk = predictions.filter(p => p.riskScore.score >= 70)
    const mediumRisk = predictions.filter(p => p.riskScore.score >= 40 && p.riskScore.score < 70)
    const lowRisk = predictions.filter(p => p.riskScore.score < 40)

    // Calcular estatísticas do dia
    const totalRevenue = predictions.reduce((sum, p) => sum + p.potentialLoss, 0)
    const potentialLoss = highRisk.reduce((sum, p) => sum + p.potentialLoss, 0)
    const averageRiskScore = predictions.reduce((sum, p) => sum + p.riskScore.score, 0) / predictions.length

    // Buscar intervenções já executadas hoje
    const existingInterventions = await prisma.notification.findMany({
      where: {
        professionalId,
        type: 'MARKETING',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        title: {
          contains: 'Intervenção'
        }
      }
    })

    const dashboardData = {
      date: date,
      summary: {
        totalAppointments: predictions.length,
        highRiskCount: highRisk.length,
        mediumRiskCount: mediumRisk.length,
        lowRiskCount: lowRisk.length,
        totalRevenue,
        potentialLoss,
        averageRiskScore: Math.round(averageRiskScore),
        interventionsExecuted: existingInterventions.length
      },
      riskSegments: {
        high: highRisk.sort((a, b) => b.riskScore.score - a.riskScore.score),
        medium: mediumRisk.sort((a, b) => b.riskScore.score - a.riskScore.score),
        low: lowRisk.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
      },
      recommendations: {
        urgentActions: highRisk.filter(p => p.interventionPriority === 'high').length,
        suggestedInterventions: highRisk.slice(0, 5).map(p => ({
          clientName: p.clientName,
          action: p.recommendedActions[0]?.type || 'contact',
          reason: `Score de risco: ${p.riskScore.score}%`,
          expectedImpact: `Reduzir risco em ${Math.round(p.riskScore.score * 0.3)}%`
        }))
      },
      trends: {
        riskTrend: 'stable', // Em produção, comparar com dias anteriores
        interventionEffectiveness: 0.75, // Dados históricos de eficácia
        noShowPrevention: Math.round(highRisk.length * 0.3) // Estimativa de prevenções
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Executar ação de intervenção
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { appointmentId, actionType, customMessage, professionalId } = body

    if (!appointmentId || !actionType || !professionalId) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Buscar agendamento
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    const interventionSystem = new AutomatedInterventionSystem()

    // Executar intervenção
    const result = await interventionSystem.executeIntervention({
      clientId: appointment.clientId,
      clientName: appointment.client.name,
      clientPhone: appointment.client.phone || '',
      clientEmail: appointment.client.email || '',
      appointmentId,
      appointmentDate: appointment.scheduledFor,
      serviceName: appointment.serviceName,
      actionType,
      customMessage,
      riskScore: 75 // Em produção, calcular o score atual
    })

    // Registrar a ação no banco
    await prisma.notification.create({
      data: {
        id: `intervention_${Date.now()}`,
        professionalId,
        appointmentId,
        type: 'MARKETING',
        title: `Intervenção: ${actionType}`,
        message: `Ação executada para ${appointment.client.name} - ${result.message}`,
        channel: result.success ? 'dashboard' : 'error',
        recipient: appointment.client.email || '',
        metadata: {
          actionType,
          executedAt: new Date(),
          success: result.success,
          customMessage
        }
      }
    })

    return NextResponse.json({
      success: result.success,
      message: result.message,
      actionType,
      executedAt: new Date()
    })

  } catch (error) {
    console.error('Erro ao executar intervenção:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}