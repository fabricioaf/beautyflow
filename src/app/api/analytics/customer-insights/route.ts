import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Buscar dados de customer insights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')

    if (!professionalId) {
      return NextResponse.json(
        { error: 'Professional ID é obrigatório' },
        { status: 400 }
      )
    }

    // Em produção, estes dados viriam do banco com análises reais
    const insightsData = {
      demographics: {
        totalClients: 342,
        newClientsThisMonth: 28,
        averageAge: 32.5,
        genderDistribution: { male: 15, female: 82, other: 3 },
        topNeighborhoods: [
          { name: 'Centro', count: 45, percentage: 13.2 },
          { name: 'Jardins', count: 38, percentage: 11.1 },
          { name: 'Vila Nova', count: 32, percentage: 9.4 },
          { name: 'Copacabana', count: 28, percentage: 8.2 }
        ]
      },
      behaviorAnalysis: {
        averageFrequency: 2.3,
        seasonality: [
          { month: 'Jan', visits: 245, change: 8 },
          { month: 'Fev', visits: 268, change: 12 },
          { month: 'Mar', visits: 291, change: 9 },
          { month: 'Abr', visits: 315, change: 15 }
        ],
        preferredTimes: [
          { hour: 9, popularity: 65 },
          { hour: 14, popularity: 85 },
          { hour: 16, popularity: 92 },
          { hour: 19, popularity: 78 }
        ],
        servicePreferences: [
          { service: 'Corte + Escova', popularity: 78, growth: 5 },
          { service: 'Manicure', popularity: 65, growth: 12 },
          { service: 'Coloração', popularity: 52, growth: 18 },
          { service: 'Tratamento Capilar', popularity: 38, growth: 25 }
        ]
      },
      loyaltyMetrics: {
        averageLifetime: 18.2,
        retentionRate: 78.5,
        churnRate: 12.3,
        loyaltySegments: [
          {
            segment: 'Clientes VIP',
            count: 45,
            percentage: 13.2,
            averageSpending: 450.00,
            characteristics: ['Frequência alta', 'Gasto elevado', 'Fidelidade >2 anos']
          },
          {
            segment: 'Clientes Fiéis',
            count: 128,
            percentage: 37.4,
            averageSpending: 280.00,
            characteristics: ['Regularidade', 'Engajamento alto', 'Recomendações']
          },
          {
            segment: 'Clientes Ocasionais',
            count: 169,
            percentage: 49.4,
            averageSpending: 150.00,
            characteristics: ['Visitas esporádicas', 'Preço-sensível', 'Sazonalidade']
          }
        ]
      },
      satisfactionData: {
        averageRating: 4.7,
        npsScore: 82,
        feedbackTrends: [
          { period: 'Jan', rating: 4.5, count: 89 },
          { period: 'Fev', rating: 4.6, count: 95 },
          { period: 'Mar', rating: 4.7, count: 102 },
          { period: 'Abr', rating: 4.8, count: 98 }
        ],
        commonCompliments: [
          { text: 'Atendimento excepcional', frequency: 156 },
          { text: 'Qualidade dos serviços', frequency: 142 },
          { text: 'Ambiente acolhedor', frequency: 98 },
          { text: 'Pontualidade', frequency: 87 }
        ],
        improvementAreas: [
          { area: 'Tempo de espera', mentions: 23, priority: 'high' },
          { area: 'Variedade de produtos', mentions: 18, priority: 'medium' },
          { area: 'Estacionamento', mentions: 12, priority: 'low' }
        ]
      },
      revenueInsights: {
        averageTicket: 185.50,
        ticketTrend: 8.3,
        lifetimeValue: 2340.00,
        topSpenders: [
          {
            clientId: '1',
            name: 'Isabella Rodriguez',
            totalSpent: 4850.00,
            averageTicket: 320.00,
            lastVisit: new Date('2024-01-28'),
            loyaltyLevel: 'VIP'
          },
          {
            clientId: '2',
            name: 'Sofia Martinez',
            totalSpent: 3920.00,
            averageTicket: 280.00,
            lastVisit: new Date('2024-01-25'),
            loyaltyLevel: 'VIP'
          },
          {
            clientId: '3',
            name: 'Carmen Silva',
            totalSpent: 3450.00,
            averageTicket: 245.00,
            lastVisit: new Date('2024-01-30'),
            loyaltyLevel: 'Fiel'
          }
        ]
      },
      personalizedRecommendations: [
        {
          type: 'retention',
          title: 'Programa de Fidelidade Personalizado',
          description: 'Criar ofertas especiais para clientes VIP baseadas em histórico',
          targetClients: 45,
          expectedImpact: '+15% retenção',
          priority: 'high',
          actionItems: ['Criar tier VIP', 'Descontos exclusivos', 'Atendimento prioritário']
        },
        {
          type: 'upselling',
          title: 'Cross-selling de Tratamentos',
          description: 'Oferecer tratamentos complementares para clientes de corte',
          targetClients: 128,
          expectedImpact: '+22% ticket médio',
          priority: 'high',
          actionItems: ['Treinamento da equipe', 'Material promocional', 'Pacotes combo']
        },
        {
          type: 'reactivation',
          title: 'Campanha de Reativação',
          description: 'Reconquistar clientes que não visitam há mais de 3 meses',
          targetClients: 67,
          expectedImpact: '+8% base ativa',
          priority: 'medium',
          actionItems: ['WhatsApp personalizado', 'Desconto de volta', 'Novo serviço']
        }
      ]
    }

    return NextResponse.json({
      success: true,
      data: insightsData
    })
  } catch (error) {
    console.error('Erro no customer insights:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}