'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  Send, 
  ChevronRight,
  ChevronLeft,
  Award,
  MessageCircle,
  BarChart3,
  Users
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SurveyQuestion {
  id: string
  type: 'rating' | 'multiple_choice' | 'text' | 'nps'
  question: string
  options?: string[]
  required: boolean
}

interface SurveyProps {
  surveyId: string
  title: string
  description: string
  questions: SurveyQuestion[]
  onSubmit?: (responses: Record<string, any>) => void
  onSkip?: () => void
}

interface SurveyBuilderProps {
  onSave?: (survey: any) => void
}

export function SatisfactionSurvey({
  surveyId,
  title,
  description,
  questions,
  onSubmit,
  onSkip
}: SurveyProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (currentQuestion.required && !responses[currentQuestion.id]) {
      toast({
        title: 'Resposta obrigatória',
        description: 'Por favor, responda a pergunta antes de continuar.',
        variant: 'destructive'
      })
      return
    }

    if (isLastQuestion) {
      handleSubmit()
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      onSubmit?.(responses)
      
      toast({
        title: 'Pesquisa enviada!',
        description: 'Obrigado pelo seu feedback. Você ganhou 10 pontos de fidelidade! 🎉'
      })
      
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar sua pesquisa. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestion = () => {
    const response = responses[currentQuestion.id]

    switch (currentQuestion.type) {
      case 'rating':
        return (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleResponse(currentQuestion.id, rating)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    response === rating
                      ? 'bg-beauty-gold-100 text-beauty-gold-600 scale-110'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <Star 
                    className={`w-6 h-6 ${
                      response === rating ? 'fill-current' : ''
                    }`} 
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-sm text-gray-600">
              1 = Muito insatisfeito | 5 = Muito satisfeito
            </div>
          </div>
        )

      case 'nps':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleResponse(currentQuestion.id, i)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                    response === i
                      ? 'bg-beauty-purple-500 text-white scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Não recomendaria</span>
              <span>Recomendaria com certeza</span>
            </div>
          </div>
        )

      case 'multiple_choice':
        return (
          <RadioGroup 
            value={response || ''} 
            onValueChange={(value) => handleResponse(currentQuestion.id, value)}
          >
            <div className="space-y-3">
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={option} 
                    id={`${currentQuestion.id}_${index}`} 
                  />
                  <Label 
                    htmlFor={`${currentQuestion.id}_${index}`} 
                    className="flex-1 cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        )

      case 'text':
        return (
          <Textarea
            value={response || ''}
            onChange={(e) => handleResponse(currentQuestion.id, e.target.value)}
            placeholder="Digite sua resposta..."
            className="min-h-[120px]"
          />
        )

      default:
        return null
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="space-y-4">
          <div className="text-center">
            <CardTitle className="text-2xl mb-2">{title}</CardTitle>
            <p className="text-gray-600">{description}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Pergunta {currentQuestionIndex + 1} de {questions.length}</span>
              <span>{Math.round(progress)}% completo</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">
            {currentQuestion.question}
            {currentQuestion.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </h3>
          
          {renderQuestion()}
        </div>

        <div className="flex justify-between items-center pt-6">
          <Button
            onClick={handlePrevious}
            variant="outline"
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={onSkip}
              variant="ghost"
            >
              Pular pesquisa
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="beauty-gradient flex items-center gap-2"
            >
              {isSubmitting ? (
                'Enviando...'
              ) : isLastQuestion ? (
                <>
                  <Send className="w-4 h-4" />
                  Finalizar
                </>
              ) : (
                <>
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Incentivo de Pontos */}
        <div className="bg-beauty-purple-50 border border-beauty-purple-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-5 h-5 text-beauty-purple-600" />
            <span className="font-semibold text-beauty-purple-800">
              Ganhe +10 pontos de fidelidade!
            </span>
          </div>
          <p className="text-sm text-beauty-purple-700">
            Ao completar esta pesquisa, você ganha pontos que podem ser trocados por descontos.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Construtor de pesquisas para profissionais
export function SurveyBuilder({ onSave }: SurveyBuilderProps) {
  const [survey, setSurvey] = useState({
    title: '',
    description: '',
    questions: [] as SurveyQuestion[]
  })

  const addQuestion = (type: SurveyQuestion['type']) => {
    const newQuestion: SurveyQuestion = {
      id: `q_${Date.now()}`,
      type,
      question: '',
      required: false,
      ...(type === 'multiple_choice' && { options: ['Opção 1', 'Opção 2'] })
    }

    setSurvey(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }))
  }

  const updateQuestion = (questionId: string, updates: Partial<SurveyQuestion>) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }))
  }

  const removeQuestion = (questionId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Pesquisa de Satisfação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título da Pesquisa</Label>
            <Input
              id="title"
              value={survey.title}
              onChange={(e) => setSurvey(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Pesquisa de Satisfação Pós-Atendimento"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={survey.description}
              onChange={(e) => setSurvey(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o objetivo da pesquisa..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Perguntas ({survey.questions.length})
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addQuestion('rating')}>
                + Avaliação
              </Button>
              <Button size="sm" onClick={() => addQuestion('multiple_choice')}>
                + Múltipla Escolha
              </Button>
              <Button size="sm" onClick={() => addQuestion('text')}>
                + Texto
              </Button>
              <Button size="sm" onClick={() => addQuestion('nps')}>
                + NPS
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {survey.questions.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma pergunta adicionada ainda.</p>
              <p className="text-sm text-gray-500">Use os botões acima para adicionar perguntas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {survey.questions.map((question, index) => (
                <Card key={question.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="outline">
                        {question.type === 'rating' && 'Avaliação'}
                        {question.type === 'multiple_choice' && 'Múltipla Escolha'}
                        {question.type === 'text' && 'Texto'}
                        {question.type === 'nps' && 'NPS'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-600"
                      >
                        Remover
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <Input
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        placeholder="Digite a pergunta..."
                      />
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                        />
                        <Label>Pergunta obrigatória</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">
          Salvar Rascunho
        </Button>
        <Button 
          onClick={() => onSave?.(survey)}
          className="beauty-gradient"
          disabled={!survey.title || survey.questions.length === 0}
        >
          Publicar Pesquisa
        </Button>
      </div>
    </div>
  )
}