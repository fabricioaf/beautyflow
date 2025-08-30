'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  Send, 
  Gift, 
  ThumbsUp,
  MessageCircle,
  Camera,
  Award
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ReviewFormProps {
  appointmentId: string
  professionalName: string
  serviceName: string
  serviceDate: Date
  clientName: string
  onSubmit?: (review: ReviewData) => void
  onSkip?: () => void
}

interface ReviewData {
  rating: number
  comment: string
  wouldRecommend: boolean
  serviceQuality: number
  professionalAttitude: number
  cleanliness: number
  valueForMoney: number
}

interface QuickReviewOption {
  id: string
  label: string
  icon: string
}

export function PostAppointmentReview({
  appointmentId,
  professionalName,
  serviceName,
  serviceDate,
  clientName,
  onSubmit,
  onSkip
}: ReviewFormProps) {
  const [currentStep, setCurrentStep] = useState<'rating' | 'details' | 'complete'>('rating')
  const [review, setReview] = useState<ReviewData>({
    rating: 0,
    comment: '',
    wouldRecommend: false,
    serviceQuality: 0,
    professionalAttitude: 0,
    cleanliness: 0,
    valueForMoney: 0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const quickOptions: QuickReviewOption[] = [
    { id: 'excellent', label: 'Excelente', icon: '🤩' },
    { id: 'loved_result', label: 'Amei o resultado', icon: '💖' },
    { id: 'professional', label: 'Muito profissional', icon: '👩‍💼' },
    { id: 'recommend', label: 'Recomendo', icon: '👍' },
    { id: 'clean', label: 'Ambiente limpo', icon: '✨' },
    { id: 'punctual', label: 'Pontual', icon: '⏰' }
  ]

  const handleRatingSelect = (rating: number) => {
    setReview(prev => ({ ...prev, rating }))
    
    // Se rating for 4 ou 5, ir direto para detalhes
    if (rating >= 4) {
      setCurrentStep('details')
    }
  }

  const handleDetailedRating = (category: keyof ReviewData, rating: number) => {
    setReview(prev => ({ ...prev, [category]: rating }))
  }

  const handleQuickOption = (optionId: string) => {
    let commentAddition = ''
    
    switch (optionId) {
      case 'excellent':
        commentAddition = 'Atendimento excelente! '
        break
      case 'loved_result':
        commentAddition = 'Adorei o resultado do serviço. '
        break
      case 'professional':
        commentAddition = `${professionalName} foi muito profissional. `
        break
      case 'recommend':
        setReview(prev => ({ ...prev, wouldRecommend: true }))
        commentAddition = 'Certamente recomendarei para outras pessoas. '
        break
      case 'clean':
        commentAddition = 'O ambiente estava muito limpo e organizado. '
        break
      case 'punctual':
        commentAddition = 'O atendimento foi pontual. '
        break
    }
    
    if (commentAddition) {
      setReview(prev => ({ 
        ...prev, 
        comment: prev.comment + commentAddition 
      }))
    }
  }

  const handleSubmit = async () => {
    if (review.rating === 0) {
      toast({
        title: 'Avaliação obrigatória',
        description: 'Por favor, selecione uma nota de 1 a 5 estrelas.',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      // Simular envio da avaliação
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setCurrentStep('complete')
      
      onSubmit?.(review)
      
      toast({
        title: 'Avaliação enviada!',
        description: 'Obrigado pelo seu feedback. Você ganhou 15 pontos de fidelidade! 🎉'
      })
      
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar sua avaliação. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (currentStep === 'complete') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="w-8 h-8 text-green-600" />
          </div>
          
          <h3 className="text-xl font-bold mb-2">Obrigado pela avaliação!</h3>
          <p className="text-gray-600 mb-4">
            Seu feedback é muito importante para nós.
          </p>
          
          <div className="bg-beauty-gold-50 border border-beauty-gold-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-beauty-gold-600" />
              <span className="font-semibold text-beauty-gold-800">+15 Pontos Ganhos!</span>
            </div>
            <p className="text-sm text-beauty-gold-700">
              Continue acumulando pontos e troque por descontos especiais!
            </p>
          </div>
          
          <Button 
            onClick={() => window.close()}
            className="w-full beauty-gradient"
          >
            Fechar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Star className="w-6 h-6 text-beauty-gold-500" />
          Como foi seu atendimento?
        </CardTitle>
        <div className="space-y-1">
          <p className="text-lg font-semibold">{serviceName}</p>
          <p className="text-gray-600">com {professionalName}</p>
          <p className="text-sm text-gray-500">
            {serviceDate.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Avaliação Principal */}
        <div className="text-center">
          <p className="text-lg font-medium mb-4">Avalie seu atendimento:</p>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRatingSelect(star)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  star <= review.rating
                    ? 'bg-beauty-gold-100 text-beauty-gold-600'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                <Star 
                  className={`w-6 h-6 ${
                    star <= review.rating ? 'fill-current' : ''
                  }`} 
                />
              </button>
            ))}
          </div>
          
          {review.rating > 0 && (
            <div className="text-center">
              <Badge variant="beauty" className="text-sm">
                {review.rating === 5 && 'Excelente!'}
                {review.rating === 4 && 'Muito Bom!'}
                {review.rating === 3 && 'Bom'}
                {review.rating === 2 && 'Regular'}
                {review.rating === 1 && 'Precisa Melhorar'}
              </Badge>
            </div>
          )}
        </div>

        {/* Avaliações Detalhadas */}
        {currentStep === 'details' && (
          <div className="space-y-4">
            <h4 className="font-semibold">Nos ajude com mais detalhes:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Qualidade do Serviço</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleDetailedRating('serviceQuality', star)}
                      className={`w-6 h-6 ${
                        star <= review.serviceQuality
                          ? 'text-beauty-gold-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Atendimento Profissional</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleDetailedRating('professionalAttitude', star)}
                      className={`w-6 h-6 ${
                        star <= review.professionalAttitude
                          ? 'text-beauty-gold-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Limpeza do Local</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleDetailedRating('cleanliness', star)}
                      className={`w-6 h-6 ${
                        star <= review.cleanliness
                          ? 'text-beauty-gold-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Custo-Benefício</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleDetailedRating('valueForMoney', star)}
                      className={`w-6 h-6 ${
                        star <= review.valueForMoney
                          ? 'text-beauty-gold-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Opções Rápidas */}
        {currentStep === 'details' && (
          <div>
            <label className="text-sm font-medium block mb-3">Opções rápidas:</label>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuickOption(option.id)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors flex items-center gap-1"
                >
                  <span>{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comentário */}
        {currentStep === 'details' && (
          <div>
            <label className="text-sm font-medium block mb-2">
              Deixe um comentário (opcional):
            </label>
            <Textarea
              value={review.comment}
              onChange={(e) => setReview(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Conte como foi sua experiência..."
              className="min-h-[100px]"
            />
          </div>
        )}

        {/* Recomendação */}
        {currentStep === 'details' && (
          <div className="text-center">
            <p className="text-sm font-medium mb-3">
              Você recomendaria este profissional para um amigo?
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant={review.wouldRecommend === true ? 'default' : 'outline'}
                onClick={() => setReview(prev => ({ ...prev, wouldRecommend: true }))}
                className="flex items-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Sim, recomendo!
              </Button>
              <Button
                variant={review.wouldRecommend === false ? 'default' : 'outline'}
                onClick={() => setReview(prev => ({ ...prev, wouldRecommend: false }))}
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Precisa melhorar
              </Button>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4">
          {currentStep === 'rating' && review.rating > 0 && (
            <Button
              onClick={() => setCurrentStep('details')}
              className="flex-1 beauty-gradient"
            >
              Continuar
            </Button>
          )}
          
          {currentStep === 'details' && (
            <>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 beauty-gradient"
              >
                {isSubmitting ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Avaliação
                  </>
                )}
              </Button>
            </>
          )}
          
          <Button
            onClick={onSkip}
            variant="ghost"
            className="flex-1"
          >
            Pular por agora
          </Button>
        </div>

        {/* Incentivo de Pontos */}
        <div className="bg-beauty-purple-50 border border-beauty-purple-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-5 h-5 text-beauty-purple-600" />
            <span className="font-semibold text-beauty-purple-800">
              Ganhe +15 pontos de fidelidade!
            </span>
          </div>
          <p className="text-sm text-beauty-purple-700">
            Ao avaliar o atendimento, você ganha pontos que podem ser trocados por descontos.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}