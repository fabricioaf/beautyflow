'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Check,
  Sparkles,
  Crown,
  Rocket,
  ArrowRight,
  Star,
  Users,
  BarChart3,
  MessageSquare,
  CreditCard,
  Shield,
  Headphones
} from 'lucide-react'

export function PricingSection() {
  const plans = [
    {
      name: "Essencial",
      price: "97",
      originalPrice: "147",
      badge: "Mais Popular",
      badgeColor: "bg-green-100 text-green-700",
      description: "Perfeito para salões que estão começando",
      icon: Sparkles,
      iconColor: "from-green-500 to-green-600",
      features: [
        "Até 500 agendamentos/mês",
        "IA Anti No-Show básica",
        "WhatsApp automático",
        "Pagamentos PIX e cartão",
        "Dashboard básico",
        "Suporte por chat"
      ],
      notIncluded: [
        "Analytics avançado",
        "Programa de fidelidade",
        "API personalizada"
      ],
      cta: "Começar Grátis",
      ctaLink: "/auth/signup?plan=essential",
      popular: true
    },
    {
      name: "Profissional",
      price: "197",
      originalPrice: "297",
      badge: "Mais Vendido",
      badgeColor: "bg-purple-100 text-purple-700",
      description: "Para salões em crescimento",
      icon: Crown,
      iconColor: "from-purple-500 to-purple-600",
      features: [
        "Agendamentos ilimitados",
        "IA Anti No-Show avançada",
        "WhatsApp Business API",
        "Pagamentos + cobrança automática",
        "Analytics completo",
        "Programa de fidelidade",
        "Gestão de equipe",
        "Suporte prioritário"
      ],
      notIncluded: [
        "API personalizada",
        "Integração customizada"
      ],
      cta: "Escolher Profissional",
      ctaLink: "/auth/signup?plan=professional",
      popular: false
    },
    {
      name: "Enterprise",
      price: "497",
      originalPrice: "697",
      badge: "Máximo ROI",
      badgeColor: "bg-gold-100 text-gold-700",
      description: "Para redes e franquias",
      icon: Rocket,
      iconColor: "from-gold-500 to-gold-600",
      features: [
        "Tudo do Profissional",
        "Multi-unidades ilimitadas",
        "IA personalizada",
        "API e integrações custom",
        "Relatórios executivos",
        "Consultoria estratégica",
        "Suporte 24/7 dedicado",
        "Onboarding personalizado"
      ],
      notIncluded: [],
      cta: "Falar com Consultor",
      ctaLink: "/contact?plan=enterprise",
      popular: false
    }
  ]

  const features = [
    {
      icon: BarChart3,
      title: "IA Anti No-Show",
      description: "92% de precisão na prevenção de faltas"
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Automático", 
      description: "Lembretes e confirmações automáticas"
    },
    {
      icon: CreditCard,
      title: "Pagamentos Integrados",
      description: "PIX, cartão e cobrança automática"
    },
    {
      icon: Users,
      title: "Gestão Completa",
      description: "Clientes, equipe e agenda unificados"
    },
    {
      icon: Shield,
      title: "Segurança Total",
      description: "Dados protegidos e backups automáticos"
    },
    {
      icon: Headphones,
      title: "Suporte Especializado",
      description: "Time expert em salões de beleza"
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-beauty-purple-100 text-beauty-purple-700">
            Planos e Preços
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Escolha o Plano Ideal para seu{' '}
            <span className="bg-gradient-to-r from-beauty-pink to-beauty-purple bg-clip-text text-transparent">
              Salão de Beleza
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Comece grátis por 14 dias. Cancele a qualquer momento. Sem taxas de setup.
          </p>
          
          {/* Guarantee */}
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-8">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Garantia de 30 dias ou seu dinheiro de volta
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            return (
              <Card 
                key={index} 
                className={`relative border-2 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                  plan.popular ? 'border-beauty-purple-300 bg-gradient-to-br from-white to-beauty-purple-50' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className={plan.badgeColor}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${plan.iconColor} flex items-center justify-center mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-4xl font-bold">R$ {plan.price}</span>
                      <span className="text-gray-500">/mês</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg text-gray-400 line-through">R$ {plan.originalPrice}</span>
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        -{Math.round(((parseInt(plan.originalPrice) - parseInt(plan.price)) / parseInt(plan.originalPrice)) * 100)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.notIncluded.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3 opacity-50">
                        <div className="w-5 h-5 mt-0.5 flex-shrink-0 rounded-full border-2 border-gray-300"></div>
                        <span className="text-gray-500 line-through">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href={plan.ctaLink} className="block">
                    <Button 
                      className={`w-full h-12 font-semibold ${
                        plan.popular 
                          ? 'beauty-gradient text-white' 
                          : 'border-2 border-beauty-purple-300 text-beauty-purple-600 hover:bg-beauty-purple-50'
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  
                  <p className="text-center text-xs text-gray-500">
                    14 dias grátis • Sem compromisso
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Features Included */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border">
          <h3 className="text-2xl font-bold text-center mb-8">
            Recursos Inclusos em Todos os Planos
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-beauty-purple to-beauty-pink flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* FAQ Quick */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-bold mb-4">Ainda tem dúvidas?</h3>
          <p className="text-gray-600 mb-6">
            Nossa equipe está pronta para ajudar você a escolher o melhor plano
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button variant="outline" className="border-2">
                <MessageSquare className="w-4 h-4 mr-2" />
                Falar com Consultor
              </Button>
            </Link>
            <Link href="/faq">
              <Button variant="outline" className="border-2">
                Ver Perguntas Frequentes
              </Button>
            </Link>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-8 text-sm text-gray-600 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>500+ salões confiam</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="ml-1">4.9/5 (230 avaliações)</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Dados 100% seguros</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}