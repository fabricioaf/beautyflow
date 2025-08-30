'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientStatsCard } from '@/components/dashboard/client-stats-card'
import { 
  CalendarDays,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Star,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Mock data - em produção viria de uma API
const dashboardStats = {
  totalRevenue: 12500.00,
  monthlyGrowth: 15.2,
  todayAppointments: 8,
  totalClients: 245,
  averageRating: 4.8,
  noShowRate: 8.5
}

const recentAppointments = [
  { id: 1, client: 'Maria Silva', service: 'Corte + Escova', time: '09:00', status: 'confirmed' },
  { id: 2, client: 'Ana Santos', service: 'Manicure', time: '10:30', status: 'pending' },
  { id: 3, client: 'João Pedro', service: 'Barba', time: '14:00', status: 'completed' },
  { id: 4, client: 'Carla Lima', service: 'Coloração', time: '15:30', status: 'confirmed' }
]

const clientStats = {
  totalClients: 245,
  newClientsThisMonth: 18,
  averageRating: 4.8,
  returnRate: 75
}

const topClients = [
  {
    id: '1',
    name: 'Maria Silva',
    totalSpent: 850,
    lastVisit: new Date('2024-01-15'),
    loyaltyLevel: 'Ouro' as const,
    nextAppointment: new Date('2024-01-20')
  },
  {
    id: '2', 
    name: 'Ana Santos',
    totalSpent: 620,
    lastVisit: new Date('2024-01-10'),
    loyaltyLevel: 'Prata' as const
  },
  {
    id: '3',
    name: 'Carla Lima', 
    totalSpent: 420,
    lastVisit: new Date('2024-01-08'),
    loyaltyLevel: 'Bronze' as const
  }
]

function getStatusColor(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800'
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'completed': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'confirmed': return <CheckCircle className="w-4 h-4" />
    case 'pending': return <Clock className="w-4 h-4" />
    case 'completed': return <Star className="w-4 h-4" />
    default: return <AlertCircle className="w-4 h-4" />
  }
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Visão geral do seu negócio de beleza</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{dashboardStats.monthlyGrowth}%</span> em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">
              4 confirmados, 2 pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              +18 novos este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de No-Show</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.noShowRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-2.1%</span> em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(appointment.status)}
                    <div>
                      <p className="font-medium">{appointment.client}</p>
                      <p className="text-sm text-gray-600">{appointment.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{appointment.time}</p>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status === 'confirmed' ? 'Confirmado' :
                       appointment.status === 'pending' ? 'Pendente' :
                       appointment.status === 'completed' ? 'Concluído' : appointment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 bg-beauty-pink-50 rounded-lg text-left hover:bg-beauty-pink-100 transition-colors">
                <CalendarDays className="w-6 h-6 text-beauty-pink-600 mb-2" />
                <p className="font-medium">Novo Agendamento</p>
                <p className="text-sm text-gray-600">Agendar cliente</p>
              </button>
              
              <button className="p-4 bg-beauty-purple-50 rounded-lg text-left hover:bg-beauty-purple-100 transition-colors">
                <Users className="w-6 h-6 text-beauty-purple-600 mb-2" />
                <p className="font-medium">Novo Cliente</p>
                <p className="text-sm text-gray-600">Cadastrar cliente</p>
              </button>
              
              <button className="p-4 bg-green-50 rounded-lg text-left hover:bg-green-100 transition-colors">
                <DollarSign className="w-6 h-6 text-green-600 mb-2" />
                <p className="font-medium">Registrar Pagamento</p>
                <p className="text-sm text-gray-600">PIX ou cartão</p>
              </button>
              
              <button className="p-4 bg-blue-50 rounded-lg text-left hover:bg-blue-100 transition-colors">
                <Star className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-medium">Enviar WhatsApp</p>
                <p className="text-sm text-gray-600">Lembrete automático</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Stats */}
      <ClientStatsCard stats={clientStats} topClients={topClients} />
    </div>
  )
}