'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  DollarSign,
  Clock,
  Phone,
  MessageSquare,
  Mail,
  Target,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  BarChart3,
  TrendingDown,
  ArrowRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PredictionDashboardProps {
  professionalId: string
  selectedDate?: Date
}

interface ClientPrediction {
  appointmentId: string
  clientId: string
  clientName: string
  clientPhone: string
  clientEmail: string
  serviceName: string
  servicePrice: number
  scheduledFor: Date
  prediction: {
    probability: number
    confidence: number
    riskLevel: 'low' | 'medium' | 'high'
    factors: string[]
  }
  riskScore: {
    score: number
    segment: string
    trends: string[]
    factors: Array<{ factor: string; impact: number }>
  }
  recommendedActions: Array<{
    type: string
    priority: string
    message: string
  }>
  interventionPriority: string
  potentialLoss: number
  clientStats: {
    totalAppointments: number
    noShowCount: number
    lastAppointment: Date | null
    averageSpending: number
  }
}

interface DashboardData {
  date: string
  summary: {
    totalAppointments: number
    highRiskCount: number
    mediumRiskCount: number
    lowRiskCount: number
    totalRevenue: number
    potentialLoss: number
    averageRiskScore: number
    interventionsExecuted: number
  }
  riskSegments: {
    high: ClientPrediction[]
    medium: ClientPrediction[]
    low: ClientPrediction[]
  }
  recommendations: {
    urgentActions: number
    suggestedInterventions: Array<{
      clientName: string
      action: string
      reason: string
      expectedImpact: string
    }>
  }
  trends: {
    riskTrend: string
    interventionEffectiveness: number
    noShowPrevention: number
  }
}

