'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageCircle,
  User,
  Calendar as CalendarIcon
} from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

interface RescheduleOption {
  date: Date
  available: boolean
  reason?: string
}

interface RescheduleData {
  appointment: any
  canReschedule: boolean
  validationErrors: string[]
  validationWarnings: string[]
  availableOptions: RescheduleOption[]
  unavailableOptions: RescheduleOption[]
  policy: any
  rescheduleCount: number
}

interface RescheduleModalProps {
  appointmentId: string
  onRescheduleComplete?: (newAppointment: any) => void
  trigger?: React.ReactNode
}

export function RescheduleModal({ appointmentId, onRescheduleComplete, trigger }: RescheduleModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rescheduleData, setRescheduleData] = useState<RescheduleData | null>(null)
  const [selectedOption, setSelectedOption] = useState<RescheduleOption | null>(null)
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (open && appointmentId) {
      loadRescheduleOptions()
    }
  }, [open, appointmentId])

  const loadRescheduleOptions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/appointments/reschedule?appointmentId=${appointmentId}`)
      const data = await response.json()

      if (data.success) {
        setRescheduleData(data.data)
      } else {
        console.error('Erro ao carregar opções de reagendamento:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar opções de reagendamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!selectedOption || !rescheduleData) return

    setProcessing(true)
    try {
      const response = await fetch('/api/appointments/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          newDateTime: selectedOption.date.toISOString(),
          reason,
          initiatedBy: 'professional',
          notifyClient: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setOpen(false)
        onRescheduleComplete?.(data.data)
        console.log('Reagendamento realizado com sucesso!')
      } else {
        console.error('Erro no reagendamento:', data.error)
      }
    } catch (error) {
      console.error('Erro ao reagendar:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getAvailabilityBadge = (available: boolean) => {
    return available ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Disponível
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Indisponível
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reagendar
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Reagendar Agendamento
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-beauty-pink-500"></div>
          </div>
        ) : rescheduleData ? (
          <div className="space-y-6">
            {/* Informações do Agendamento Atual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agendamento Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p><strong>Serviço:</strong> {rescheduleData.appointment.serviceName}</p>
                    <p><strong>Data:</strong> {formatDate(new Date(rescheduleData.appointment.scheduledFor))}</p>
                    <p><strong>Horário:</strong> {formatTime(new Date(rescheduleData.appointment.scheduledFor))}</p>
                  </div>
                  <div className="space-y-2">
                    <p><strong>Duração:</strong> {rescheduleData.appointment.serviceDuration} min</p>
                    <p><strong>Valor:</strong> R$ {rescheduleData.appointment.servicePrice.toFixed(2)}</p>
                    <p><strong>Reagendamentos:</strong> {rescheduleData.rescheduleCount} de {rescheduleData.policy.maxReschedulesPerAppointment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avisos e Validações */}
            {!rescheduleData.canReschedule && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Reagendamento Não Permitido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {rescheduleData.validationErrors.map((error, index) => (
                      <li key={index} className="text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {rescheduleData.validationWarnings.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Avisos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {rescheduleData.validationWarnings.map((warning, index) => (
                      <li key={index} className="text-yellow-700">• {warning}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {rescheduleData.canReschedule && (
              <>
                {/* Horários Disponíveis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Horários Disponíveis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rescheduleData.availableOptions.map((option, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedOption === option
                              ? 'border-beauty-pink-500 bg-beauty-pink-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedOption(option)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {formatDate(option.date)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatTime(option.date)}
                              </p>
                            </div>
                            {getAvailabilityBadge(option.available)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {rescheduleData.availableOptions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum horário disponível encontrado</p>
                        <p className="text-sm">Tente reagendar para uma data mais distante</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Motivo do Reagendamento */}
                <Card>
                  <CardHeader>
                    <CardTitle>Motivo do Reagendamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Motivo (opcional)</Label>
                      <Input
                        id="reason"
                        placeholder="Ex: Conflito de horário, emergência..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Ações */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MessageCircle className="w-4 h-4" />
                    Cliente será notificado automaticamente
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleReschedule}
                      disabled={!selectedOption || processing}
                    >
                      {processing ? 'Reagendando...' : 'Confirmar Reagendamento'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Horários Indisponíveis (para referência) */}
            {rescheduleData.unavailableOptions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Horários Indisponíveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rescheduleData.unavailableOptions.slice(0, 5).map((option, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>
                          {formatDate(option.date)} às {formatTime(option.date)}
                        </span>
                        <span className="text-sm text-red-600">{option.reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <p className="text-gray-500">Erro ao carregar dados de reagendamento</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}