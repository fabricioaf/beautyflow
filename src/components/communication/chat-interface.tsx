'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Send, 
  Phone, 
  Video, 
  Paperclip, 
  Smile,
  MoreVertical,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Message {
  id: string
  senderId: string
  senderName: string
  senderType: 'client' | 'professional'
  content: string
  type: 'text' | 'image' | 'file' | 'appointment' | 'payment'
  timestamp: Date
  status: 'sent' | 'delivered' | 'read'
  metadata?: any
}

interface ChatInterfaceProps {
  clientId: string
  clientName: string
  clientAvatar?: string
  professionalId: string
  professionalName: string
  onSendMessage?: (message: string) => void
  onCall?: () => void
  onVideoCall?: () => void
}

export function ChatInterface({
  clientId,
  clientName,
  clientAvatar,
  professionalId,
  professionalName,
  onSendMessage,
  onCall,
  onVideoCall
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: clientId,
      senderName: clientName,
      senderType: 'client',
      content: 'Olá! Gostaria de reagendar meu horário de amanhã.',
      type: 'text',
      timestamp: new Date('2024-01-20T10:30:00'),
      status: 'read'
    },
    {
      id: '2',
      senderId: professionalId,
      senderName: professionalName,
      senderType: 'professional',
      content: 'Oi! Claro, que horas funcionaria melhor para você?',
      type: 'text',
      timestamp: new Date('2024-01-20T10:35:00'),
      status: 'read'
    },
    {
      id: '3',
      senderId: clientId,
      senderName: clientName,
      senderType: 'client',
      content: 'Seria possível no período da tarde? Entre 14h e 16h?',
      type: 'text',
      timestamp: new Date('2024-01-20T10:37:00'),
      status: 'read'
    },
    {
      id: '4',
      senderId: professionalId,
      senderName: professionalName,
      senderType: 'professional',
      content: 'Tenho um horário às 15h disponível. Posso reagendar para esse horário?',
      type: 'text',
      timestamp: new Date('2024-01-20T10:40:00'),
      status: 'delivered'
    }
  ])
  
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: professionalId,
      senderName: professionalName,
      senderType: 'professional',
      content: newMessage,
      type: 'text',
      timestamp: new Date(),
      status: 'sent'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')
    onSendMessage?.(newMessage)

    // Simular resposta do cliente
    setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const clientResponse: Message = {
          id: (Date.now() + 1).toString(),
          senderId: clientId,
          senderName: clientName,
          senderType: 'client',
          content: 'Perfeito! Muito obrigada 😊',
          type: 'text',
          timestamp: new Date(),
          status: 'sent'
        }
        setMessages(prev => [...prev, clientResponse])
      }, 2000)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      default:
        return null
    }
  }

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(timestamp, 'HH:mm')
    } else {
      return format(timestamp, 'dd/MM HH:mm', { locale: ptBR })
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Header do Chat */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={clientAvatar} alt={clientName} />
              <AvatarFallback>
                {clientName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="text-lg">{clientName}</CardTitle>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Online agora
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCall}
              className="p-2"
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onVideoCall}
              className="p-2"
            >
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Área de Mensagens */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.senderType === 'professional' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderType === 'professional'
                  ? 'bg-beauty-purple-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <div className={`flex items-center gap-1 mt-1 ${
                message.senderType === 'professional' ? 'justify-end' : 'justify-start'
              }`}>
                <span className={`text-xs ${
                  message.senderType === 'professional' 
                    ? 'text-purple-200' 
                    : 'text-gray-500'
                }`}>
                  {formatMessageTime(message.timestamp)}
                </span>
                {message.senderType === 'professional' && (
                  <div className="ml-1">
                    {getMessageStatusIcon(message.status)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Indicador de digitação */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">digitando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Campo de Entrada */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="p-2 shrink-0">
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="pr-10"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="beauty-gradient shrink-0"
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

// Componente de lista de conversas
interface ConversationListProps {
  conversations: Array<{
    id: string
    clientName: string
    clientAvatar?: string
    lastMessage: string
    lastMessageTime: Date
    unreadCount: number
    isOnline: boolean
  }>
  onSelectConversation?: (conversationId: string) => void
  selectedConversationId?: string
}

export function ConversationList({
  conversations,
  onSelectConversation,
  selectedConversationId
}: ConversationListProps) {
  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Conversas
          <Badge variant="secondary">{conversations.length}</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation?.(conversation.id)}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                selectedConversationId === conversation.id
                  ? 'border-beauty-purple-500 bg-beauty-purple-50'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={conversation.clientAvatar} alt={conversation.clientName} />
                    <AvatarFallback className="text-xs">
                      {conversation.clientName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate">{conversation.clientName}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(conversation.lastMessageTime)}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs min-w-[20px] h-5">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function formatMessageTime(timestamp: Date) {
  const now = new Date()
  const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    return 'agora'
  } else if (diffInHours < 24) {
    return format(timestamp, 'HH:mm')
  } else {
    return format(timestamp, 'dd/MM', { locale: ptBR })
  }
}