export function PredictionDashboard({ 
  professionalId, 
  selectedDate = new Date() 
}: PredictionDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const { toast } = useToast()

  const loadDashboardData = async (date: Date) => {
    setLoading(true)
    try {
      const dateStr = date.toISOString().split('T')[0]
      const response = await fetch(
        `/api/predictions/dashboard?professionalId=${professionalId}&date=${dateStr}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      } else {
        throw new Error('Erro ao carregar dados')
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData(selectedDate)
  }, [professionalId, selectedDate])

  const executeIntervention = async (
    appointmentId: string, 
    actionType: string, 
    customMessage?: string
  ) => {
    setExecutingAction(appointmentId)
    
    try {
      const response = await fetch('/api/predictions/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          actionType,
          customMessage,
          professionalId
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Intervenção Executada",
          description: result.message,
          variant: "default"
        })
        // Recarregar dados
        loadDashboardData(selectedDate)
      } else {
        throw new Error('Falha na execução')
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível executar a intervenção",
        variant: "destructive"
      })
    } finally {
      setExecutingAction(null)
    }
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />
      case 'sms': return <Phone className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      case 'call': return <Phone className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
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

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem dados disponíveis</h3>
          <p className="text-gray-600">
            Não há agendamentos para análise nesta data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Agendamentos</p>
                <p className="text-2xl font-bold">{dashboardData.summary.totalAppointments}</p>
              </div>
              <Calendar className="w-8 h-8 text-beauty-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes de Alto Risco</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData.summary.highRiskCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita em Risco</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(dashboardData.summary.potentialLoss)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Score de Risco Médio</p>
                <p className="text-2xl font-bold">{dashboardData.summary.averageRiskScore}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-beauty-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Urgentes */}
      {dashboardData.recommendations.urgentActions > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Zap className="w-5 h-5" />
              Ações Urgentes Necessárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-red-700">
                {dashboardData.recommendations.urgentActions} clientes precisam de intervenção imediata
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedTab('high-risk')}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Ver Detalhes
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dashboardData.recommendations.suggestedInterventions.map((suggestion, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-red-200">
                  <div className="font-medium">{suggestion.clientName}</div>
                  <div className="text-sm text-gray-600">{suggestion.reason}</div>
                  <div className="text-sm text-green-600 mt-1">{suggestion.expectedImpact}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs com Segmentação de Risco */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="high-risk" className="text-red-600">
            Alto Risco ({dashboardData.summary.highRiskCount})
          </TabsTrigger>
          <TabsTrigger value="medium-risk" className="text-yellow-600">
            Médio Risco ({dashboardData.summary.mediumRiskCount})
          </TabsTrigger>
          <TabsTrigger value="low-risk" className="text-green-600">
            Baixo Risco ({dashboardData.summary.lowRiskCount})
          </TabsTrigger>
        </TabsList>

        {/* Tab Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de Risco */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      Alto Risco
                    </span>
                    <span>{dashboardData.summary.highRiskCount} clientes</span>
                  </div>
                  <Progress 
                    value={(dashboardData.summary.highRiskCount / dashboardData.summary.totalAppointments) * 100} 
                    className="h-2 bg-red-100" 
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      Médio Risco
                    </span>
                    <span>{dashboardData.summary.mediumRiskCount} clientes</span>
                  </div>
                  <Progress 
                    value={(dashboardData.summary.mediumRiskCount / dashboardData.summary.totalAppointments) * 100} 
                    className="h-2 bg-yellow-100" 
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      Baixo Risco
                    </span>
                    <span>{dashboardData.summary.lowRiskCount} clientes</span>
                  </div>
                  <Progress 
                    value={(dashboardData.summary.lowRiskCount / dashboardData.summary.totalAppointments) * 100} 
                    className="h-2 bg-green-100" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Métricas de Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance da IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Eficácia das Intervenções</span>
                    <span className="font-semibold text-green-600">
                      {Math.round(dashboardData.trends.interventionEffectiveness * 100)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>No-Shows Prevenidos (Est.)</span>
                    <span className="font-semibold text-blue-600">
                      {dashboardData.trends.noShowPrevention}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Intervenções Executadas</span>
                    <span className="font-semibold">
                      {dashboardData.summary.interventionsExecuted}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Alto Risco */}
        <TabsContent value="high-risk">
          <ClientRiskList 
            clients={dashboardData.riskSegments.high}
            riskLevel="high"
            onExecuteAction={executeIntervention}
            executingAction={executingAction}
          />
        </TabsContent>

        {/* Tab Médio Risco */}
        <TabsContent value="medium-risk">
          <ClientRiskList 
            clients={dashboardData.riskSegments.medium}
            riskLevel="medium"
            onExecuteAction={executeIntervention}
            executingAction={executingAction}
          />
        </TabsContent>

        {/* Tab Baixo Risco */}
        <TabsContent value="low-risk">
          <ClientRiskList 
            clients={dashboardData.riskSegments.low}
            riskLevel="low"
            onExecuteAction={executeIntervention}
            executingAction={executingAction}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente para lista de clientes por risco
function ClientRiskList({ 
  clients, 
  riskLevel, 
  onExecuteAction, 
  executingAction 
}: {
  clients: ClientPrediction[]
  riskLevel: string
  onExecuteAction: (appointmentId: string, actionType: string, customMessage?: string) => void
  executingAction: string | null
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />
      case 'sms': return <Phone className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      case 'call': return <Phone className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum cliente nesta categoria</h3>
          <p className="text-gray-600">
            {riskLevel === 'high' && 'Ótimo! Não há clientes de alto risco hoje.'}
            {riskLevel === 'medium' && 'Não há clientes com risco médio no momento.'}
            {riskLevel === 'low' && 'Todos os clientes estão em categorias de maior risco.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => (
        <Card key={client.appointmentId} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Info do Cliente */}
              <div className="lg:col-span-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>{client.clientName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{client.clientName}</h3>
                    <p className="text-sm text-gray-600">{client.serviceName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {formatTime(client.scheduledFor)}
                      </span>
                      <span className="text-sm font-medium text-beauty-purple-600">
                        {formatCurrency(client.servicePrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score de Risco */}
              <div className="lg:col-span-2">
                <div className="text-center">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRiskBadgeColor(riskLevel)}`}>
                    {client.riskScore.score}% risco
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{client.riskScore.segment}</p>
                </div>
              </div>

              {/* Fatores de Risco */}
              <div className="lg:col-span-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">Principais fatores:</p>
                  {client.prediction.factors.slice(0, 2).map((factor, index) => (
                    <p key={index} className="text-xs text-gray-600">• {factor}</p>
                  ))}
                </div>
              </div>

              {/* Ações Recomendadas */}
              <div className="lg:col-span-3">
                <div className="space-y-2">
                  {client.recommendedActions.slice(0, 2).map((action, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={action.priority === 'high' ? 'default' : 'outline'}
                      className={`w-full justify-start text-xs ${
                        action.priority === 'high' ? 'beauty-gradient' : ''
                      }`}
                      onClick={() => onExecuteAction(client.appointmentId, action.type)}
                      disabled={executingAction === client.appointmentId}
                    >
                      {executingAction === client.appointmentId ? (
                        'Executando...'
                      ) : (
                        <>
                          {getActionIcon(action.type)}
                          <span className="ml-2 truncate">{action.type.toUpperCase()}</span>
                        </>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Stats do Cliente */}
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                  <div className="grid grid-cols-2 gap-1">
                    <span>Total: {client.clientStats.totalAppointments}</span>
                    <span>No-shows: {client.clientStats.noShowCount}</span>
                    <span>Gasto médio: {formatCurrency(client.clientStats.averageSpending)}</span>
                    <span>Confiança: {Math.round(client.prediction.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}