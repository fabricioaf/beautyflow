'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MessageCircle, 
  Mail, 
  Smartphone, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  Filter,
  RefreshCw,
  TrendingUp,
  Bell
} from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

interface NotificationData {
  id: string
  professionalId: string
  appointmentId?: string
  type: string
  title: string
  message: string
  channel: 'whatsapp' | 'sms' | 'email'
  recipient: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  sentAt?: Date
  createdAt: Date
}

interface NotificationStats {
  total: number
  pending: number
  sent: number
  delivered: number
  failed: number
  byChannel: {
    whatsapp: number
    sms: number
    email: number
  }
  byType: Record<string, number>
}

export function NotificationManagement() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    channel: '',
    search: ''
  })

  useEffect(() => {
    loadNotifications()
    loadStats()
  }, [filters])

  const loadNotifications = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.type) params.append('type', filters.type)
      if (filters.channel) params.append('channel', filters.channel)

      const response = await fetch(`/api/notifications?${params}`)
      const data = await response.json()

      if (data.success) {
        let filteredData = data.data
        
        if (filters.search) {
          filteredData = filteredData.filter((n: NotificationData) => 
            n.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            n.message.toLowerCase().includes(filters.search.toLowerCase()) ||
            n.recipient.toLowerCase().includes(filters.search.toLowerCase())
          )
        }

        setNotifications(filteredData)
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/notifications/send')
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendPendingNotifications = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await response.json()

      if (data.success) {
        await loadNotifications()
        await loadStats()
        console.log('Notificações enviadas:', data.data)
      }
    } catch (error) {
      console.error('Erro ao enviar notificações:', error)
    } finally {
      setSending(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    }
    
    const icons = {
      pending: <Clock className="w-3 h-3" />,
      sent: <Send className="w-3 h-3" />,
      delivered: <CheckCircle className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />
    }

    return (
      <Badge className={`${variants[status as keyof typeof variants]} flex items-center gap-1`}>
        {icons[status as keyof typeof icons]}
        {status === 'pending' ? 'Pendente' : 
         status === 'sent' ? 'Enviado' : 
         status === 'delivered' ? 'Entregue' : 'Falhou'}
      </Badge>
    )
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-green-600" />
      case 'sms': return <Smartphone className="w-4 h-4 text-blue-600" />
      case 'email': return <Mail className="w-4 h-4 text-purple-600" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      'APPOINTMENT_CONFIRMATION': 'Confirmação',
      'APPOINTMENT_REMINDER': 'Lembrete',
      'PAYMENT_CONFIRMATION': 'Pagamento',
      'APPOINTMENT_CANCELLATION': 'Cancelamento',
      'NO_SHOW_WARNING': 'Falta',
      'MARKETING': 'Marketing'
    }
    return labels[type as keyof typeof labels] || type
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-gray-600">Gerencie e monitore suas notificações automáticas</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadNotifications} 
            variant="outline" 
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={sendPendingNotifications}
            disabled={sending}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Enviando...' : 'Enviar Pendentes'}
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Bell className="w-8 h-8 text-beauty-pink-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Entregues</p>
                  <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taxa de Entrega</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar notificações..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.channel} onValueChange={(value) => setFilters(prev => ({ ...prev, channel: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="APPOINTMENT_CONFIRMATION">Confirmação</SelectItem>
                <SelectItem value="APPOINTMENT_REMINDER">Lembrete</SelectItem>
                <SelectItem value="PAYMENT_CONFIRMATION">Pagamento</SelectItem>
                <SelectItem value="APPOINTMENT_CANCELLATION">Cancelamento</SelectItem>
                <SelectItem value="NO_SHOW_WARNING">Falta</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma notificação encontrada</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getChannelIcon(notification.channel)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm">{notification.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(notification.type)}
                          </Badge>
                          {getStatusBadge(notification.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Para: {notification.recipient}</span>
                          <span>Criado: {formatDate(notification.createdAt)} às {formatTime(notification.createdAt)}</span>
                          {notification.sentAt && (
                            <span>Enviado: {formatDate(notification.sentAt)} às {formatTime(notification.sentAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}