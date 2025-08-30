'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PieChart,
  BarChart3,
  Target,
  Calculator,
  Percent,
  CreditCard,
  Wallet,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Plus,
  Download,
  RefreshCw
} from 'lucide-react'
import { 
  FinancialMetrics, 
  ProfitabilityAnalysis, 
  ClientSegmentFinancials, 
  FinancialGoals 
} from '@/lib/financial-analytics'

interface FinancialDashboardProps {
  professionalId: string
}

export function FinancialDashboard({ professionalId }: FinancialDashboardProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [profitability, setProfitability] = useState<ProfitabilityAnalysis[]>([])
  const [segments, setSegments] = useState<ClientSegmentFinancials[]>([])
  const [goals, setGoals] = useState<FinancialGoals[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')

  const loadFinancialData = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/analytics/financial?professionalId=${professionalId}&type=complete`
      )
      
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.data.overview)
        setProfitability(data.data.profitability)
        setSegments(data.data.segments)
        setGoals(data.data.goals)
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinancialData()
  }, [professionalId])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-500" />
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-500" />
    return <div className="w-4 h-4" />
  }

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-100'
      case 'behind': return 'text-yellow-600 bg-yellow-100'
      case 'ahead': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getGoalStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircle className="w-4 h-4" />
      case 'behind': return <AlertTriangle className="w-4 h-4" />
      case 'ahead': return <TrendingUp className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise Financeira</h2>
          <p className="text-gray-600">Visão completa da saúde financeira do seu negócio</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadFinancialData}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Receita Bruta */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Receita Bruta</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {formatCurrency(metrics.revenue.gross)}
            </div>
            <div className="flex items-center gap-1">
              {getGrowthIcon(metrics.revenue.growth)}
              <span className={`text-sm ${getGrowthColor(metrics.revenue.growth)}`}>
                {formatPercentage(metrics.revenue.growth)} vs mês anterior
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Receita Líquida */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Receita Líquida</span>
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {formatCurrency(metrics.revenue.net)}
            </div>
            <div className="text-sm text-gray-600">
              Margem: {metrics.profitability.netMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {/* Margem Bruta */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Margem Bruta</span>
              <Percent className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {metrics.profitability.grossMargin.toFixed(1)}%
            </div>
            <Progress value={metrics.profitability.grossMargin} className="h-2" />
          </CardContent>
        </Card>

        {/* ROI */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">ROI</span>
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {metrics.profitability.roi.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              LTV/CAC: {metrics.clientMetrics.ltvCacRatio.toFixed(1)}x
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projeções */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Projeções de Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Próximo Mês</span>
                <span className="font-semibold">
                  {formatCurrency(metrics.revenue.projections.nextMonth)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Próximo Trimestre</span>
                <span className="font-semibold">
                  {formatCurrency(metrics.revenue.projections.nextQuarter)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Final do Ano</span>
                <span className="font-semibold text-beauty-purple-600">
                  {formatCurrency(metrics.revenue.projections.yearEnd)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Métricas de Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">LTV Médio</span>
                <span className="font-semibold">
                  {formatCurrency(metrics.clientMetrics.ltv)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CAC</span>
                <span className="font-semibold">
                  {formatCurrency(metrics.clientMetrics.cac)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payback</span>
                <span className="font-semibold">
                  {metrics.clientMetrics.paybackPeriod.toFixed(1)} meses
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Churn Rate</span>
                <span className="font-semibold text-red-600">
                  {metrics.clientMetrics.churnRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Operacional</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(metrics.cashFlow.operating)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Investimentos</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(metrics.cashFlow.investing)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Financiamentos</span>
                <span className="font-semibold">
                  {formatCurrency(metrics.cashFlow.financing)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-sm font-medium">Cash Flow Livre</span>
                <span className={`font-bold ${metrics.cashFlow.free >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.cashFlow.free)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas com Análises Detalhadas */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Custos</TabsTrigger>
          <TabsTrigger value="profitability">Rentabilidade</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <CostsTab costs={metrics.costs} />
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <ProfitabilityTab profitability={profitability} />
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <SegmentsTab segments={segments} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <GoalsTab goals={goals} onUpdateGoal={() => loadFinancialData()} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componentes das abas
function CostsTab({ costs }: { costs: FinancialMetrics['costs'] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Estrutura de Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Custos Fixos</span>
              <span className="font-semibold">R$ {costs.fixed.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Custos Variáveis</span>
              <span className="font-semibold">R$ {costs.variable.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="font-medium">Total</span>
              <span className="font-bold text-beauty-purple-600">
                R$ {costs.total.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown de Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costs.breakdown.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">R$ {item.amount.toLocaleString('pt-BR')}</span>
                    <span className={`text-xs ${item.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.trend >= 0 ? '+' : ''}{item.trend}%
                    </span>
                  </div>
                </div>
                <Progress value={item.percentage} className="h-2" />
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfitabilityTab({ profitability }: { profitability: ProfitabilityAnalysis[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Rentabilidade por Serviço
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {profitability.map((service, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{service.service}</h4>
                <Badge variant="outline" className="text-beauty-purple-600">
                  {service.volume} agendamentos
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Receita</span>
                  <div className="font-semibold">R$ {service.revenue.toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Margem</span>
                  <div className={`font-semibold ${service.margin >= 50 ? 'text-green-600' : service.margin >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {service.margin.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Preço Médio</span>
                  <div className="font-semibold">R$ {service.avgPrice.toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Contribuição</span>
                  <div className="font-semibold">{service.contribution.toFixed(1)}%</div>
                </div>
              </div>
              
              <div className="mt-3">
                <Progress value={service.margin} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SegmentsTab({ segments }: { segments: ClientSegmentFinancials[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {segments.map((segment, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {segment.segment}
              <Badge variant="outline">{segment.clientCount} clientes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Receita Total</span>
                <span className="font-semibold">R$ {segment.revenue.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">LTV Médio</span>
                <span className="font-semibold">R$ {segment.ltv.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">CAC</span>
                <span className="font-semibold">R$ {segment.cac.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Margem</span>
                <span className="font-semibold">{segment.margin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Retenção</span>
                <span className="font-semibold">{segment.retention.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Crescimento</span>
                <span className={`font-semibold ${segment.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {segment.growth >= 0 ? '+' : ''}{segment.growth.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function GoalsTab({ goals, onUpdateGoal }: { goals: FinancialGoals[]; onUpdateGoal: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Metas Financeiras</h3>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{goal.type === 'ltv' ? 'LTV' : goal.type}</span>
                <div className="flex items-center gap-2">
                  <Badge className={`${getGoalStatusColor(goal.status)} border`}>
                    {getGoalStatusIcon(goal.status)}
                    <span className="ml-1">
                      {goal.status === 'on_track' ? 'No prazo' : 
                       goal.status === 'behind' ? 'Atrasado' : 'Adiantado'}
                    </span>
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Progresso</span>
                    <span className="text-sm font-medium">{goal.progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(goal.progress, 100)} className="h-3" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Atual</span>
                    <div className="font-semibold">
                      {goal.type === 'revenue' || goal.type === 'profit' || goal.type === 'ltv' 
                        ? `R$ ${goal.current.toLocaleString('pt-BR')}`
                        : goal.current.toLocaleString('pt-BR')
                      }
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Meta</span>
                    <div className="font-semibold">
                      {goal.type === 'revenue' || goal.type === 'profit' || goal.type === 'ltv'
                        ? `R$ ${goal.target.toLocaleString('pt-BR')}`
                        : goal.target.toLocaleString('pt-BR')
                      }
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}