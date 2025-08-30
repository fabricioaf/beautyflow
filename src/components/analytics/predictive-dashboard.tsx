'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  LineChart,
  PieChart,
  Zap,
  Clock,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react'

interface PredictiveDashboardProps {
  professionalId: string
}

interface PredictionMetrics {
  noShowProbability: {
    today: number
    tomorrow: number
    thisWeek: number
    trend: number
  }
  revenueForecasts: {
    nextWeek: number
    nextMonth: number
    quarterProjection: number
    confidence: number
  }
  clientBehaviorPredictions: {
    churnRisk: Array<{
      clientId: string
      clientName: string
      riskScore: number
      lastVisit: Date
      predictedChurnDate: Date
      preventionActions: string[]
    }>
    growthOpportunities: Array<{
      clientId: string
      clientName: string
      currentValue: number
      predictedValue: number
      growthPotential: number
      recommendedServices: string[]
    }>
  }
  demandForecasting: {
    peakHours: Array<{ hour: number; probability: number }>
    popularServices: Array<{ service: string; predictedDemand: number; growth: number }>
    seasonalTrends: Array<{ period: string; expectedChange: number }>
  }
  optimizationSuggestions: Array<{
    type: 'scheduling' | 'pricing' | 'marketing' | 'operations'
    title: string
    description: string
    expectedImpact: string
    priority: 'high' | 'medium' | 'low'
  }>
}

