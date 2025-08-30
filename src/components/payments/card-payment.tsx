'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  CreditCard,
  Lock,
  Check,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Shield
} from 'lucide-react'

interface CardPaymentProps {
  amount: number
  appointmentId?: string
  onPaymentSuccess?: (paymentData: any) => void
  onPaymentError?: (error: string) => void
}

interface CardData {
  number: string
  expiry: string
  cvc: string
  name: string
}

export function CardPayment({ 
  amount, 
  appointmentId, 
  onPaymentSuccess, 
  onPaymentError 
}: CardPaymentProps) {
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  })
  const [showCvc, setShowCvc] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<CardData>>({})
  const [cardType, setCardType] = useState<string>('')
  const { toast } = useToast()

  useEffect(() => {
    detectCardType(cardData.number)
  }, [cardData.number])

  const detectCardType = (number: string) => {
    const cleaned = number.replace(/\s/g, '')
    
    if (/^4/.test(cleaned)) {
      setCardType('visa')
    } else if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
      setCardType('mastercard')
    } else if (/^3[47]/.test(cleaned)) {
      setCardType('amex')
    } else if (/^6/.test(cleaned)) {
      setCardType('discover')
    } else {
      setCardType('')
    }
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9]/g, '')
    const limited = cleaned.substring(0, 16)
    const formatted = limited.replace(/(\d{4})(?=\d)/g, '$1 ')
    return formatted
  }

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '')
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4)
    }
    return cleaned
  }

  const formatCvc = (value: string) => {
    return value.replace(/[^0-9]/g, '').substring(0, cardType === 'amex' ? 4 : 3)
  }

  const validateCard = (): boolean => {
    const newErrors: Partial<CardData> = {}

    // Validar número do cartão
    const cleanNumber = cardData.number.replace(/\s/g, '')
    if (!cleanNumber || cleanNumber.length < 13 || cleanNumber.length > 16) {
      newErrors.number = 'Número do cartão inválido'
    }

    // Validar data de expiração
    if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      newErrors.expiry = 'Data inválida (MM/AA)'
    } else {
      const [month, year] = cardData.expiry.split('/')
      const currentDate = new Date()
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1)
      
      if (expiryDate <= currentDate) {
        newErrors.expiry = 'Cartão expirado'
      }
    }

    // Validar CVC
    const expectedCvcLength = cardType === 'amex' ? 4 : 3
    if (!cardData.cvc || cardData.cvc.length !== expectedCvcLength) {
      newErrors.cvc = `CVC deve ter ${expectedCvcLength} dígitos`
    }

    // Validar nome
    if (!cardData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof CardData, value: string) => {
    let formattedValue = value

    switch (field) {
      case 'number':
        formattedValue = formatCardNumber(value)
        break
      case 'expiry':
        formattedValue = formatExpiry(value)
        break
      case 'cvc':
        formattedValue = formatCvc(value)
        break
      case 'name':
        formattedValue = value.toUpperCase()
        break
    }

    setCardData(prev => ({ ...prev, [field]: formattedValue }))
    
    // Limpar erro do campo ao digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const processPayment = async () => {
    if (!validateCard()) {
      toast({
        title: "Dados inválidos",
        description: "Verifique os dados do cartão",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/payments/card/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          appointmentId,
          card: {
            number: cardData.number.replace(/\s/g, ''),
            expiry: cardData.expiry,
            cvc: cardData.cvc,
            name: cardData.name
          },
          description: `Pagamento BeautyFlow - ${appointmentId ? 'Agendamento' : 'Serviço'}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro no pagamento')
      }

      if (data.status === 'succeeded') {
        toast({
          title: "Pagamento aprovado!",
          description: "Cartão processado com sucesso",
          variant: "default"
        })
        onPaymentSuccess?.(data)
      } else if (data.status === 'requires_action') {
        // 3D Secure ou outras verificações
        toast({
          title: "Verificação necessária",
          description: "Complete a verificação no seu banco",
          variant: "default"
        })
        // Aqui implementaria o fluxo 3D Secure
      } else {
        throw new Error('Pagamento não autorizado')
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erro no processamento'
      toast({
        title: "Pagamento rejeitado",
        description: errorMessage,
        variant: "destructive"
      })
      onPaymentError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getCardIcon = () => {
    switch (cardType) {
      case 'visa':
        return <div className="text-blue-600 font-bold text-sm">VISA</div>
      case 'mastercard':
        return <div className="text-red-600 font-bold text-sm">MC</div>
      case 'amex':
        return <div className="text-blue-800 font-bold text-sm">AMEX</div>
      default:
        return <CreditCard className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle>Pagamento com Cartão</CardTitle>
        <div className="text-3xl font-bold text-gray-900">
          {formatCurrency(amount)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Número do Cartão */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número do Cartão
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardData.number}
              onChange={(e) => handleInputChange('number', e.target.value)}
              className={`pr-12 ${errors.number ? 'border-red-500' : ''}`}
              maxLength={19}
            />
            <div className="absolute right-3 top-3">
              {getCardIcon()}
            </div>
          </div>
          {errors.number && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.number}
            </p>
          )}
        </div>

        {/* Nome no Cartão */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome no Cartão
          </label>
          <Input
            type="text"
            placeholder="NOME COMO NO CARTÃO"
            value={cardData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Data e CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validade
            </label>
            <Input
              type="text"
              placeholder="MM/AA"
              value={cardData.expiry}
              onChange={(e) => handleInputChange('expiry', e.target.value)}
              className={errors.expiry ? 'border-red-500' : ''}
              maxLength={5}
            />
            {errors.expiry && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.expiry}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CVC
            </label>
            <div className="relative">
              <Input
                type={showCvc ? 'text' : 'password'}
                placeholder={cardType === 'amex' ? '1234' : '123'}
                value={cardData.cvc}
                onChange={(e) => handleInputChange('cvc', e.target.value)}
                className={`pr-10 ${errors.cvc ? 'border-red-500' : ''}`}
                maxLength={cardType === 'amex' ? 4 : 3}
              />
              <button
                type="button"
                onClick={() => setShowCvc(!showCvc)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showCvc ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.cvc && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.cvc}
              </p>
            )}
          </div>
        </div>

        {/* Botão de Pagamento */}
        <Button
          onClick={processPayment}
          disabled={loading}
          className="w-full beauty-gradient text-white"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Pagar {formatCurrency(amount)}
            </>
          )}
        </Button>

        {/* Informações de Segurança */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <h4 className="font-medium text-green-900">Transação Segura</h4>
              <p className="text-sm text-green-700">
                Seus dados são criptografados e processados pela Stripe
              </p>
            </div>
          </div>
        </div>

        {/* Taxas */}
        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          <div className="flex justify-between items-center">
            <span>Subtotal:</span>
            <span>{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Taxa de processamento:</span>
            <span>{formatCurrency(amount * 0.029 + 0.30)}</span>
          </div>
          <div className="border-t mt-2 pt-2 flex justify-between items-center font-semibold">
            <span>Total:</span>
            <span>{formatCurrency(amount + (amount * 0.029 + 0.30))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}