'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  TrendingUp, 
  Star, 
  Calendar,
  Eye,
  MessageCircle,
  Award
} from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ClientStats {
  totalClients: number
  newClientsThisMonth: number
  averageRating: number
  returnRate: number
}

interface TopClient {
  id: string
  name: string
  avatar?: string
  totalSpent: number
  lastVisit: Date
  loyaltyLevel: 'Bronze' | 'Prata' | 'Ouro' | 'Diamante'
  nextAppointment?: Date
}

interface ClientStatsCardProps {
  stats: ClientStats
  topClients: TopClient[]
}

export function ClientStatsCard({ stats, topClients }: ClientStatsCardProps) {
  const getLoyaltyColor = (level: string) => {
    switch (level) {
      case 'Diamante': return 'bg-purple-100 text-purple-800'
      case 'Ouro': return 'bg-yellow-100 text-yellow-800'
      case 'Prata': return 'bg-gray-100 text-gray-800'
      default: return 'bg-orange-100 text-orange-800'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Estatísticas Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Estatísticas de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-beauty-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-beauty-pink-600">
                {stats.totalClients}
              </div>
              <div className="text-sm text-gray-600">Total de Clientes</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                +{stats.newClientsThisMonth}
              </div>
              <div className="text-sm text-gray-600">Novos este Mês</div>
            </div>
            
            <div className="text-center p-4 bg-beauty-gold-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-beauty-gold-500 fill-current" />
                <span className="text-xl font-bold text-beauty-gold-600">
                  {stats.averageRating}
                </span>
              </div>
              <div className="text-sm text-gray-600">Avaliação Média</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.returnRate}%
              </div>
              <div className="text-sm text-gray-600">Taxa de Retorno</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Link href="/dashboard/clients">
              <Button variant="outline" className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Ver Todos os Clientes
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Top Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Melhores Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topClients.map((client, index) => (
              <div key={client.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-500 w-4">
                    #{index + 1}
                  </span>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={client.avatar} alt={client.name} />
                    <AvatarFallback className="text-sm">
                      {client.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{client.name}</p>
                    <Badge className={`text-xs ${getLoyaltyColor(client.loyaltyLevel)}`}>
                      {client.loyaltyLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>R$ {client.totalSpent.toFixed(0)}</span>
                    <span>Última visita: {client.lastVisit.toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Link href={`/dashboard/clients/${client.id}`}>
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Calendar className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <Link href="/dashboard/analytics/clients">
              <Button variant="outline" className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                Análises Detalhadas
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}