export function PredictiveDashboard({ professionalId }: PredictiveDashboardProps) {
  const [predictions, setPredictions] = useState<PredictionMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')

  const loadPredictiveData = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/analytics/predictive?professionalId=${professionalId}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setPredictions(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados preditivos:', error)
      // Dados de demonstração para desenvolvimento
      setPredictions({
        noShowProbability: {
          today: 12.5,
          tomorrow: 8.3,
          thisWeek: 15.2,
          trend: -3.2
        },
        revenueForecasts: {
          nextWeek: 4250.00,
          nextMonth: 18500.00,
          quarterProjection: 58200.00,
          confidence: 87.5
        },
        clientBehaviorPredictions: {
          churnRisk: [
            {
              clientId: '1',
              clientName: 'Maria Silva',
              riskScore: 78,
              lastVisit: new Date('2024-01-15'),
              predictedChurnDate: new Date('2024-03-15'),
              preventionActions: ['Desconto especial', 'Ligação personalizada']
            },
            {
              clientId: '2',
              clientName: 'Ana Costa',
              riskScore: 65,
              lastVisit: new Date('2024-01-10'),
              predictedChurnDate: new Date('2024-03-20'),
              preventionActions: ['WhatsApp de reengajamento', 'Oferta de novo serviço']
            }
          ],
          growthOpportunities: [
            {
              clientId: '3',
              clientName: 'Julia Santos',
              currentValue: 250.00,
              predictedValue: 450.00,
              growthPotential: 80,
              recommendedServices: ['Tratamento facial', 'Manicure premium']
            },
            {
              clientId: '4',
              clientName: 'Carla Oliveira',
              currentValue: 180.00,
              predictedValue: 320.00,
              growthPotential: 77,
              recommendedServices: ['Pacote de cabelo', 'Spa day']
            }
          ]
        },
        demandForecasting: {
          peakHours: [
            { hour: 9, probability: 85 },
            { hour: 14, probability: 92 },
            { hour: 16, probability: 88 },
            { hour: 19, probability: 76 }
          ],
          popularServices: [
            { service: 'Corte + Escova', predictedDemand: 45, growth: 12 },
            { service: 'Manicure', predictedDemand: 38, growth: 8 },
            { service: 'Coloração', predictedDemand: 28, growth: 15 },
            { service: 'Tratamento', predictedDemand: 22, growth: 25 }
          ],
          seasonalTrends: [
            { period: 'Verão', expectedChange: 18 },
            { period: 'Festas de fim de ano', expectedChange: 35 },
            { period: 'Volta às aulas', expectedChange: -8 },
            { period: 'Dia das Mães', expectedChange: 42 }
          ]
        },
        optimizationSuggestions: [
          {
            type: 'scheduling',
            title: 'Otimizar horários de pico',
            description: 'Redistribuir agendamentos para reduzir tempo de espera',
            expectedImpact: '+15% satisfação',
            priority: 'high'
          },
          {
            type: 'pricing',
            title: 'Ajustar preços sazonais',
            description: 'Implementar preços dinâmicos para períodos de alta demanda',
            expectedImpact: '+8% receita',
            priority: 'medium'
          },
          {
            type: 'marketing',
            title: 'Campanhas personalizadas',
            description: 'Criar ofertas específicas para clientes em risco de churn',
            expectedImpact: '-12% taxa de churn',
            priority: 'high'
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPredictiveData()
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

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-500" />
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-500" />
    return <div className="w-4 h-4" />
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

  if (!predictions) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Preditiva</h2>
          <p className="text-gray-600">Previsões inteligentes para otimizar seu negócio</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadPredictiveData}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Risco de No-Show Hoje */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Risco No-Show Hoje</span>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {predictions.noShowProbability.today.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1">
              {getGrowthIcon(predictions.noShowProbability.trend)}
              <span className={`text-sm ${predictions.noShowProbability.trend < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(predictions.noShowProbability.trend)} vs ontem
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Previsão de Receita Próxima Semana */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Receita Próxima Semana</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {formatCurrency(predictions.revenueForecasts.nextWeek)}
            </div>
            <div className="text-sm text-gray-600">
              Confiança: {predictions.revenueForecasts.confidence.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {/* Clientes em Risco */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Clientes em Risco</span>
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {predictions.clientBehaviorPredictions.churnRisk.length}
            </div>
            <div className="text-sm text-gray-600">
              Necessitam intervenção
            </div>
          </CardContent>
        </Card>

        {/* Oportunidades de Crescimento */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Oportunidades</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {predictions.clientBehaviorPredictions.growthOpportunities.length}
            </div>
            <div className="text-sm text-gray-600">
              Potencial de crescimento
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Análises Específicas */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="churn">Risco de Churn</TabsTrigger>
          <TabsTrigger value="growth">Oportunidades</TabsTrigger>
          <TabsTrigger value="demand">Demanda</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Previsões de Receita */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Previsões de Receita
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Próxima Semana</span>
                    <span className="font-semibold">{formatCurrency(predictions.revenueForecasts.nextWeek)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Próximo Mês</span>
                    <span className="font-semibold">{formatCurrency(predictions.revenueForecasts.nextMonth)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Projeção Trimestral</span>
                    <span className="font-semibold">{formatCurrency(predictions.revenueForecasts.quarterProjection)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span>Confiança das Previsões</span>
                      <Badge variant="outline" className="bg-green-50">
                        {predictions.revenueForecasts.confidence.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sugestões de Otimização */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Sugestões de Otimização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.optimizationSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>
                        <Badge className={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority === 'high' ? 'Alto' : suggestion.priority === 'medium' ? 'Médio' : 'Baixo'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{suggestion.description}</p>
                      <div className="text-xs font-medium text-green-600">
                        Impacto esperado: {suggestion.expectedImpact}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="churn" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Clientes em Risco de Churn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.clientBehaviorPredictions.churnRisk.map((client) => (
                  <div key={client.clientId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{client.clientName}</h4>
                        <p className="text-sm text-gray-600">
                          Última visita: {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge className={getRiskColor(client.riskScore)}>
                        Risco: {client.riskScore}%
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm text-gray-600 mb-1">Previsão de churn:</div>
                      <div className="font-medium">
                        {new Date(client.predictedChurnDate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-2">Ações recomendadas:</div>
                      <div className="flex flex-wrap gap-2">
                        {client.preventionActions.map((action, actionIndex) => (
                          <Badge key={actionIndex} variant="outline">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Oportunidades de Crescimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.clientBehaviorPredictions.growthOpportunities.map((opportunity) => (
                  <div key={opportunity.clientId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{opportunity.clientName}</h4>
                        <p className="text-sm text-gray-600">
                          Valor atual: {formatCurrency(opportunity.currentValue)}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        +{opportunity.growthPotential}% potencial
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm text-gray-600 mb-1">Valor projetado:</div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(opportunity.predictedValue)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-2">Serviços recomendados:</div>
                      <div className="flex flex-wrap gap-2">
                        {opportunity.recommendedServices.map((service, serviceIndex) => (
                          <Badge key={serviceIndex} variant="outline">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demand" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Horários de Pico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Horários de Pico Previstos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.demandForecasting.peakHours.map((peak) => (
                    <div key={peak.hour} className="flex items-center justify-between">
                      <span>{peak.hour}:00</span>
                      <div className="flex items-center gap-2">
                        <Progress value={peak.probability} className="w-20" />
                        <span className="text-sm font-medium">{peak.probability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Serviços Populares */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Demanda por Serviços
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.demandForecasting.popularServices.map((service) => (
                    <div key={service.service} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{service.service}</div>
                        <div className="text-sm text-gray-600">
                          {service.predictedDemand} agendamentos
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getGrowthIcon(service.growth)}
                        <span className={`text-sm ${service.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(service.growth)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}