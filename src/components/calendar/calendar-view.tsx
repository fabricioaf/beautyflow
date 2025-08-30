'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  Calendar as CalendarIcon
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

interface Appointment {
  id: string
  clientName: string
  service: string
  time: string
  duration: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  price: number
}

interface CalendarViewProps {
  onAppointmentClick?: (appointment: Appointment) => void
  onDateClick?: (date: Date) => void
  onNewAppointment?: (date: Date, time?: string) => void
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    clientName: 'Maria Silva',
    service: 'Corte + Escova',
    time: '09:00',
    duration: 90,
    status: 'confirmed',
    price: 120
  },
  {
    id: '2',
    clientName: 'Ana Santos',
    service: 'Manicure',
    time: '10:30',
    duration: 60,
    status: 'pending',
    price: 50
  },
  {
    id: '3',
    clientName: 'João Pedro',
    service: 'Barba',
    time: '14:00',
    duration: 45,
    status: 'completed',
    price: 40
  },
  {
    id: '4',
    clientName: 'Carla Lima',
    service: 'Coloração',
    time: '15:30',
    duration: 120,
    status: 'confirmed',
    price: 200
  }
]

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
]

function getStatusColor(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'confirmed': return 'Confirmado'
    case 'pending': return 'Pendente'
    case 'completed': return 'Concluído'
    case 'cancelled': return 'Cancelado'
    default: return status
  }
}

export function CalendarView({ onAppointmentClick, onDateClick, onNewAppointment }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const currentMonthAppointments = useMemo(() => {
    // Para demonstração, vamos mostrar os agendamentos apenas para hoje
    const today = new Date()
    if (selectedDate.toDateString() === today.toDateString()) {
      return mockAppointments
    }
    return []
  }, [selectedDate])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 1)
      } else {
        newDate.setDate(prev.getDate() + 1)
      }
      return newDate
    })
  }

  const renderDayView = () => {
    return (
      <div className="space-y-4">
        {/* Header do dia */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-semibold">
              {formatDate(selectedDate)}
            </h3>
            <Badge variant="outline">
              {currentMonthAppointments.length} agendamentos
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDay('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDay('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grade de horários */}
        <div className="grid grid-cols-1 gap-2">
          {timeSlots.map((time) => {
            const appointment = currentMonthAppointments.find(apt => apt.time === time)
            
            return (
              <div
                key={time}
                className="flex items-center min-h-[60px] border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-16 text-sm font-medium text-gray-600">
                  {time}
                </div>
                
                {appointment ? (
                  <div
                    className={cn(
                      "flex-1 ml-4 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all",
                      getStatusColor(appointment.status)
                    )}
                    onClick={() => onAppointmentClick?.(appointment)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{appointment.clientName}</div>
                        <div className="text-sm opacity-80">{appointment.service}</div>
                        <div className="flex items-center text-xs mt-1 opacity-70">
                          <Clock className="w-3 h-3 mr-1" />
                          {appointment.duration}min • R$ {appointment.price}
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <button
                    className="flex-1 ml-4 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-beauty-pink hover:text-beauty-pink transition-colors"
                    onClick={() => onNewAppointment?.(selectedDate, time)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agendar horário
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()

    const days = []
    
    // Dias do mês anterior
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(firstDayOfMonth)
      day.setDate(day.getDate() - (i + 1))
      days.push({
        date: day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      })
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = date.toDateString() === selectedDate.toDateString()
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isSelected
      })
    }

    // Dias do próximo mês
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      })
    }

    return (
      <div className="space-y-4">
        {/* Header dos dias da semana */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grade do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              className={cn(
                "h-12 p-1 text-sm border rounded-lg hover:bg-gray-50 transition-colors",
                day.isCurrentMonth 
                  ? "text-gray-900 border-gray-200" 
                  : "text-gray-400 border-gray-100",
                day.isToday && "bg-beauty-pink text-white border-beauty-pink",
                day.isSelected && !day.isToday && "bg-beauty-pink-50 border-beauty-pink",
              )}
              onClick={() => {
                setSelectedDate(day.date)
                setView('day')
                onDateClick?.(day.date)
              }}
            >
              {day.date.getDate()}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Calendário de Agendamentos
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* View selector */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('day')}
                className="rounded-r-none"
              >
                Dia
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('month')}
                className="rounded-l-none"
              >
                Mês
              </Button>
            </div>

            {/* Navigation */}
            {view === 'month' && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="min-w-[140px] text-center font-medium">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            <Button
              onClick={() => onNewAppointment?.(selectedDate)}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {view === 'day' ? renderDayView() : renderMonthView()}
      </CardContent>
    </Card>
  )
}