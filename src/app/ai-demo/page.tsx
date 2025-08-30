'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Target, 
  Zap, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  MessageSquare,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  ArrowRight
} from 'lucide-react'

// Dados de demonstração
const demoStats = {
  totalClients: 156,
  noShowReduction: 85,
  revenueIncrease: 30,
  interventionSuccess: 92,
  monthlyRevenue: 18500,
  savedRevenue: 5550
}

const demoRiskFactors = [
  { name: 'Histórico de No-Show', weight: 35, description: 'Cliente faltou em 3 dos últimos 10 agendamentos' },
  { name: 'Baixo Engajamento', weight: 25, description: 'Não responde mensagens de confirmação' },
  { name: 'Padrão de Horário', weight: 20, description: 'Agendamentos em horários com alta taxa de falta' },
  { name: 'Sazonalidade', weight: 15, description: 'Segunda-feira com clima chuvoso' },
  { name: 'Valor do Serviço', weight: 5, description: 'Serviço de alto valor (R$ 150+)' }
]

const demoInterventions = [
  {
    type: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600',
    success: 95,
    description: 'Mensagem personalizada enviada automaticamente',
    timing: '24h antes do agendamento'
  },
  {
    type: 'SMS',
    icon: Phone,
    color: 'text-blue-600', 
    success: 78,
    description: 'SMS de backup para casos sem resposta',
    timing: '2h antes do agendamento'
  },
  {
    type: 'Ligação',
    icon: Phone,
    color: 'text-purple-600',
    success: 88,
    description: 'Ligação automática para clientes VIP',
    timing: '1h antes do agendamento'
  },
  {
    type: 'Email',
    icon: Mail,
    color: 'text-orange-600',
    success: 65,
    description: 'Email de confirmação com link direto',
    timing: '48h antes do agendamento'
  }
]

export default function AIDemo() {
  const [selectedRisk, setSelectedRisk] = useState<number>(75)
  const [simulatingPrediction, setSimulatingPrediction] = useState(false)

  const simulatePrediction = () => {
    setSimulatingPrediction(true)
    setTimeout(() => {
      setSimulatingPrediction(false)
      setSelectedRisk(Math.floor(Math.random() * 40) + 60) // 60-100% para demo
    }, 2000)
  }

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'Alto', color: 'text-red-600 bg-red-100', border: 'border-red-200' }
    if (score >= 40) return { level: 'Médio', color: 'text-yellow-600 bg-yellow-100', border: 'border-yellow-200' }
    return { level: 'Baixo', color: 'text-green-600 bg-green-100', border: 'border-green-200' }
  }

  const riskInfo = getRiskLevel(selectedRisk)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-beauty-purple-100 rounded-lg">
                <Brain className="w-8 h-8 text-beauty-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Demonstração IA Anti No-Show
                </h1>
                <p className="text-gray-600">
                  Veja como nossa inteligência artificial previne faltas e aumenta sua receita
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resultados Comprovados */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-600">-{demoStats.noShowReduction}%</div>
              <div className="text-sm text-gray-600">Redução de No-Shows</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-blue-600">+{demoStats.revenueIncrease}%</div>
              <div className="text-sm text-gray-600">Aumento na Receita</div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-purple-600">{demoStats.interventionSuccess}%</div>
              <div className="text-sm text-gray-600">Precisão da IA</div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-orange-600">{demoStats.totalClients}</div>
              <div className="text-sm text-gray-600">Clientes Analisados</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simulador de Predição */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-beauty-purple-600" />
                Simulador de Predição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cliente Demo */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Marina Silva</h3>
                    <p className="text-sm text-gray-600">Corte + Escova - Segunda, 14:00</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-beauty-purple-600">R$ 150</div>
                    <div className="text-sm text-gray-500">Valor do serviço</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risco de No-Show:</span>
                  <Badge className={`${riskInfo.color} ${riskInfo.border} border`}>
                    {selectedRisk}% - {riskInfo.level}
                  </Badge>
                </div>
              </div>

              {/* Análise de Fatores */}
              <div>
                <h4 className="font-semibold mb-3">Fatores Analisados pela IA:</h4>
                <div className="space-y-3">
                  {demoRiskFactors.map((factor, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{factor.name}</span>
                        <span className="text-sm text-gray-600">{factor.weight}%</span>
                      </div>
                      <Progress value={factor.weight * (selectedRisk / 100)} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={simulatePrediction}
                disabled={simulatingPrediction}
                className="w-full beauty-gradient"
              >
                {simulatingPrediction ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analisando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Simular Nova Predição
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Sistema de Intervenções */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6 text-green-600" />
                Intervenções Automáticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoInterventions.map((intervention, index) => {
                const Icon = intervention.icon
                return (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${intervention.color}`} />
                        <span className="font-medium">{intervention.type}</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {intervention.success}% sucesso
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{intervention.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {intervention.timing}
                    </div>
                  </div>
                )
              })}

              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Sistema Inteligente</span>
                </div>
                <p className="text-sm text-green-700">
                  A IA seleciona automaticamente a melhor intervenção baseada no perfil 
                  do cliente e nível de risco, maximizando as chances de comparecimento.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Impacto Financeiro */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Impacto Financeiro Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  R$ {demoStats.monthlyRevenue.toLocaleString('pt-BR')}
                </div>
                <div className="text-sm text-gray-600">Receita Total</div>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600 mb-2">
                  R$ {demoStats.savedRevenue.toLocaleString('pt-BR')}
                </div>
                <div className="text-sm text-gray-600">Receita Salva pela IA</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {Math.round((demoStats.savedRevenue / demoStats.monthlyRevenue) * 100)}%
                </div>
                <div className="text-sm text-gray-600">ROI da Implementação</div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-600 mb-4">
                <strong>No seu caso:</strong> Com uma receita mensal de R$ {demoStats.monthlyRevenue.toLocaleString('pt-BR')}, 
                você pode economizar até R$ {demoStats.savedRevenue.toLocaleString('pt-BR')} por mês com nossa IA.
              </p>
              
              <Button className="beauty-gradient" size="lg">
                <Calendar className="w-5 h-5 mr-2" />
                Ativar IA no Meu Salão
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cases de Sucesso */}
        <Card className="mt-8 bg-gradient-to-r from-beauty-purple-50 to-beauty-gold-50">
          <CardHeader>
            <CardTitle className="text-center">Transformações Reais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-beauty-purple-600 mb-2">85%</div>
                <div className="text-sm text-gray-600">redução nos no-shows</div>
                <div className="text-xs text-gray-500 mt-1">Salão Bella Vita - SP</div>
              </div>

              <div className="text-center p-4">
                <div className="text-3xl font-bold text-beauty-purple-600 mb-2">R$ 8.500</div>
                <div className="text-sm text-gray-600">receita extra mensal</div>
                <div className="text-xs text-gray-500 mt-1">Studio Hair - RJ</div>
              </div>

              <div className="text-center p-4">
                <div className="text-3xl font-bold text-beauty-purple-600 mb-2">92%</div>
                <div className="text-sm text-gray-600">satisfação dos clientes</div>
                <div className="text-xs text-gray-500 mt-1">Beauty Center - MG</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}