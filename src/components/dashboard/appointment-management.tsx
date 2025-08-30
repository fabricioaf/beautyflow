'use client'

import { useState } from 'react'
import { CalendarView } from '@/components/calendar/calendar-view'
import { AppointmentModal } from '@/components/calendar/appointment-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Plus
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Appointment {
  id: string
  clientName: string
  service: string
  time: string
  duration: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  price: number
}

interface AppointmentStats {
  todayTotal: number
  todayRevenue: number
  weekTotal: number
  weekRevenue: number
  pendingConfirmation: number
  completionRate: number
}

const mockStats: AppointmentStats = {
  todayTotal: 8,
  todayRevenue: 640,
  weekTotal: 45,
  weekRevenue: 3200,
  pendingConfirmation: 3,
  completionRate: 92
}

export function AppointmentManagement() {
  const [showModal, setShowModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | undefined>()

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowModal(true)
  }

  const handleNewAppointment = (date: Date, time?: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    setSelectedAppointment(undefined)
    setShowModal(true)
  }

  const handleSaveAppointment = (appointment: Appointment) => {
    // Aqui seria chamada a API para salvar
    console.log('Salvando agendamento:', appointment)
    // TODO: Implementar integração com API
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-600 mt-2">Gerencie seus horários e compromissos</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={() => handleNewAppointment(new Date())}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.todayTotal}</div>
            <p className="text-xs text-muted-foreground">
              Receita: {formatCurrency(mockStats.todayRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.weekTotal}</div>
            <p className="text-xs text-muted-foreground">
              Receita: {formatCurrency(mockStats.weekRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.pendingConfirmation}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Component */}
      <CalendarView
        onAppointmentClick={handleAppointmentClick}
        onDateClick={setSelectedDate}
        onNewAppointment={handleNewAppointment}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { client: 'Maria Silva', service: 'Corte + Escova', time: '09:00', status: 'confirmed' },
                { client: 'Ana Santos', service: 'Manicure', time: '10:30', status: 'pending' },
                { client: 'João Pedro', service: 'Barba', time: '14:00', status: 'confirmed' }
              ].map((apt, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{apt.client}</div>
                    <div className="text-sm text-gray-600">{apt.service} às {apt.time}</div>
                  </div>
                  <Badge className={getStatusColor(apt.status)}>
                    {apt.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => handleNewAppointment(new Date())}
              >
                <Plus className="w-5 h-5 mb-2" />
                <span className="text-sm">Novo Agendamento</span>
              </Button>
              
              <Button variant="outline" className="h-16 flex-col">
                <Clock className="w-5 h-5 mb-2" />
                <span className="text-sm">Horários Livres</span>
              </Button>
              
              <Button variant="outline" className="h-16 flex-col">
                <Users className="w-5 h-5 mb-2" />
                <span className="text-sm">Lista de Espera</span>
              </Button>
              
              <Button variant="outline" className="h-16 flex-col">
                <DollarSign className="w-5 h-5 mb-2" />
                <span className="text-sm">Faturamento</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Agendamento */}
      <AppointmentModal
        open={showModal}
        onOpenChange={setShowModal}
        appointment={selectedAppointment}
        initialDate={selectedDate}
        initialTime={selectedTime}
        onSave={handleSaveAppointment}
      />
    </div>
  )
}