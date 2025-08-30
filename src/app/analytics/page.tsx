'use client'

import { useState } from 'react'
import { RealtimeDashboard } from '@/components/analytics/realtime-dashboard'
import { FinancialDashboard } from '@/components/analytics/financial-dashboard'
import { PredictiveDashboard } from '@/components/analytics/predictive-dashboard'
import { CustomerInsightsDashboard } from '@/components/analytics/customer-insights-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target,
  Zap,
  Eye,
  Settings,
  Download,
  Share,
  Calendar,
  Brain,
  PieChart,
  Activity,
  Lightbulb
} from 'lucide-react'

export default function AnalyticsPage() {
  const [selectedTab, setSelectedTab] = useState('realtime')
  const professionalId = 'prof_123'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-beauty-purple-100 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-beauty-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Analytics & BI
                  </h1>
                  <p className="text-gray-600">
                    Inteligência de negócios em tempo real para seu salão
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
                <Button className="beauty-gradient" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Relatório
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Tempo Real
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="predictive" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Preditiva
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="mt-6">
            <RealtimeDashboard 
              professionalId={professionalId}
              autoRefresh={true}
              refreshInterval={30}
            />
          </TabsContent>

          <TabsContent value="financial" className="mt-6">
            <FinancialDashboard professionalId={professionalId} />
          </TabsContent>

          <TabsContent value="predictive" className="mt-6">
            <PredictiveDashboard professionalId={professionalId} />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <CustomerInsightsDashboard professionalId={professionalId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}