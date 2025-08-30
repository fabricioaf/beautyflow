'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  CreditCard,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Loader2,
  DollarSign,
  Clock,
  Shield,
  Zap
} from 'lucide-react'

export interface PaymentMethod {
  id: string
  type: 'pix' | 'credit_card' | 'debit_card'
  name: string
  icon: React.ReactNode
  description: string
  processingTime: string
  fee: string
  recommended?: boolean
}

interface PaymentMethodSelectorProps {
  amount: number
  onMethodSelect: (method: PaymentMethod) => void
  selectedMethod?: PaymentMethod
  loading?: boolean
}

export function PaymentMethodSelector({ 
  amount, 
  onMethodSelect, 
  selectedMethod,
  loading = false 
}: PaymentMethodSelectorProps) {
  const [copySuccess, setCopySuccess] = useState(false)
  const { toast } = useToast()

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'pix',
      type: 'pix',
      name: 'PIX',
      icon: <QrCode className="w-6 h-6" />,
      description: 'Pagamento instantâneo via PIX',
      processingTime: 'Instantâneo',
      fee: 'Sem taxa',
      recommended: true
    },
    {
      id: 'credit_card',
      type: 'credit_card',
      name: 'Cartão de Crédito',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Cartão de crédito ou débito',
      processingTime: '1-2 dias úteis',
      fee: '2.9% + R$ 0,30'
    },
    {
      id: 'debit_card',
      type: 'debit_card',
      name: 'Cartão de Débito',
      icon: <Smartphone className="w-6 h-6" />,
      description: 'Débito online',
      processingTime: 'Instantâneo',
      fee: '1.9% + R$ 0,30'
    }
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const calculateFee = (method: PaymentMethod, amount: number) => {
    switch (method.type) {
      case 'pix':
        return 0
      case 'credit_card':
        return amount * 0.029 + 0.30
      case 'debit_card':
        return amount * 0.019 + 0.30
      default:
        return 0
    }
  }

  const copyPixCode = async () => {
    const pixCode = generateMockPixCode()
    try {
      await navigator.clipboard.writeText(pixCode)
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
        description: "Tente copiar manualmente",
        variant: "destructive"
      })
    }
  }

  const generateMockPixCode = () => {
    return "00020126580014BR.GOV.BCB.PIX01361234567890123456789012345678905204000053039865802BR5925BEAUTYFLOW PAGAMENTOS LTDA6014SAO PAULO61087654321062160512BEAUTYFLOW63045A2B"
  }

  return (
    <div className="space-y-6">
      {/* Resumo do Pagamento */}
      <Card className="border-beauty-purple-200 bg-gradient-to-r from-beauty-purple-50 to-beauty-pink-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total a Pagar</h3>
              <p className="text-sm text-gray-600">Escolha a forma de pagamento</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-beauty-purple-700">
                {formatCurrency(amount)}
              </div>
              {selectedMethod && (
                <div className="text-sm text-gray-600">
                  + {formatCurrency(calculateFee(selectedMethod, amount))} taxa
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métodos de Pagamento */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold mb-4">Escolha como pagar</h3>
        
        {paymentMethods.map((method) => {
          const fee = calculateFee(method, amount)
          const total = amount + fee
          const isSelected = selectedMethod?.id === method.id
          
          return (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'border-beauty-purple-500 bg-beauty-purple-50 shadow-lg' 
                  : 'border-gray-200 hover:border-beauty-purple-300 hover:shadow-md'
              } ${loading ? 'pointer-events-none opacity-50' : ''}`}
              onClick={() => !loading && onMethodSelect(method)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      method.type === 'pix' 
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {method.icon}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{method.name}</h4>
                        {method.recommended && (
                          <Badge className="bg-beauty-gold-100 text-beauty-gold-700 border-beauty-gold-200">
                            <Zap className="w-3 h-3 mr-1" />
                            Recomendado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{method.description}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {method.processingTime}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Shield className="w-3 h-3" />
                          {method.fee}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatCurrency(total)}
                    </div>
                    {fee > 0 && (
                      <div className="text-xs text-gray-500">
                        Taxa: {formatCurrency(fee)}
                      </div>
                    )}
                  </div>
                </div>

                {/* PIX Code Display */}
                {isSelected && method.type === 'pix' && (
                  <div className="mt-4 pt-4 border-t border-beauty-purple-200">
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Código PIX</h5>
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
                      
                      <div className="bg-gray-50 p-3 rounded border font-mono text-xs break-all">
                        {generateMockPixCode()}
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <QrCode className="w-4 h-4" />
                          Abra seu app bancário e cole o código PIX
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Informações de Segurança */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">Pagamento Seguro</h4>
              <p className="text-sm text-blue-700">
                Seus dados são protegidos com criptografia SSL de 256 bits. 
                Processado pela Stripe, líder mundial em segurança de pagamentos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}