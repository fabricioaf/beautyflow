'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  Users, 
  BarChart3,
  Send,
  Plus,
  Filter,
  Search
} from 'lucide-react'
import { ChatInterface, ConversationList } from '@/components/communication/chat-interface'
import { SatisfactionSurvey, SurveyBuilder } from '@/components/communication/satisfaction-survey'
import { Input } from '@/components/ui/input'

export default function CommunicationPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string>('1')
  const [showSurveyBuilder, setShowSurveyBuilder] = useState(false)

  // Mock data - em produção viria da API
  const conversations = [
    {
      id: '1',
      clientName: 'Marina Silva',
      clientAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
      lastMessage: 'Seria possível no período da tarde? Entre 14h e 16h?',
      lastMessageTime: new Date('2024-01-20T10:37:00'),
      unreadCount: 2,
      isOnline: true
    },
    {
      id: '2',
      clientName: 'Ana Costa',
      lastMessage: 'Obrigada pelo atendimento! Adorei o resultado ❤️',
      lastMessageTime: new Date('2024-01-20T09:15:00'),
      unreadCount: 0,
      isOnline: false
    },
    {
      id: '3',
      clientName: 'Carla Mendes',
      lastMessage: 'Posso confirmar meu agendamento para sexta?',
      lastMessageTime: new Date('2024-01-19T16:20:00'),
      unreadCount: 1,
      isOnline: true
    }
  ]

  const selectedConversation = conversations.find(c => c.id === selectedConversationId)

  const communicationStats = {
    totalMessages: 142,
    responseTime: '12 min',
    satisfactionScore: 4.8,
    activeConversations: 8
  }

  const sampleSurvey = {
    surveyId: 'satisfaction_2024',
    title: 'Como foi seu atendimento?',
    description: 'Sua opinião é muito importante para melhorarmos nossos serviços.',
    questions: [
      {
        id: 'overall_satisfaction',
        type: 'rating' as const,
        question: 'Como você avalia seu atendimento geral?',
        required: true
      },
      {
        id: 'recommend',
        type: 'nps' as const,
        question: 'Qual a probabilidade de você nos recomendar para um amigo?',
        required: true
      },
      {
        id: 'service_quality',
        type: 'multiple_choice' as const,
        question: 'O que mais gostou no atendimento?',
        options: [
          'Qualidade do serviço',
          'Atendimento profissional',
          'Ambiente limpo',
          'Pontualidade',
          'Preço justo'
        ],
        required: false
      },
      {
        id: 'suggestions',
        type: 'text' as const,
        question: 'Alguma sugestão de melhoria?',
        required: false
      }
    ]
  }

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message)
    // Implementar integração com API
  }

  const handleCall = () => {
    console.log('Starting voice call...')
  }

  const handleVideoCall = () => {
    console.log('Starting video call...')
  }

  const handleSurveySubmit = (responses: Record<string, any>) => {
    console.log('Survey responses:', responses)
    // Implementar integração com API
  }

  const handleSaveSurvey = (survey: any) => {
    console.log('Saving survey:', survey)
    setShowSurveyBuilder(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Central de Comunicação</h1>
              <p className="text-gray-600 mt-1">
                Gerencie conversas, pesquisas e feedback dos clientes
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowSurveyBuilder(!showSurveyBuilder)}
                className="beauty-gradient"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Pesquisa
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{communicationStats.totalMessages}</p>
                  <p className="text-sm text-gray-600">Mensagens este mês</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{communicationStats.responseTime}</p>
                  <p className="text-sm text-gray-600">Tempo médio de resposta</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{communicationStats.satisfactionScore}</p>
                  <p className="text-sm text-gray-600">Nota de satisfação</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{communicationStats.activeConversations}</p>
                  <p className="text-sm text-gray-600">Conversas ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="surveys">Pesquisas</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
          </TabsList>

          {/* Aba Chat */}
          <TabsContent value="chat" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lista de Conversas */}
              <div className="lg:col-span-1">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar conversas..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <ConversationList
                  conversations={conversations}
                  onSelectConversation={setSelectedConversationId}
                  selectedConversationId={selectedConversationId}
                />
              </div>

              {/* Chat Interface */}
              <div className="lg:col-span-2">
                {selectedConversation ? (
                  <ChatInterface
                    clientId={selectedConversation.id}
                    clientName={selectedConversation.clientName}
                    clientAvatar={selectedConversation.clientAvatar}
                    professionalId="prof_123"
                    professionalName="Ana Paula"
                    onSendMessage={handleSendMessage}
                    onCall={handleCall}
                    onVideoCall={handleVideoCall}
                  />
                ) : (
                  <Card className="h-[600px] flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Selecione uma conversa para começar</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba Pesquisas */}
          <TabsContent value="surveys" className="space-y-4">
            {showSurveyBuilder ? (
              <SurveyBuilder onSave={handleSaveSurvey} />
            ) : (
              <div className="space-y-6">
                {/* Pesquisa de Exemplo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Pesquisa de Satisfação Ativa
                      <Badge variant="secondary">3 respostas hoje</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SatisfactionSurvey
                      {...sampleSurvey}
                      onSubmit={handleSurveySubmit}
                      onSkip={() => console.log('Survey skipped')}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Aba Análises */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Comunicação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Tempo médio de resposta</span>
                      <span className="font-semibold">12 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de resposta</span>
                      <span className="font-semibold">94%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conversas resolvidas</span>
                      <span className="font-semibold">87%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Satisfação média</span>
                      <span className="font-semibold">4.8/5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pesquisas de Satisfação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total de respostas</span>
                      <span className="font-semibold">156</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de participação</span>
                      <span className="font-semibold">68%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>NPS Score</span>
                      <span className="font-semibold">+67</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nota média geral</span>
                      <span className="font-semibold">4.6/5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}