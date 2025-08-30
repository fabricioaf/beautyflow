'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { 
  Bell,
  MessageSquare,
  Mail,
  Phone,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Plus,
  X,
  Eye,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

interface ReminderConfig {
  enabled: boolean
  hoursBeforeAppointment: number[]
  useWhatsApp: boolean
  useEmail: boolean
  useSMS: boolean
  customTemplate?: string
}

interface ReminderStats {
  total: number
  sent: number
  pending: number
  failed: number
  canceled: number
  successRate: number
}

interface Reminder {
  id: string
  appointmentId: string
  scheduledFor: string
  type: 'WHATSAPP' | 'EMAIL' | 'SMS'
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELED'
  sentAt?: string
  errorMessage?: string
  appointment: {
    client: {
      name: string
      phone?: string
      email?: string
    }
    service?: {
      name: string
    }
    serviceName: string
    scheduledFor: string
  }
}

export default function RemindersManagement() {
  const [config, setConfig] = useState<ReminderConfig>({
    enabled: true,
    hoursBeforeAppointment: [24, 2],
    useWhatsApp: true,
    useEmail: false,
    useSMS: false,
    customTemplate: ''
  })
  const [stats, setStats] = useState<ReminderStats | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newHours, setNewHours] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
    loadStats()
    loadReminders()
  }, [page, filters])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/reminders?action=config')
      const data = await response.json()

      if (response.ok) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/reminders?action=stats')
      const data = await response.json()

      if (response.ok) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadReminders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        action: 'list',
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })

      const response = await fetch(`/api/reminders?${params}`)
      const data = await response.json()

      if (response.ok) {
        setReminders(data.reminders)
        setTotalPages(data.totalPages)
      } else {
        toast({
          title: "Erro ao carregar lembretes",
          description: data.error || "Tente novamente",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading reminders:', error)
      toast({
        title: "Erro ao carregar lembretes",
        description: "Erro de conexão",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          config
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Configuração salva!",
          description: "Configurações de lembretes atualizadas com sucesso",
          variant: "default"
        })
      } else {
        throw new Error(data.error || 'Erro ao salvar configuração')
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const addHours = () => {
    const hours = parseInt(newHours)
    if (hours > 0 && hours <= 168 && !config.hoursBeforeAppointment.includes(hours)) {
      setConfig(prev => ({
        ...prev,
        hoursBeforeAppointment: [...prev.hoursBeforeAppointment, hours].sort((a, b) => b - a)
      }))
      setNewHours('')
    }
  }

  const removeHours = (hours: number) => {
    setConfig(prev => ({
      ...prev,
      hoursBeforeAppointment: prev.hoursBeforeAppointment.filter(h => h !== hours)
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'CANCELED':
        return <X className="w-4 h-4 text-gray-600" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SENT: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELED: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WHATSAPP':
        return <MessageSquare className="w-4 h-4 text-green-600" />
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-blue-600" />
      case 'SMS':
        return <Phone className="w-4 h-4 text-purple-600" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-beauty-pink to-beauty-purple bg-clip-text text-transparent">
            Lembretes Automáticos
          </h1>
          <p className="text-gray-600">Configure e monitore lembretes via WhatsApp</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadReminders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="reminders">Lembretes</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        {/* Configuração */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações de Lembretes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Estado Geral */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Lembretes Automáticos</h3>
                  <p className="text-sm text-gray-600">Ativar/desativar sistema de lembretes</p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              {config.enabled && (
                <>
                  {/* Canais de Envio */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Canais de Envio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={config.useWhatsApp}
                          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useWhatsApp: checked }))}
                        />
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        <span>WhatsApp</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={config.useEmail}
                          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useEmail: checked }))}
                        />
                        <Mail className="w-5 h-5 text-blue-600" />
                        <span>Email</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={config.useSMS}
                          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useSMS: checked }))}
                        />
                        <Phone className="w-5 h-5 text-purple-600" />
                        <span>SMS</span>
                      </div>
                    </div>
                  </div>

                  {/* Horários dos Lembretes */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Horários dos Lembretes</h3>
                    <p className="text-sm text-gray-600">
                      Configure quantas horas antes do agendamento os lembretes devem ser enviados
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {config.hoursBeforeAppointment.map((hours) => (
                        <Badge key={hours} variant="outline" className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {hours}h antes
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() => removeHours(hours)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Horas"
                        value={newHours}
                        onChange={(e) => setNewHours(e.target.value)}
                        className="w-24"
                        min="1"
                        max="168"
                      />
                      <Button onClick={addHours} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Template Personalizado */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Template Personalizado (Opcional)</h3>
                    <p className="text-sm text-gray-600">
                      Deixe em branco para usar o template padrão
                    </p>
                    <textarea
                      className="w-full min-h-[100px] p-3 border rounded-md"
                      placeholder="Olá {{clientName}}, você tem um agendamento para {{serviceName}} amanhã às {{appointmentTime}}..."
                      value={config.customTemplate || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, customTemplate: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500">
                      Variáveis disponíveis: {'{'}{'{'} clientName {'}'}{'}'}, {'{'}{'{'} serviceName {'}'}{'}'}, {'{'}{'{'} appointmentDate {'}'}{'}'}, {'{'}{'{'} appointmentTime {'}'}{'}'}, {'{'}{'{'} professionalName {'}'}{'}'}, {'{'}{'{'} businessName {'}'}{'}'}
                    </p>
                  </div>
                </>
              )}

              <Button onClick={saveConfig} disabled={saving} className="beauty-gradient text-white">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lembretes */}
        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lembretes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="SENT">Enviado</SelectItem>
                    <SelectItem value="FAILED">Falharam</SelectItem>
                    <SelectItem value="CANCELED">Cancelados</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  placeholder="Data início"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />

                <Input
                  type="date"
                  placeholder="Data fim"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Agendado para</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminders.map((reminder) => {
                        const scheduled = formatDate(reminder.scheduledFor)
                        const sent = reminder.sentAt ? formatDate(reminder.sentAt) : null
                        
                        return (
                          <TableRow key={reminder.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{reminder.appointment.client.name}</div>
                                <div className="text-sm text-gray-500">
                                  {reminder.appointment.client.phone || reminder.appointment.client.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {reminder.appointment.service?.name || reminder.appointment.serviceName}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTypeIcon(reminder.type)}
                                {reminder.type}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{scheduled.date}</div>
                                <div className="text-sm text-gray-500">{scheduled.time}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {sent ? (
                                <div>
                                  <div>{sent.date}</div>
                                  <div className="text-sm text-gray-500">{sent.time}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(reminder.status)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Página {page} de {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          size="sm"
                          variant="outline"
                        >
                          Anterior
                        </Button>
                        <Button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          size="sm"
                          variant="outline"
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estatísticas */}
        <TabsContent value="stats" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total de Lembretes</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <Bell className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Enviados</p>
                      <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pendentes</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Falharam</p>
                      <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Cancelados</p>
                      <p className="text-2xl font-bold text-gray-600">{stats.canceled}</p>
                    </div>
                    <X className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}