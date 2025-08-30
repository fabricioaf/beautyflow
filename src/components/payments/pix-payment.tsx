'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  QrCode,
  Copy,
  Check,
  Smartphone,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface PixPaymentProps {
  amount: number
  appointmentId?: string
  onPaymentSuccess?: (paymentData: any) => void
  onPaymentError?: (error: string) => void
}

interface PixPaymentData {
  id: string
  pixCode: string
  qrCodeImage: string
  expiresAt: Date
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
}

export function PixPayment({ 
  amount, 
  appointmentId, 
  onPaymentSuccess, 
  onPaymentError 
}: PixPaymentProps) {
  const [pixData, setPixData] = useState<PixPaymentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isPolling, setIsPolling] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (pixData && pixData.status === 'pending') {
      startPolling()
      startTimer()
    }
  }, [pixData])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleExpired()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeLeft])

  const generatePixPayment = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments/pix/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          appointmentId,
          description: `Pagamento BeautyFlow - ${appointmentId ? 'Agendamento' : 'Serviço'}`
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar PIX')
      }

      const data = await response.json()
      setPixData(data.pixPayment)
      
      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código",
        variant: "default"
      })
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao gerar PIX'
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      })
      onPaymentError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const copyPixCode = async () => {
    if (!pixData) return
    
    try {
      await navigator.clipboard.writeText(pixData.pixCode)
      setCopySuccess(true)
      toast({
        title: "Código PIX copiado!",
        description: "Cole no seu app bancário para pagar",
        variant: "default"
      })
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente",
        variant: "destructive"
      })
    }
  }

  const startPolling = () => {
    setIsPolling(true)
    const pollInterval = setInterval(async () => {
      if (!pixData) return

      try {
        const response = await fetch(`/api/payments/pix/status/${pixData.id}`)
        const data = await response.json()
        
        if (data.status === 'paid') {
          setPixData(prev => prev ? { ...prev, status: 'paid' } : null)
          clearInterval(pollInterval)
          setIsPolling(false)
          toast({
            title: "Pagamento confirmado!",
            description: "PIX recebido com sucesso",
            variant: "default"
          })
          onPaymentSuccess?.(data)
        } else if (data.status === 'expired' || data.status === 'cancelled') {
          setPixData(prev => prev ? { ...prev, status: data.status } : null)
          clearInterval(pollInterval)
          setIsPolling(false)
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error)
      }
    }, 3000) // Verificar a cada 3 segundos

    // Parar polling após 15 minutos
    setTimeout(() => {
      clearInterval(pollInterval)
      setIsPolling(false)
    }, 15 * 60 * 1000)
  }

  const startTimer = () => {
    if (pixData) {
      const now = new Date().getTime()
      const expires = new Date(pixData.expiresAt).getTime()
      const secondsLeft = Math.floor((expires - now) / 1000)
      setTimeLeft(Math.max(0, secondsLeft))
    }
  }

  const handleExpired = () => {
    setPixData(prev => prev ? { ...prev, status: 'expired' } : null)
    setIsPolling(false)
    toast({
      title: "PIX expirado",
      description: "Gere um novo PIX para continuar",
      variant: "destructive"
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (!pixData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle>Pagamento via PIX</CardTitle>
          <p className="text-gray-600">
            Pague de forma rápida e segura
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(amount)}
            </div>
            <p className="text-sm text-gray-600">
              Pagamento instantâneo • Sem taxas
            </p>
          </div>

          <Button
            onClick={generatePixPayment}
            disabled={loading}
            className="w-full beauty-gradient text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando PIX...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Gerar PIX
              </>
            )}
          </Button>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Clique em "Gerar PIX"</li>
              <li>2. Escaneie o QR Code ou copie o código</li>
              <li>3. Abra seu app bancário</li>
              <li>4. Confirme o pagamento</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (pixData.status === 'paid') {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50">
        <CardContent className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-2">
            Pagamento Confirmado!
          </h3>
          <p className="text-green-700 mb-4">
            PIX de {formatCurrency(amount)} recebido com sucesso
          </p>
          <Badge className="bg-green-100 text-green-800">
            Processado instantaneamente
          </Badge>
        </CardContent>
      </Card>
    )
  }

  if (pixData.status === 'expired') {
    return (
      <Card className="w-full max-w-md mx-auto border-orange-200 bg-orange-50">
        <CardContent className="text-center p-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-orange-900 mb-2">
            PIX Expirado
          </h3>
          <p className="text-orange-700 mb-4">
            O tempo limite para pagamento foi atingido
          </p>
          <Button
            onClick={() => {
              setPixData(null)
              setTimeLeft(0)
            }}
            className="beauty-gradient text-white"
          >
            Gerar Novo PIX
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <QrCode className="w-6 h-6" />
          PIX - {formatCurrency(amount)}
        </CardTitle>
        
        {timeLeft > 0 && (
          <div className="flex items-center justify-center gap-2 text-orange-600">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg">
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="text-center">
          <div className="bg-white p-6 rounded-lg border inline-block">
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-24 h-24 text-gray-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Escaneie com a câmera do seu banco
          </p>
        </div>

        {/* Código PIX */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Código PIX</label>
            <Button
              size="sm"
              variant="outline"
              onClick={copyPixCode}
              className="gap-2"
            >
              {copySuccess ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar
                </>
              )}
            </Button>
          </div>
          
          <div className="bg-gray-50 p-3 rounded border font-mono text-xs break-all max-h-24 overflow-y-auto">
            {pixData.pixCode}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 text-blue-600">
          {isPolling && <Loader2 className="w-4 h-4 animate-spin" />}
          <span className="text-sm">
            {isPolling ? 'Aguardando pagamento...' : 'PIX gerado'}
          </span>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Instruções
          </h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Abra o app do seu banco</li>
            <li>2. Escolha a opção "Pagar PIX"</li>
            <li>3. Escaneie o QR Code ou cole o código</li>
            <li>4. Confirme os dados e autorize</li>
          </ol>
        </div>

        {/* Cancelar */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setPixData(null)
            setTimeLeft(0)
            setIsPolling(false)
          }}
        >
          Cancelar
        </Button>
      </CardContent>
    </Card>
  )
}