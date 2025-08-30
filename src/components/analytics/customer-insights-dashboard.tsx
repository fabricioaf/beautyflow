'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, TrendingUp, Heart, Star, DollarSign, Lightbulb,
  RefreshCw, Download, Filter, ArrowUp, ArrowDown
} from 'lucide-react'

interface CustomerInsightsDashboardProps {
  professionalId: string
}

export function CustomerInsightsDashboard({ professionalId }: CustomerInsightsDashboardProps) {
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')

  const loadInsightsData = async () => {
    setLoading(true)
    try {
      // Dados de demonstração
      setInsights({
        totalClients: 342,
        newClientsThisMonth: 28,
        retentionRate: 78.5,
        npsScore: 82,
        averageTicket: 185.50,
        ticketTrend: 8.3,
        loyaltySegments: [
          { segment: 'VIP', count: 45, percentage: 13.2, spending: 450.00 },
          { segment: 'Fiéis', count: 128, percentage: 37.4, spending: 280.00 },
          { segment: 'Ocasionais', count: 169, percentage: 49.4, spending: 150.00 }
        ],
        recommendations: [
          {
            type: 'retention',
            title: 'Programa de Fidelidade VIP',
            description: 'Criar benefícios exclusivos para top clientes',
            impact: '+15% retenção',
            priority: 'high'
          },
          {
            type: 'upselling',
            title: 'Cross-selling Inteligente',
            description: 'Recomendar serviços complementares automaticamente',
            impact: '+22% ticket médio',
            priority: 'high'
          }
        ]
      })
    } catch (error) {
      console.error('Erro ao carregar insights:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInsightsData()
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
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

  if (!insights) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Insights</h2>
          <p className="text-gray-600">Análise profunda do comportamento dos seus clientes</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadInsightsData}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total de Clientes</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold mb-1">{insights.totalClients}</div>
            <div className="text-sm text-green-600">+{insights.newClientsThisMonth} este mês</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Taxa de Retenção</span>
              <Heart className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold mb-1">{insights.retentionRate}%</div>
            <div className="text-sm text-gray-600">Muito bom</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">NPS Score</span>
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold mb-1">{insights.npsScore}</div>
            <div className="text-sm text-gray-600">Excelente</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Ticket Médio</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold mb-1">{formatCurrency(insights.averageTicket)}</div>
            <div className="flex items-center gap-1">
              <ArrowUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">{formatPercentage(insights.ticketTrend)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segmentos de Fidelidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Segmentos de Fidelidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.loyaltySegments.map((segment: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{segment.segment}</h4>
                  <Badge variant="outline">{segment.count} clientes</Badge>
                </div>
                
                <div className="mb-3">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {formatCurrency(segment.spending)}
                  </div>
                  <div className="text-sm text-gray-600">Gasto médio</div>
                </div>

                <Progress value={segment.percentage} className="mb-2" />
                <div className="text-xs text-gray-600">
                  {segment.percentage.toFixed(1)}% da base
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recomendações Inteligentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-orange-600" />
            Recomendações Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.recommendations.map((rec: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{rec.title}</h4>
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority === 'high' ? 'Alta' : 'Média'} Prioridade
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm mb-2">{rec.description}</p>
                <div className="text-sm font-medium text-green-600">
                  Impacto esperado: {rec.impact}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
