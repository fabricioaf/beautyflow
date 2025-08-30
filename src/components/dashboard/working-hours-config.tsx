'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Plus, Trash2, Calendar } from 'lucide-react'

interface WorkingHours {
  dayOfWeek: number // 0 = domingo, 1 = segunda, ...
  isOpen: boolean
  openTime: string
  closeTime: string
  breakStart?: string
  breakEnd?: string
}

interface Holiday {
  id: string
  date: string
  name: string
  type: 'holiday' | 'vacation' | 'event'
}

const dayNames = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
  'Quinta-feira', 'Sexta-feira', 'Sábado'
]

const timeSlots = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00'
]

export function WorkingHoursConfig() {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '15:00' }
  ])

  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: '1', date: '2024-12-25', name: 'Natal', type: 'holiday' },
    { id: '2', date: '2024-12-31', name: 'Réveillon', type: 'holiday' },
    { id: '3', date: '2024-02-13', name: 'Carnaval', type: 'holiday' }
  ])

  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'holiday' as const })

  const updateWorkingHours = (dayOfWeek: number, field: keyof WorkingHours, value: any) => {
    setWorkingHours(prev => 
      prev.map(wh => 
        wh.dayOfWeek === dayOfWeek 
          ? { ...wh, [field]: value }
          : wh
      )
    )
  }

  const addHoliday = () => {
    if (newHoliday.date && newHoliday.name) {
      const holiday: Holiday = {
        id: Date.now().toString(),
        ...newHoliday
      }
      setHolidays(prev => [...prev, holiday])
      setNewHoliday({ date: '', name: '', type: 'holiday' })
    }
  }

  const removeHoliday = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id))
  }

  const getHolidayTypeColor = (type: string) => {
    switch (type) {
      case 'holiday': return 'bg-red-100 text-red-800'
      case 'vacation': return 'bg-blue-100 text-blue-800'
      case 'event': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHolidayTypeText = (type: string) => {
    switch (type) {
      case 'holiday': return 'Feriado'
      case 'vacation': return 'Férias'
      case 'event': return 'Evento'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      {/* Horários de Funcionamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horários de Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workingHours.map((wh) => (
              <div key={wh.dayOfWeek} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-32">
                  <Label className="font-medium">{dayNames[wh.dayOfWeek]}</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={wh.isOpen}
                    onChange={(e) => updateWorkingHours(wh.dayOfWeek, 'isOpen', e.target.checked)}
                    className="rounded"
                  />
                  <Label className="text-sm">Aberto</Label>
                </div>

                {wh.isOpen && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Abertura:</Label>
                      <Select
                        value={wh.openTime}
                        onValueChange={(value) => updateWorkingHours(wh.dayOfWeek, 'openTime', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Fechamento:</Label>
                      <Select
                        value={wh.closeTime}
                        onValueChange={(value) => updateWorkingHours(wh.dayOfWeek, 'closeTime', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Almoço:</Label>
                      <Select
                        value={wh.breakStart || ''}
                        onValueChange={(value) => updateWorkingHours(wh.dayOfWeek, 'breakStart', value || undefined)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="--" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem intervalo</SelectItem>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {wh.breakStart && (
                        <>
                          <span className="text-sm text-gray-500">até</span>
                          <Select
                            value={wh.breakEnd || ''}
                            onValueChange={(value) => updateWorkingHours(wh.dayOfWeek, 'breakEnd', value || undefined)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feriados e Bloqueios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Feriados e Bloqueios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Adicionar novo feriado */}
            <div className="flex items-end gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="holiday-date">Data</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div className="flex-1">
                <Label htmlFor="holiday-name">Nome</Label>
                <Input
                  id="holiday-name"
                  placeholder="Ex: Natal, Férias..."
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="holiday-type">Tipo</Label>
                <Select
                  value={newHoliday.type}
                  onValueChange={(value: 'holiday' | 'vacation' | 'event') => 
                    setNewHoliday(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">Feriado</SelectItem>
                    <SelectItem value="vacation">Férias</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={addHoliday}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Lista de feriados */}
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{holiday.name}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(holiday.date).toLocaleDateString('pt-BR')}
                    </div>
                    <Badge className={getHolidayTypeColor(holiday.type)}>
                      {getHolidayTypeText(holiday.type)}
                    </Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHoliday(holiday.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {holidays.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum feriado ou bloqueio configurado
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">
          Cancelar
        </Button>
        <Button>
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}