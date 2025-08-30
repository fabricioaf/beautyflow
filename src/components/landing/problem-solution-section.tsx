'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Clock,
  MessageSquareX,
  Phone,
  CheckCircle,
  BarChart3,
  Zap,
  MessageSquare,
  CreditCard,
  Users,
  ArrowRight
} from 'lucide-react'

export function ProblemSolutionSection() {
  const problems = [
    {
      icon: AlertTriangle,
      title: "No-Shows Constantes",
      description: "Clientes faltam sem avisar, causando perda de receita e horários vagos",
      impact: "Até 30% de perda mensal",
      color: "text-red-600 bg-red-100"
    },
    {
      icon: TrendingDown,
      title: "Baixa Retenção",
      description: "Dificuldade em fidelizar clientes e aumentar frequência de visitas",
      impact: "70% não voltam",
      color: "text-orange-600 bg-orange-100"
    },
    {
      icon: DollarSign,
      title: "Gestão de Pagamentos",
      description: "Cobrança manual, falta de controle financeiro e inadimplência",
      impact: "15% inadimplência",
      color: "text-yellow-600 bg-yellow-100"
    },
    {
      icon: Clock,
      title: "Gestão Manual",
      description: "Agendamentos por WhatsApp pessoal, sem controle ou organização",
      impact: "Horas perdidas",
      color: "text-blue-600 bg-blue-100"
    }
  ]

  const solutions = [
    {
      icon: BarChart3,
      title: "IA Anti No-Show",
      description: "Sistema preditivo que identifica clientes com risco de faltar e executa intervenções automáticas",
      result: "92% redução de faltas",
      features: ["Análise de 15+ fatores", "Intervenções automáticas", "Score de risco em tempo real"],
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Users,
      title: "CRM Inteligente",
      description: "Gestão completa de clientes com programa de fidelidade e análise comportamental",
      result: "+85% retenção",
      features: ["Programa de pontos", "Análise preditiva", "Segmentação automática"],
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: CreditCard,
      title: "Pagamentos Automáticos",
      description: "PIX, cartão e cobrança automática com integração completa ao agendamento",
      result: "0% inadimplência",
      features: ["PIX sem taxa", "Cobrança automática", "Relatórios financeiros"],
      color: "from-green-500 to-green-600"
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Business",
      description: "Automação completa de lembretes, confirmações e comunicação com clientes",
      result: "+300% eficiência",
      features: ["Lembretes automáticos", "Confirmação por WhatsApp", "Templates personalizados"],
      color: "from-emerald-500 to-emerald-600"
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Problems Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-red-100 text-red-700">
            Problemas Reais do Setor
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Os Maiores Desafios dos <span className="bg-gradient-to-r from-beauty-pink to-beauty-purple bg-clip-text text-transparent">Salões de Beleza</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Baseado em pesquisa com mais de 1.000 profissionais da beleza no Brasil
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {problems.map((problem, index) => {
            const Icon = problem.icon
            return (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg ${problem.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{problem.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{problem.description}</p>
                  <Badge variant="destructive" className="text-xs">
                    {problem.impact}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Arrow Transition */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-beauty-purple to-beauty-pink p-4 rounded-full">
            <ArrowRight className="w-8 h-8 text-white" />
            <span className="text-white font-semibold">TRANSFORMAÇÃO COM IA</span>
            <ArrowRight className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Solutions Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-green-100 text-green-700">
            Soluções Inteligentes
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Como o <span className="bg-gradient-to-r from-beauty-pink to-beauty-purple bg-clip-text text-transparent">BeautyFlow</span> Resolve Cada Problema
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tecnologia de ponta desenvolvida especificamente para o setor da beleza
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {solutions.map((solution, index) => {
            const Icon = solution.icon
            return (
              <Card key={index} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${solution.color} flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-1">{solution.title}</CardTitle>
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        {solution.result}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{solution.description}</p>
                  <div className="space-y-2">
                    {solution.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Results Summary */}
        <div className="mt-16 bg-gradient-to-r from-beauty-purple/10 to-beauty-pink/10 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">Resultados Comprovados</h3>
            <p className="text-gray-600">Dados reais de nossos clientes nos últimos 12 meses</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">92%</div>
              <div className="text-sm text-gray-600">Redução de No-Shows</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">+347%</div>
              <div className="text-sm text-gray-600">ROI Médio</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">85%</div>
              <div className="text-sm text-gray-600">Retenção de Clientes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600 mb-2">6h</div>
              <div className="text-sm text-gray-600">Economia por Semana</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}