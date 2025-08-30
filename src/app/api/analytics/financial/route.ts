import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Buscar dados de analytics financeiro
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

    const financialData = {
      overview: {
        revenue: {
          gross: 85400.00,
          net: 68320.00,
          growth: 12.5
        },
        costs: {
          fixed: 15200.00,
          variable: 8850.00,
          total: 24050.00
        },
        profitability: {
          grossMargin: 80.0,
          netMargin: 75.2,
          ebitda: 64270.00
        },
        cashFlow: {
          operational: 58200.00,
          investment: -5400.00,
          financing: 2100.00,
          net: 54900.00
        }
      },
      profitability: [
        {
          service: 'Corte + Escova',
          revenue: 22500.00,
          cost: 4500.00,
          profit: 18000.00,
          margin: 80.0,
          volume: 450
        },
        {
          service: 'Coloração',
          revenue: 20160.00,
          cost: 5040.00,
          profit: 15120.00,
          margin: 75.0,
          volume: 252
        },
        {
          service: 'Tratamento Capilar',
          revenue: 17820.00,
          cost: 3564.00,
          profit: 14256.00,
          margin: 80.0,
          volume: 198
        },
        {
          service: 'Manicure',
          revenue: 11400.00,
          cost: 2280.00,
          profit: 9120.00,
          margin: 80.0,
          volume: 380
        },
        {
          service: 'Escova Progressiva',
          revenue: 13500.00,
          cost: 4050.00,
          profit: 9450.00,
          margin: 70.0,
          volume: 90
        }
      ],
      segments: [
        {
          segment: 'Clientes VIP',
          count: 45,
          revenue: 20250.00,
          avgTicket: 450.00,
          profitMargin: 85.0,
          ltv: 5400.00
        },
        {
          segment: 'Clientes Fiéis',
          count: 128,
          revenue: 35840.00,
          avgTicket: 280.00,
          profitMargin: 78.0,
          ltv: 3360.00
        },
        {
          segment: 'Clientes Ocasionais',
          count: 169,
          revenue: 25350.00,
          avgTicket: 150.00,
          profitMargin: 70.0,
          ltv: 1800.00
        }
      ],
      goals: [
        {
          id: 1,
          title: 'Receita Mensal',
          current: 68320.00,
          target: 75000.00,
          progress: 91.1,
          status: 'on_track',
          deadline: '2024-01-31'
        },
        {
          id: 2,
          title: 'Margem de Lucro',
          current: 75.2,
          target: 80.0,
          progress: 94.0,
          status: 'on_track',
          deadline: '2024-03-31'
        },
        {
          id: 3,
          title: 'Redução de Custos',
          current: 28.1,
          target: 25.0,
          progress: 78.0,
          status: 'behind',
          deadline: '2024-02-28'
        },
        {
          id: 4,
          title: 'Novos Clientes VIP',
          current: 8,
          target: 10,
          progress: 80.0,
          status: 'on_track',
          deadline: '2024-01-31'
        }
      ],
      trends: [
        { month: 'Set', revenue: 58200.00, profit: 43650.00, margin: 75.0 },
        { month: 'Out', revenue: 61300.00, profit: 45975.00, margin: 75.0 },
        { month: 'Nov', revenue: 64800.00, profit: 48600.00, margin: 75.0 },
        { month: 'Dez', revenue: 68320.00, profit: 51240.00, margin: 75.0 },
        { month: 'Jan', revenue: 72000.00, profit: 54000.00, margin: 75.0 }
      ],
      expenses: {
        categories: [
          { name: 'Salários', amount: 12000.00, percentage: 49.9 },
          { name: 'Produtos', amount: 4200.00, percentage: 17.5 },
          { name: 'Aluguel', amount: 3200.00, percentage: 13.3 },
          { name: 'Marketing', amount: 1800.00, percentage: 7.5 },
          { name: 'Equipamentos', amount: 1500.00, percentage: 6.2 },
          { name: 'Outros', amount: 1350.00, percentage: 5.6 }
        ],
        total: 24050.00,
        growth: -2.3
      }
    }

    return NextResponse.json({
      success: true,
      data: financialData
    })
  } catch (error) {
    console.error('Erro no analytics financeiro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}