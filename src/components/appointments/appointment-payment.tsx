'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  CreditCard,
  QrCode,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Receipt,
  Send
} from 'lucide-react'
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

interface AppointmentPaymentProps {
  appointment: {
    id: string
    serviceName: string
    servicePrice: number
    scheduledFor: string
    status: string
    paymentStatus: string
    client: {
      name: string
      email: string
      phone?: string
    }
  }
  onPaymentCreated?: () => void
}

export default function AppointmentPayment({ appointment, onPaymentCreated }: AppointmentPaymentProps) {
  const [isCharging, setIsCharging] = useState(false)
  const [showChargeDialog, setShowChargeDialog] = useState(false)
  const [chargeData, setChargeData] = useState({
    method: 'PIX' as 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD',
    amount: appointment.servicePrice * 100, // Converter para centavos
    description: ''
  })
  const [transactions, setTransactions] = useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const { toast } = useToast()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100)
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PAID: 'default',
      PENDING: 'secondary',
      PROCESSING: 'secondary',
      FAILED: 'destructive',
      CANCELED: 'outline',
      REFUNDED: 'outline'
    }

    const colors: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELED: 'bg-gray-100 text-gray-800',
      REFUNDED: 'bg-purple-100 text-purple-800'
    }

    const icons: Record<string, React.ReactNode> = {
      PAID: <CheckCircle className="w-3 h-3" />,
      PENDING: <Clock className="w-3 h-3" />,
      PROCESSING: <Loader2 className="w-3 h-3 animate-spin" />,
      FAILED: <XCircle className="w-3 h-3" />,
      CANCELED: <XCircle className="w-3 h-3" />,
      REFUNDED: <AlertTriangle className="w-3 h-3" />
    }

    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status]}>
        {icons[status]}
        <span className="ml-1">{status}</span>
      </Badge>
    )
  }

  const calculateFees = (amount: number, method: string) => {
    let feeAmount = 0
    if (method === 'CREDIT_CARD') {
      feeAmount = Math.round(amount * 0.029) + 30 // 2.9% + R$ 0,30
    } else if (method === 'DEBIT_CARD') {
      feeAmount = Math.round(amount * 0.019) + 30 // 1.9% + R$ 0,30
    }
    // PIX sem taxa
    return {
      feeAmount,
      netAmount: amount - feeAmount
    }
  }

  const handleCreateCharge = async () => {
    if (chargeData.amount < 100) {
      toast({
        title: "Valor inválido",
        description: "O valor mínimo para cobrança é R$ 1,00",
        variant: "destructive"
      })
      return
    }

    setIsCharging(true)

    try {
      const response = await fetch(`/api/appointments/${appointment.id}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          method: chargeData.method,
          amount: chargeData.amount,
          description: chargeData.description || `Pagamento para ${appointment.serviceName}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar cobrança')
      }

      toast({
        title: "Cobrança criada com sucesso!",
        description: `Cobrança de ${formatCurrency(chargeData.amount)} foi enviada para o cliente`,
        variant: "default"
      })

      setShowChargeDialog(false)
      onPaymentCreated?.()
      loadTransactions()

    } catch (error: any) {
      toast({
        title: "Erro ao criar cobrança",
        description: error.message || "Tente novamente em alguns instantes",
        variant: "destructive"
      })
    } finally {
      setIsCharging(false)
    }
  }

  const loadTransactions = async () => {
    setLoadingTransactions(true)
    try {
      const response = await fetch(`/api/appointments/${appointment.id}/charge?appointmentId=${appointment.id}`)
      const data = await response.json()

      if (response.ok) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const fees = calculateFees(chargeData.amount, chargeData.method)

  return (
    <div className="space-y-4">
      {/* Status do Pagamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Status do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status atual:</p>
              <div className="mt-1">
                {getPaymentStatusBadge(appointment.paymentStatus)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Valor do serviço:</p>
              <p className="text-xl font-bold">{formatCurrency(appointment.servicePrice * 100)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão para Criar Cobrança */}
      {appointment.paymentStatus !== 'PAID' && (
        <Dialog open={showChargeDialog} onOpenChange={setShowChargeDialog}>
          <DialogTrigger asChild>
            <Button className="w-full beauty-gradient text-white">
              <Send className="w-4 h-4 mr-2" />
              Cobrar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Cobrança</DialogTitle>
              <DialogDescription>
                Crie uma cobrança para o cliente {appointment.client.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pagamento
                </label>
                <Select
                  value={chargeData.method}
                  onValueChange={(value: any) => setChargeData(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        PIX (sem taxa)
                      </div>
                    </SelectItem>
                    <SelectItem value="CREDIT_CARD">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Cartão de Crédito (2.9% + R$ 0,30)
                      </div>
                    </SelectItem>
                    <SelectItem value="DEBIT_CARD">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Cartão de Débito (1.9% + R$ 0,30)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor da Cobrança
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={chargeData.amount / 100}
                    onChange={(e) => setChargeData(prev => ({ 
                      ...prev, 
                      amount: Math.round(parseFloat(e.target.value || '0') * 100)
                    }))}
                    className="pl-9"
                    step="0.01"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição (opcional)
                </label>
                <Input
                  placeholder="Descrição da cobrança..."
                  value={chargeData.description}
                  onChange={(e) => setChargeData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Resumo da Cobrança */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Valor bruto:</span>
                  <span>{formatCurrency(chargeData.amount)}</span>
                </div>
                {fees.feeAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Taxa:</span>
                    <span>-{formatCurrency(fees.feeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Você recebe:</span>
                  <span className="text-green-600">{formatCurrency(fees.netAmount)}</span>
                </div>
              </div>

              <Button 
                onClick={handleCreateCharge}
                disabled={isCharging || chargeData.amount < 100}
                className="w-full beauty-gradient text-white"
              >
                {isCharging ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando cobrança...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Criar Cobrança
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Lista de Transações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Histórico de Transações</CardTitle>
            <Button onClick={loadTransactions} variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma transação encontrada</p>
              <p className="text-sm">Crie uma cobrança para o cliente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPaymentStatusBadge(transaction.status)}
                      <Badge variant="outline">{transaction.method}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                      {transaction.feeAmount > 0 && (
                        <p className="text-xs text-gray-500">
                          Líquido: {formatCurrency(transaction.netAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Criada em: {new Date(transaction.createdAt).toLocaleString('pt-BR')}</p>
                    {transaction.paidAt && (
                      <p>Paga em: {new Date(transaction.paidAt).toLocaleString('pt-BR')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}