import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CustomerInsightsEngine } from '@/lib/customer-insights'

const insightsEngine = new CustomerInsightsEngine()

// GET - Buscar insights de clientes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const type = searchParams.get('type') || 'complete'

    if (!professionalId) {
      return NextResponse.json(
        { error: 'Professional ID é obrigatório' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'complete':
        const insights = await insightsEngine.getCustomerInsights(professionalId)
        return NextResponse.json({
          success: true,
          data: insights,
          timestamp: new Date().toISOString(),
          metadata: {
            lastAnalysis: new Date().toISOString(),
            dataQuality: 0.92,
            coveragePeriod: '6 meses',
            algorithmsUsed: ['churn_prediction', 'upsell_detection', 'behavior_analysis']
          }
        })

      case 'churn':
        const fullInsights = await insightsEngine.getCustomerInsights(professionalId)
        return NextResponse.json({
          success: true,
          data: fullInsights.churnAnalysis,
          timestamp: new Date().toISOString()
        })

      case 'upsell':
        const upsellInsights = await insightsEngine.getCustomerInsights(professionalId)
        return NextResponse.json({
          success: true,
          data: upsellInsights.upsellOpportunities,
          timestamp: new Date().toISOString()
        })

      case 'behavior':
        const behaviorInsights = await insightsEngine.getCustomerInsights(professionalId)
        return NextResponse.json({
          success: true,
          data: behaviorInsights.behaviorAnalysis,
          timestamp: new Date().toISOString()
        })

      case 'actions':
        const actionInsights = await insightsEngine.getCustomerInsights(professionalId)
        return NextResponse.json({
          success: true,
          data: actionInsights.actionableInsights,
          timestamp: new Date().toISOString()
        })

      case 'summary':
        // Resumo executivo para dashboard
        const summaryInsights = await insightsEngine.getCustomerInsights(professionalId)
        const summary = {
          overview: summaryInsights.overview,
          topRisks: summaryInsights.churnAnalysis.churnPredictions.slice(0, 5),
          topOpportunities: summaryInsights.upsellOpportunities.opportunities.slice(0, 5),
          urgentActions: summaryInsights.actionableInsights.urgentActions.slice(0, 3),
          keyMetrics: {
            churnRate: summaryInsights.overview.churnRate,
            avgLifespan: summaryInsights.overview.averageLifespan,
            activeClients: summaryInsights.overview.activeClients,
            upsellPotential: summaryInsights.upsellOpportunities.opportunities.reduce(
              (sum: number, o: any) => sum + o.uplifPotential, 0
            ) / Math.max(summaryInsights.upsellOpportunities.opportunities.length, 1)
          }
        }

        return NextResponse.json({
          success: true,
          data: summary,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Tipo inválido. Use: complete, churn, upsell, behavior, actions ou summary' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Erro ao buscar insights de clientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Executar ação baseada em insight
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      professionalId, 
      actionType, 
      targetClients, 
      parameters,
      priority
    } = body

    if (!professionalId || !actionType || !targetClients) {
      return NextResponse.json(
        { error: 'Professional ID, actionType e targetClients são obrigatórios' },
        { status: 400 }
      )
    }

    // Simular execução da ação
    const actionResult = await executeInsightAction(
      actionType, 
      targetClients, 
      parameters, 
      professionalId
    )

    return NextResponse.json({
      success: true,
      actionId: `action_${Date.now()}`,
      message: 'Ação executada com sucesso',
      results: actionResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro ao executar ação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para executar ações
async function executeInsightAction(
  actionType: string, 
  targetClients: string[], 
  parameters: any,
  professionalId: string
) {
  switch (actionType) {
    case 'churn_prevention':
      return {
        type: 'Prevenção de Churn',
        clientsContacted: targetClients.length,
        method: parameters?.method || 'WhatsApp + Email',
        expectedRetention: '70%',
        cost: targetClients.length * 5,
        timeline: '24-48h',
        nextActions: [
          'Acompanhar respostas em 48h',
          'Agendar follow-up para não responsivos',
          'Medir taxa de retenção em 30 dias'
        ]
      }

    case 'upsell_campaign':
      return {
        type: 'Campanha de Upsell',
        targetClients: targetClients.length,
        offers: parameters?.offers || ['Pacote Premium', 'Serviço Adicional'],
        expectedConversion: '25%',
        potentialRevenue: targetClients.length * (parameters?.avgUplift || 100),
        timeline: '1-2 semanas',
        tracking: [
          'Taxa de abertura das ofertas',
          'Conversão por tipo de oferta',
          'Receita incremental gerada'
        ]
      }

    case 'engagement_boost':
      return {
        type: 'Aumento de Engajamento',
        activations: targetClients.length,
        tactics: ['Conteúdo personalizado', 'Ofertas exclusivas', 'Check-ins regulares'],
        expectedEngagement: '+40%',
        duration: '30 dias',
        kpis: [
          'Aumento na frequência de visitas',
          'Melhoria no Net Promoter Score',
          'Redução no tempo de resposta'
        ]
      }

    case 'loyalty_program_invite':
      return {
        type: 'Convite Programa de Fidelidade',
        invitations: targetClients.length,
        tier: parameters?.tier || 'Premium',
        benefits: ['Descontos exclusivos', 'Prioridade na agenda', 'Brindes especiais'],
        expectedJoinRate: '60%',
        implementation: 'Imediato',
        tracking: ['Taxa de adesão', 'Ativação dos benefícios', 'Satisfação do programa']
      }

    case 'personalized_offers':
      return {
        type: 'Ofertas Personalizadas',
        offers: targetClients.length,
        personalization: 'Baseada em histórico e preferências',
        channels: ['WhatsApp', 'Email', 'Push Notification'],
        expectedResponse: '35%',
        duration: '7 dias',
        optimization: [
          'A/B test de mensagens',
          'Timing otimizado por cliente',
          'Segmentação por comportamento'
        ]
      }

    default:
      return {
        type: 'Ação Genérica',
        executed: true,
        targetClients: targetClients.length,
        status: 'Em andamento',
        nextSteps: ['Monitorar resultados', 'Ajustar estratégia conforme necessário']
      }
  }
}