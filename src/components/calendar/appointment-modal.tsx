'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  User, 
  Scissors, 
  DollarSign, 
  Calendar,
  Search
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  lastVisit?: Date
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
  category: string
}

interface Appointment {
  id?: string
  clientId: string
  clientName: string
  serviceId: string
  serviceName: string
  date: Date
  time: string
  duration: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  notes?: string
}

interface AppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: Appointment
  initialDate?: Date
  initialTime?: string
  onSave: (appointment: Appointment) => void
}

const mockClients: Client[] = [
  { id: '1', name: 'Maria Silva', phone: '(11) 99999-1111', email: 'maria@email.com', lastVisit: new Date('2024-01-10') },
  { id: '2', name: 'Ana Santos', phone: '(11) 99999-2222', email: 'ana@email.com', lastVisit: new Date('2024-01-08') },
  { id: '3', name: 'João Pedro', phone: '(11) 99999-3333', email: 'joao@email.com' },
  { id: '4', name: 'Carla Lima', phone: '(11) 99999-4444', email: 'carla@email.com', lastVisit: new Date('2024-01-05') },
  { id: '5', name: 'Roberto Costa', phone: '(11) 99999-5555', email: 'roberto@email.com' }
]

const mockServices: Service[] = [
  { id: '1', name: 'Corte Feminino', duration: 60, price: 80, category: 'Cabelo' },
  { id: '2', name: 'Corte + Escova', duration: 90, price: 120, category: 'Cabelo' },
  { id: '3', name: 'Coloração', duration: 120, price: 200, category: 'Cabelo' },
  { id: '4', name: 'Hidratação', duration: 45, price: 60, category: 'Cabelo' },
  { id: '5', name: 'Manicure', duration: 60, price: 50, category: 'Unhas' },
  { id: '6', name: 'Pedicure', duration: 60, price: 50, category: 'Unhas' },
  { id: '7', name: 'Mani + Pedi', duration: 90, price: 90, category: 'Unhas' },
  { id: '8', name: 'Barba', duration: 45, price: 40, category: 'Barba' },
  { id: '9', name: 'Barba + Cabelo', duration: 90, price: 100, category: 'Barba' }
]

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
]

export function AppointmentModal({ 
  open, 
  onOpenChange, 
  appointment, 
  initialDate, 
  initialTime, 
  onSave 
}: AppointmentModalProps) {
  const [formData, setFormData] = useState<Partial<Appointment>>({})
  const [clientSearch, setClientSearch] = useState('')
  const [filteredClients, setFilteredClients] = useState<Client[]>(mockClients)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isNewClient, setIsNewClient] = useState(false)

  useEffect(() => {
    if (appointment) {
      setFormData(appointment)
      const client = mockClients.find(c => c.id === appointment.clientId)
      setSelectedClient(client || null)
      setClientSearch(appointment.clientName)
      const service = mockServices.find(s => s.name === appointment.serviceName)
      setSelectedService(service || null)
    } else {
      setFormData({
        date: initialDate || new Date(),
        time: initialTime || '09:00',
        status: 'pending'
      })
      setSelectedClient(null)
      setSelectedService(null)
      setClientSearch('')
    }
  }, [appointment, initialDate, initialTime, open])

  useEffect(() => {
    const filtered = mockClients.filter(client =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.phone.includes(clientSearch)
    )
    setFilteredClients(filtered)
    setIsNewClient(filtered.length === 0 && clientSearch.length > 0)
  }, [clientSearch])

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setClientSearch(client.name)
    setFormData(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name
    }))
  }

  const handleServiceSelect = (serviceId: string) => {
    const service = mockServices.find(s => s.id === serviceId)
    if (service) {
      setSelectedService(service)
      setFormData(prev => ({
        ...prev,
        serviceId: service.id,
        serviceName: service.name,
        duration: service.duration,
        price: service.price
      }))
    }
  }

  const handleSave = () => {
    if (!selectedClient && !isNewClient) return
    if (!selectedService) return
    if (!formData.date || !formData.time) return

    const appointmentData: Appointment = {
      id: appointment?.id || `apt_${Date.now()}`,
      clientId: selectedClient?.id || `client_${Date.now()}`,
      clientName: selectedClient?.name || clientSearch,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: formData.date,
      time: formData.time,
      duration: selectedService.duration,
      price: selectedService.price,
      status: formData.status || 'pending',
      notes: formData.notes || ''
    }

    onSave(appointmentData)
    onOpenChange(false)
  }

  const isFormValid = () => {
    return (selectedClient || isNewClient) && 
           selectedService && 
           formData.date && 
           formData.time &&
           clientSearch.trim().length > 0
  }

  const getEndTime = () => {
    if (!formData.time || !selectedService?.duration) return ''
    
    const [hours, minutes] = formData.time.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + selectedService.duration
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
          <DialogDescription>
            {appointment ? 'Altere as informações do agendamento' : 'Preencha os dados para criar um novo agendamento'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="client"
                placeholder="Buscar cliente ou digite um novo nome..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Lista de clientes filtrados */}
            {clientSearch && !selectedClient && (
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center justify-between"
                      onClick={() => handleClientSelect(client)}
                    >
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.phone}</div>
                      </div>
                      {client.lastVisit && (
                        <Badge variant="outline" className="text-xs">
                          Última visita: {formatDate(client.lastVisit)}
                        </Badge>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Novo cliente: {clientSearch}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cliente selecionado */}
            {selectedClient && (
              <div className="flex items-center gap-2 p-2 bg-beauty-pink-50 rounded border">
                <User className="w-4 h-4 text-beauty-pink-600" />
                <div>
                  <div className="font-medium">{selectedClient.name}</div>
                  <div className="text-sm text-gray-600">{selectedClient.phone}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(null)
                    setClientSearch('')
                  }}
                >
                  Alterar
                </Button>
              </div>
            )}
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <Label htmlFor="service">Serviço</Label>
            <Select onValueChange={handleServiceSelect} value={selectedService?.id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(
                  mockServices.reduce((acc, service) => {
                    if (!acc[service.category]) acc[service.category] = []
                    acc[service.category].push(service)
                    return acc
                  }, {} as Record<string, Service[]>)
                ).map(([category, services]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-sm font-semibold text-gray-600">
                      {category}
                    </div>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{service.name}</span>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-3 h-3" />
                            {service.duration}min
                            <span>•</span>
                            {formatCurrency(service.price)}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            {/* Serviço selecionado */}
            {selectedService && (
              <div className="flex items-center gap-2 p-2 bg-beauty-purple-50 rounded border">
                <Scissors className="w-4 h-4 text-beauty-purple-600" />
                <div className="flex-1">
                  <div className="font-medium">{selectedService.name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {selectedService.duration} minutos
                    <span>•</span>
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(selectedService.price)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date ? formData.date.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  date: e.target.value ? new Date(e.target.value) : undefined
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Select 
                value={formData.time || ''} 
                onValueChange={(time) => setFormData(prev => ({ ...prev, time }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumo do horário */}
          {formData.time && selectedService && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
              <Calendar className="w-4 h-4 text-gray-600" />
              <div className="text-sm">
                <span className="font-medium">
                  {formData.time} - {getEndTime()}
                </span>
                <span className="text-gray-600 ml-2">
                  ({selectedService.duration} minutos)
                </span>
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Input
              id="notes"
              placeholder="Observações sobre o agendamento..."
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isFormValid()}
          >
            {appointment ? 'Salvar Alterações' : 'Criar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}