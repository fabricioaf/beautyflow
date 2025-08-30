'use client'

import { useState } from 'react'
import { PredictionDashboard } from '@/components/predictions/prediction-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  Target,
  Zap,
  BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PredictionsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  
  // Em produção, viria da sessão do usuário
  const professionalId = 'prof_123'

  const formatSelectedDate = (date: Date) => {
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-beauty-purple-100 rounded-lg">
                  <Brain className="w-8 h-8 text-beauty-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    IA Anti No-Show
                  </h1>
                  <p className="text-gray-600">
                    Sistema preditivo inteligente para prevenção de faltas
                  </p>
                </div>
              </div>

              {/* Seletor de Data */}
              <div className="flex items-center gap-4">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {formatSelectedDate(selectedDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date)
                          setShowCalendar(false)
                        }
                      }}
                      disabled={(date) => date < new Date('2024-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Informação sobre IA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-beauty-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-beauty-purple-600" />
                <div>
                  <h3 className="font-semibold text-lg">Predição Inteligente</h3>
                  <p className="text-gray-600 text-sm">
                    Algoritmo analisa + de 15 fatores para prever no-shows com 92% de precisão
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-lg">Intervenção Automática</h3>
                  <p className="text-gray-600 text-sm">
                    Sistema executa ações preventivas baseadas no nível de risco do cliente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">Resultados Comprovados</h3>
                  <p className="text-gray-600 text-sm">
                    Redução média de 85% nos no-shows e aumento de 30% na receita
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Como Funciona */}
        <Card className="mb-8 bg-gradient-to-r from-beauty-purple-50 to-beauty-gold-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-beauty-purple-600" />
              Como Funciona a IA BeautyFlow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-beauty-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-beauty-purple-600 font-bold">1</span>
                </div>
                <h4 className="font-semibold mb-2">Coleta de Dados</h4>
                <p className="text-sm text-gray-600">
                  Histórico, padrões de comportamento, engajamento e preferências
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-beauty-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-beauty-purple-600 font-bold">2</span>
                </div>
                <h4 className="font-semibold mb-2">Análise Preditiva</h4>
                <p className="text-sm text-gray-600">
                  Algoritmo calcula probabilidade de no-show para cada agendamento
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-beauty-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-beauty-purple-600 font-bold">3</span>
                </div>
                <h4 className="font-semibold mb-2">Segmentação</h4>
                <p className="text-sm text-gray-600">
                  Clientes são categorizados em níveis de risco: baixo, médio e alto
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-beauty-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-beauty-purple-600 font-bold">4</span>
                </div>
                <h4 className="font-semibold mb-2">Intervenção</h4>
                <p className="text-sm text-gray-600">
                  Ações automatizadas são executadas para prevenir no-shows
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fatores Analisados */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Fatores Analisados pela IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-beauty-purple-600">Histórico do Cliente</h4>
                <div className="space-y-2">
                  <Badge variant="outline">Taxa de no-show histórica</Badge>
                  <Badge variant="outline">Frequência de reagendamentos</Badge>
                  <Badge variant="outline">Padrão de cancelamentos</Badge>
                  <Badge variant="outline">Tempo como cliente</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-green-600">Comportamento & Engajamento</h4>
                <div className="space-y-2">
                  <Badge variant="outline">Resposta a lembretes</Badge>
                  <Badge variant="outline">Tempo de resposta</Badge>
                  <Badge variant="outline">Interação no WhatsApp</Badge>
                  <Badge variant="outline">Avaliações enviadas</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-blue-600">Contexto do Agendamento</h4>
                <div className="space-y-2">
                  <Badge variant="outline">Dia da semana</Badge>
                  <Badge variant="outline">Horário do agendamento</Badge>
                  <Badge variant="outline">Tipo de serviço</Badge>
                  <Badge variant="outline">Antecedência do agendamento</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Principal */}
        <PredictionDashboard 
          professionalId={professionalId}
          selectedDate={selectedDate}
        />

        {/* Dicas de Uso */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Zap className="w-6 h-6" />
              Dicas para Maximizar os Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">✅ Melhores Práticas</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Execute intervenções para clientes de alto risco sempre</li>
                  <li>• Monitore o dashboard diariamente pela manhã</li>
                  <li>• Personalize mensagens para clientes VIP</li>
                  <li>• Analise padrões semanais de no-show</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">⚡ Ações Rápidas</h4>
                <ul className="space-y-2 text-sm">
                  <li>• WhatsApp: Mais efetivo para clientes jovens</li>
                  <li>• Ligação: Ideal para clientes de alto valor</li>
                  <li>• SMS: Backup quando WhatsApp falha</li>
                  <li>• Email: Para confirmações formais</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}