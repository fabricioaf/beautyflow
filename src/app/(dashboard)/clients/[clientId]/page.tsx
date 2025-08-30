'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Phone,
  Mail,
  Calendar,
  MapPin,
  Star,
  CreditCard,
  Clock,
  MessageCircle,
  Edit,
  Trash2
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

// Mock data - em produção viria de uma API
const client = {
  id: '1',
  name: 'Maria Silva',
  email: 'maria.silva@email.com',
  phone: '(11) 99999-9999',
  birthDate: new Date('1990-05-15'),
  address: 'Rua das Flores, 123 - São Paulo, SP',
  loyaltyLevel: 'Ouro',
  loyaltyPoints: 850,
  totalSpent: 2400.00,
  lastVisit: new Date('2024-01-15'),
  nextAppointment: new Date('2024-01-25'),
  preferences: ['Corte moderno', 'Produtos veganos', 'Horário matutino'],
  notes: 'Cliente prefere horários pela manhã. Alergia a produtos com sulfato.'
}

const appointmentHistory = [
  {
    id: 1,
    date: new Date('2024-01-15'),
    service: 'Corte + Escova',
    price: 120.00,
    status: 'completed',
    rating: 5
  },
  {
    id: 2,
    date: new Date('2024-01-01'),
    service: 'Coloração + Hidratação',
    price: 280.00,
    status: 'completed', 
    rating: 5
  },
  {
    id: 3,
    date: new Date('2023-12-10'),
    service: 'Corte',
    price: 80.00,
    status: 'completed',
    rating: 4
  }
]

function getLoyaltyColor(level: string) {
  switch (level) {
    case 'Diamante': return 'bg-purple-100 text-purple-800'
    case 'Ouro': return 'bg-yellow-100 text-yellow-800'
    case 'Prata': return 'bg-gray-100 text-gray-800'
    default: return 'bg-orange-100 text-orange-800'
  }
}

export default function ClientDetailPage({ params }: { params: { clientId: string } }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detalhes do Cliente</h1>
          <p className="text-gray-600 mt-2">Informações completas e histórico</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={undefined} alt={client.name} />
                <AvatarFallback className="text-lg bg-gradient-to-r from-beauty-pink to-beauty-purple text-white">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{client.name}</h2>
                  <Badge className={getLoyaltyColor(client.loyaltyLevel)}>
                    Nível {client.loyaltyLevel}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{client.email}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{client.phone}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Nascimento: {formatDate(client.birthDate)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{client.address}</span>
                  </div>
                </div>
                
                {/* Notes */}
                <div>
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                    {client.notes}
                  </p>
                </div>
                
                {/* Preferences */}
                <div>
                  <h3 className="font-semibold mb-2">Preferências</h3>
                  <div className="flex flex-wrap gap-2">
                    {client.preferences.map((pref, index) => (
                      <Badge key={index} variant="secondary">{pref}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-beauty-gold-50 rounded-lg">
                <div className="text-2xl font-bold text-beauty-gold-600">
                  {client.loyaltyPoints}
                </div>
                <div className="text-sm text-gray-600">Pontos de Fidelidade</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(client.totalSpent)}
                </div>
                <div className="text-sm text-gray-600">Total Gasto</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {appointmentHistory.length}
                </div>
                <div className="text-sm text-gray-600">Atendimentos</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start">
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar WhatsApp
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Reagendar
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="w-4 h-4 mr-2" />
                Registrar Pagamento
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointmentHistory.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">{appointment.service}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(appointment.date)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < appointment.rating 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(appointment.price)}</p>
                    <Badge className="bg-green-100 text-green-800">
                      Concluído
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}