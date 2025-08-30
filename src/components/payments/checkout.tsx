'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PaymentMethodSelector, PaymentMethod } from './payment-method-selector'
import { PixPayment } from './pix-payment'
import { CardPayment } from './card-payment'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  CheckCircle,
  Receipt,
  Download,
  Share,
  Calendar
} from 'lucide-react'

interface CheckoutProps {
  amount: number
  appointmentId?: string
  appointmentData?: {
    serviceName: string
    scheduledFor: Date
    clientName: string
  }
  onPaymentSuccess?: (paymentData: any) => void
  onCancel?: () => void
}

type CheckoutStep = 'method' | 'payment' | 'success'

export function Checkout({ 
  amount, 
  appointmentId, 
  appointmentData,
  onPaymentSuccess, 
  onCancel 
}: CheckoutProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('method')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>()
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const { toast } = useToast()

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method)
    setCurrentStep('payment')
  }

  const handlePaymentSuccess = (paymentData: any) => {
    setPaymentResult(paymentData)
    setCurrentStep('success')
    onPaymentSuccess?.(paymentData)
    
    toast({
      title: "Pagamento realizado com sucesso!",
      description: `${selectedMethod?.name} processado`,
      variant: "default"
    })
  }

  const handlePaymentError = (error: string) => {
    toast({
      title: "Erro no pagamento",
      description: error,
      variant: "destructive"
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date)
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          currentStep === 'method' 
            ? 'bg-beauty-purple-500 text-white' 
            : 'bg-green-500 text-white'
        }`}>
          {currentStep === 'method' ? '1' : <CheckCircle className="w-4 h-4" />}
        </div>
        <span className="text-sm text-gray-600">Método</span>
        
        <div className={`h-px w-8 ${currentStep !== 'method' ? 'bg-green-500' : 'bg-gray-300'}`} />
        
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          currentStep === 'payment' 
            ? 'bg-beauty-purple-500 text-white' 
            : currentStep === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-300 text-gray-600'
        }`}>
          {currentStep === 'success' ? <CheckCircle className="w-4 h-4" /> : '2'}
        </div>
        <span className="text-sm text-gray-600">Pagamento</span>
        
        <div className={`h-px w-8 ${currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'}`} />
        
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          currentStep === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-300 text-gray-600'
        }`}>
          {currentStep === 'success' ? <CheckCircle className="w-4 h-4" /> : '3'}
        </div>
        <span className="text-sm text-gray-600">Concluído</span>
      </div>
    </div>
  )

  if (currentStep === 'success') {
    return (
      <div className="max-w-2xl mx-auto">
        {renderStepIndicator()}
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="text-center p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-green-900 mb-2">
              Pagamento Confirmado!
            </h2>
            
            <p className="text-green-700 mb-6">
              Sua transação foi processada com sucesso
            </p>

            {/* Detalhes do Pagamento */}
            <div className="bg-white p-6 rounded-lg border mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="text-left">
                  <span className="text-gray-600">Valor Pago:</span>
                  <div className="font-semibold text-lg">{formatCurrency(amount)}</div>
                </div>
                
                <div className="text-left">
                  <span className="text-gray-600">Método:</span>
                  <div className="font-semibold">{selectedMethod?.name}</div>
                </div>
                
                {appointmentData && (
                  <>
                    <div className="text-left">
                      <span className="text-gray-600">Serviço:</span>
                      <div className="font-semibold">{appointmentData.serviceName}</div>
                    </div>
                    
                    <div className="text-left">
                      <span className="text-gray-600">Data/Hora:</span>
                      <div className="font-semibold">
                        {formatDateTime(appointmentData.scheduledFor)}
                      </div>
                    </div>
                  </>
                )}
                
                <div className="text-left">
                  <span className="text-gray-600">ID da Transação:</span>
                  <div className="font-mono text-xs">{paymentResult?.id || 'N/A'}</div>
                </div>
                
                <div className="text-left">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-green-100 text-green-800">
                    Confirmado
                  </Badge>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="gap-2">
                <Receipt className="w-4 h-4" />
                Ver Comprovante
              </Button>
              
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Baixar PDF
              </Button>
              
              <Button variant="outline" className="gap-2">
                <Share className="w-4 h-4" />
                Compartilhar
              </Button>
              
              {appointmentData && (
                <Button className="beauty-gradient text-white gap-2">
                  <Calendar className="w-4 h-4" />
                  Ver Agendamento
                </Button>
              )}
            </div>

            {/* Próximos Passos */}
            {appointmentData && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Próximos Passos:</h4>
                <ul className="text-sm text-blue-700 text-left space-y-1">
                  <li>• Você receberá uma confirmação por WhatsApp/SMS</li>
                  <li>• Chegue 10 minutos antes do horário agendado</li>
                  <li>• Traga um documento de identificação</li>
                  <li>• Em caso de imprevistos, entre em contato conosco</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {renderStepIndicator()}
      
      {/* Header com informações do agendamento */}
      {appointmentData && (
        <Card className="mb-6 border-beauty-purple-200 bg-gradient-to-r from-beauty-purple-50 to-beauty-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {appointmentData.serviceName}
                </h3>
                <p className="text-sm text-gray-600">
                  {appointmentData.clientName}
                </p>
                <p className="text-sm text-gray-600">
                  {formatDateTime(appointmentData.scheduledFor)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-beauty-purple-700">
                  {formatCurrency(amount)}
                </div>
                <Badge className="bg-beauty-gold-100 text-beauty-gold-700">
                  Agendamento
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'method' && (
        <div>
          <PaymentMethodSelector
            amount={amount}
            onMethodSelect={handleMethodSelect}
            selectedMethod={selectedMethod}
          />
          
          {onCancel && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={onCancel} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}

      {currentStep === 'payment' && selectedMethod && (
        <div>
          {/* Botão Voltar */}
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('method')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>

          {/* Componente de pagamento específico */}
          {selectedMethod.type === 'pix' && (
            <PixPayment
              amount={amount}
              appointmentId={appointmentId}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          )}

          {(selectedMethod.type === 'credit_card' || selectedMethod.type === 'debit_card') && (
            <CardPayment
              amount={amount}
              appointmentId={appointmentId}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          )}
        </div>
      )}
    </div>
  )
}