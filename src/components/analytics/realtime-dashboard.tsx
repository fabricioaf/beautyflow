'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  Clock,
  Target,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  RefreshCw,
  Download,
  Filter,
  Zap,
  Star,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { RealtimeMetrics, HistoricalData, TopServices, ClientSegmentation } from '@/lib/realtime-analytics'

interface RealtimeDashboardProps {
  professionalId: string
  autoRefresh?: boolean
  refreshInterval?: number // em segundos
}

export function RealtimeDashboard({ 
  professionalId, 
  autoRefresh = true, 
  refreshInterval = 30 
}: RealtimeDashboardProps) {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [topServices, setTopServices] = useState<TopServices[]>([])
  const [clientSegmentation, setClientSegmentation] = useState<ClientSegmentation[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isLive, setIsLive] = useState(autoRefresh)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadDashboardData = async () => {
    try {
      // Carregar dados em paralelo para melhor performance
      const [metricsRes, historicalRes, servicesRes, segmentationRes] = await Promise.all([
        fetch(`/api/analytics/realtime?professionalId=${professionalId}&type=metrics`),
        fetch(`/api/analytics/realtime?professionalId=${professionalId}&type=historical&days=30`),
        fetch(`/api/analytics/realtime?professionalId=${professionalId}&type=services&limit=8`),
        fetch(`/api/analytics/realtime?professionalId=${professionalId}&type=segmentation`)
      ])

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.data)
      }

      if (historicalRes.ok) {
        const historicalData = await historicalRes.json()
        setHistoricalData(historicalData.data)
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        setTopServices(servicesData.data)
      }

      if (segmentationRes.ok) {
        const segmentationData = await segmentationRes.json()
        setClientSegmentation(segmentationData.data)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [professionalId])

  useEffect(() => {
    if (isLive && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        loadDashboardData()
      }, refreshInterval * 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [isLive, refreshInterval])

  const toggleLiveMode = () => {
    setIsLive(!isLive)
  }

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

  if (loading && !metrics) {
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
      {/* Header com Controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard em Tempo Real</h2>
          <p className="text-gray-600">
            Última atualização: {lastUpdate?.toLocaleTimeString('pt-BR') || 'Carregando...'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button
            variant={isLive ? 'default' : 'outline'}
            size="sm"
            onClick={toggleLiveMode}
            className={isLive ? 'beauty-gradient' : ''}
          >
            <Activity className="w-4 h-4 mr-2" />
            {isLive ? 'Ao Vivo' : 'Pausado'}
          </Button>

          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Receita Hoje */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Receita Hoje</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {formatCurrency(metrics.revenue.today)}
            </div>
            <div className="flex items-center gap-1">
              {getGrowthIcon(metrics.revenue.growth.daily)}
              <span className={`text-sm ${getGrowthColor(metrics.revenue.growth.daily)}`}>
                {formatPercentage(metrics.revenue.growth.daily)} vs ontem
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Agendamentos Hoje */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Agendamentos</span>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {metrics.appointments.today}
            </div>
            <div className="text-sm text-gray-600">
              {metrics.appointments.completed} concluídos • {metrics.appointments.scheduled} agendados
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Ocupação */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Taxa de Ocupação</span>
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {metrics.appointments.occupationRate.toFixed(1)}%
            </div>
            <Progress value={metrics.appointments.occupationRate} className="h-2" />
          </CardContent>
        </Card>

        {/* Satisfação */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Satisfação</span>
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold mb-1">
              {metrics.performance.satisfactionScore.toFixed(1)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">
                {metrics.performance.punctualityRate.toFixed(0)}% pontualidade
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Mensal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-beauty-purple-600 mb-2">
              {formatCurrency(metrics.revenue.thisMonth)}
            </div>
            <div className="flex items-center gap-2">
              {getGrowthIcon(metrics.revenue.growth.monthly)}
              <span className={`text-sm ${getGrowthColor(metrics.revenue.growth.monthly)}`}>
                {formatPercentage(metrics.revenue.growth.monthly)} vs mês anterior
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Meta: {formatCurrency(metrics.revenue.thisMonth * 1.2)}
            </div>
            <Progress 
              value={(metrics.revenue.thisMonth / (metrics.revenue.thisMonth * 1.2)) * 100} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-semibold">{metrics.clients.total}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Novos este mês</span>
                  <span className="font-semibold text-green-600">{metrics.clients.new}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Retenção</span>
                  <span className="font-semibold">{metrics.clients.retention.toFixed(1)}%</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">LTV Médio</span>
                  <span className="font-semibold">{formatCurrency(metrics.clients.avgLifetimeValue)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taxa de Conclusão</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{metrics.conversion.completionRate.toFixed(1)}%</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taxa de No-Show</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{metrics.performance.noShowRate.toFixed(1)}%</span>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Reagendamentos</span>
                <span className="font-semibold">{metrics.conversion.rebookingRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Duração Média</span>
                <span className="font-semibold">{metrics.performance.avgServiceDuration.toFixed(0)}min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas com Análises Detalhadas */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <TrendsTab historicalData={historicalData} />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <ServicesTab topServices={topServices} />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <ClientsTab segmentation={clientSegmentation} />
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <ConversionTab metrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componentes das abas
function TrendsTab({ historicalData }: { historicalData: HistoricalData[] }) {
  if (!historicalData.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Dados históricos não disponíveis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Tendências dos Últimos 30 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">Receita Diária</h4>
            <div className="space-y-2">
              {historicalData.slice(-7).map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString('pt-BR', { 
                      weekday: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="font-medium">
                    R$ {day.revenue.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Agendamentos Diários</h4>
            <div className="space-y-2">
              {historicalData.slice(-7).map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString('pt-BR', { 
                      weekday: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{day.appointments}</span>
                    {day.noShows > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {day.noShows} faltas
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ServicesTab({ topServices }: { topServices: TopServices[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Serviços Mais Populares
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topServices.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-beauty-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-beauty-purple-600">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold">{service.serviceName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">
                      {service.count} agendamentos
                    </span>
                    <span className="text-xs">•</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="text-sm">{service.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold text-beauty-purple-600">
                  R$ {service.revenue.toLocaleString('pt-BR')}
                </div>
                <div className={`text-sm ${service.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {service.growthRate >= 0 ? '+' : ''}{service.growthRate.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ClientsTab({ segmentation }: { segmentation: ClientSegmentation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Segmentação de Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {segmentation.map((segment, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{segment.segment}</h4>
                <Badge variant="outline">{segment.count} clientes</Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Percentual</span>
                  <span className="font-medium">{segment.percentage.toFixed(1)}%</span>
                </div>
                <Progress value={segment.percentage} className="h-2" />
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gasto Médio</span>
                  <span className="font-medium">
                    R$ {segment.avgSpending.toLocaleString('pt-BR')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Retenção</span>
                  <span className="font-medium">{segment.retention.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ConversionTab({ metrics }: { metrics: RealtimeMetrics }) {
  const conversionMetrics = [
    {
      name: 'Taxa de Reserva',
      value: metrics.conversion.bookingRate,
      description: 'Visitantes que agendam',
      icon: Target,
      color: 'text-blue-600'
    },
    {
      name: 'Taxa de Conclusão',
      value: metrics.conversion.completionRate,
      description: 'Agendamentos concluídos',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      name: 'Taxa de Reagendamento',
      value: metrics.conversion.rebookingRate,
      description: 'Clientes que retornam',
      icon: RefreshCw,
      color: 'text-purple-600'
    },
    {
      name: 'Taxa de Cancelamento',
      value: metrics.conversion.cancellationRate,
      description: 'Agendamentos cancelados',
      icon: AlertCircle,
      color: 'text-red-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {conversionMetrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${metric.color}`} />
                <div className="text-right">
                  <div className="text-2xl font-bold">{metric.value.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">{metric.name}</div>
                </div>
              </div>
              
              <Progress value={metric.value} className="h-3 mb-2" />
              <p className="text-sm text-gray-600">{metric.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}