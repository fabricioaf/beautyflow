'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Sparkles, 
  Calendar, 
  CreditCard,
  BarChart3,
  MessageSquare,
  Users,
  ArrowRight,
  CheckCircle,
  Star,
  Zap
} from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-beauty-purple-50 via-white to-beauty-pink-50 flex items-center justify-center overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-beauty-pink/20 to-beauty-purple/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-beauty-purple/20 to-beauty-pink/20 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-beauty-purple-200 rounded-full px-4 py-2">
              <Zap className="w-4 h-4 text-beauty-purple-600" />
              <span className="text-sm font-medium text-beauty-purple-700">IA Anti No-Show 92% de Eficácia</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Transforme seu{' '}
                <span className="bg-gradient-to-r from-beauty-pink to-beauty-purple bg-clip-text text-transparent">
                  Salão de Beleza
                </span>
                {' '}com Inteligência Artificial
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                O BeautyFlow é a plataforma completa que elimina no-shows, automatiza pagamentos 
                e transforma dados em crescimento real para seu negócio.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">92% menos faltas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-700 font-medium">Pagamentos automáticos</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-gray-700 font-medium">WhatsApp integrado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-pink-600" />
                </div>
                <span className="text-gray-700 font-medium">Analytics em tempo real</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="beauty-gradient text-white font-semibold px-8 py-4 h-auto">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Começar Grátis Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/ai-demo">
                <Button size="lg" variant="outline" className="border-2 px-8 py-4 h-auto">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Ver Demo da IA
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-beauty-pink to-beauty-purple"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-beauty-purple to-beauty-pink"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-beauty-pink to-beauty-purple"></div>
                </div>
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
            </div>
          </div>

          {/* Right Column - Feature Cards */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {/* Feature Card 1 - IA Prediction */}
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-beauty-purple to-beauty-pink flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">IA Anti No-Show</h3>
                  <p className="text-gray-600 text-sm">Previne faltas com 92% de precisão usando machine learning</p>
                  <Badge className="mt-3 bg-green-100 text-green-700">92% Eficácia</Badge>
                </CardContent>
              </Card>

              {/* Feature Card 2 - Payments */}
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-beauty-pink to-beauty-purple flex items-center justify-center mb-4">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Pagamentos</h3>
                  <p className="text-gray-600 text-sm">PIX, cartão e cobrança automática integrada</p>
                  <Badge className="mt-3 bg-blue-100 text-blue-700">PIX Grátis</Badge>
                </CardContent>
              </Card>

              {/* Feature Card 3 - WhatsApp */}
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">WhatsApp API</h3>
                  <p className="text-gray-600 text-sm">Lembretes e confirmações automáticas</p>
                  <Badge className="mt-3 bg-green-100 text-green-700">Automático</Badge>
                </CardContent>
              </Card>

              {/* Feature Card 4 - Analytics */}
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-beauty-purple to-beauty-pink flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Analytics</h3>
                  <p className="text-gray-600 text-sm">Dashboards em tempo real e insights preditivos</p>
                  <Badge className="mt-3 bg-purple-100 text-purple-700">Tempo Real</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Floating ROI Card */}
            <Card className="absolute -bottom-4 -left-4 shadow-2xl border-0 bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-green-600 rotate-45" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">ROI Médio</p>
                    <p className="text-lg font-bold text-green-600">+347%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}