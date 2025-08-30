'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Gift, 
  Award, 
  Crown, 
  Star,
  TrendingUp,
  Clock,
  Check,
  ArrowRight,
  History
} from 'lucide-react'
import { LoyaltySystem } from '@/lib/loyalty-system'

interface LoyaltyProgramProps {
  clientId: string
  currentPoints: number
  totalEarned: number
  onRedeemReward?: (rewardId: string) => void
}

interface RewardItem {
  id: string
  name: string
  description: string
  pointsCost: number
  type: string
  value: number
  expiresInDays?: number
  canRedeem: boolean
}

interface Transaction {
  id: string
  type: 'earned' | 'redeemed'
  points: number
  reason: string
  date: Date
  appointmentId?: string
}

export function LoyaltyProgram({ 
  clientId, 
  currentPoints, 
  totalEarned,
  onRedeemReward 
}: LoyaltyProgramProps) {
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null)
  const loyaltySystem = new LoyaltySystem()
  
  // Dados simulados - em produção viriam da API
  const [transactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'earned',
      points: 10,
      reason: 'Atendimento concluído',
      date: new Date('2024-01-15'),
      appointmentId: 'apt_1'
    },
    {
      id: '2',
      type: 'earned',
      points: 12,
      reason: 'Valor gasto: R$ 120',
      date: new Date('2024-01-15')
    },
    {
      id: '3',
      type: 'earned',
      points: 15,
      reason: 'Avaliação enviada',
      date: new Date('2024-01-16')
    },
    {
      id: '4',
      type: 'redeemed',
      points: -100,
      reason: 'Resgate: 10% de desconto',
      date: new Date('2024-01-20')
    }
  ])

  const loyaltyLevel = loyaltySystem.getLoyaltyLevel(currentPoints)
  const availableRewards = loyaltySystem.getAvailableRewards()
  const redeemableRewards = loyaltySystem.getRedeemableRewards(currentPoints)

  const handleRedeem = async (rewardId: string) => {
    setIsRedeeming(rewardId)
    
    try {
      // Simular processo de resgate
      await new Promise(resolve => setTimeout(resolve, 1500))
      onRedeemReward?.(rewardId)
    } finally {
      setIsRedeeming(null)
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'Diamante': return <Crown className="w-5 h-5" />
      case 'Ouro': return <Award className="w-5 h-5" />
      case 'Prata': return <Star className="w-5 h-5" />
      default: return <Gift className="w-5 h-5" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Diamante': return 'text-purple-600 bg-purple-100'
      case 'Ouro': return 'text-yellow-600 bg-yellow-100'
      case 'Prata': return 'text-gray-600 bg-gray-100'
      default: return 'text-orange-600 bg-orange-100'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header com Status Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-beauty-purple-600" />
            Programa de Fidelidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pontos Atuais */}
            <div className="text-center">
              <div className="text-3xl font-bold text-beauty-purple-600 mb-2">
                {currentPoints}
              </div>
              <div className="text-gray-600">Pontos Disponíveis</div>
            </div>

            {/* Nível Atual */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getLevelColor(loyaltyLevel.level)} mb-2`}>
                {getLevelIcon(loyaltyLevel.level)}
                <span className="font-semibold">{loyaltyLevel.level}</span>
              </div>
              <div className="text-gray-600">Nível Atual</div>
            </div>

            {/* Total Ganho */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {totalEarned}
              </div>
              <div className="text-gray-600">Total Acumulado</div>
            </div>
          </div>

          {/* Progresso para Próximo Nível */}
          {loyaltyLevel.nextLevel && loyaltyLevel.pointsToNext && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Progresso para {loyaltyLevel.nextLevel}
                </span>
                <span className="text-sm text-gray-600">
                  {loyaltyLevel.pointsToNext} pontos restantes
                </span>
              </div>
              <Progress 
                value={(currentPoints / (currentPoints + loyaltyLevel.pointsToNext)) * 100} 
                className="h-3"
              />
            </div>
          )}

          {/* Benefícios do Nível */}
          <div className="mt-6">
            <h4 className="font-semibold mb-3">Seus benefícios atuais:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {loyaltyLevel.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas - Recompensas e Histórico */}
      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rewards">Recompensas</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Aba Recompensas */}
        <TabsContent value="rewards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRewards.map((reward) => {
              const canRedeem = currentPoints >= reward.pointsCost
              const isProcessing = isRedeeming === reward.id

              return (
                <Card key={reward.id} className={`${canRedeem ? 'border-beauty-purple-200' : 'border-gray-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{reward.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{reward.description}</p>
                        
                        {reward.expiresInDays && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            Válido por {reward.expiresInDays} dias
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-beauty-purple-600">
                          {reward.pointsCost}
                        </div>
                        <div className="text-xs text-gray-500">pontos</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        {reward.type === 'discount_percentage' && (
                          <Badge variant="secondary">{reward.value}% OFF</Badge>
                        )}
                        {reward.type === 'discount_fixed' && (
                          <Badge variant="secondary">R$ {reward.value} OFF</Badge>
                        )}
                        {reward.type === 'free_service' && (
                          <Badge variant="secondary">Serviço Grátis</Badge>
                        )}
                        {reward.type === 'upgrade' && (
                          <Badge variant="secondary">Upgrade Premium</Badge>
                        )}
                      </div>

                      <Button
                        onClick={() => handleRedeem(reward.id)}
                        disabled={!canRedeem || isProcessing}
                        variant={canRedeem ? 'default' : 'outline'}
                        size="sm"
                        className={canRedeem ? 'beauty-gradient' : ''}
                      >
                        {isProcessing ? (
                          'Resgatando...'
                        ) : canRedeem ? (
                          <>
                            Resgatar
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </>
                        ) : (
                          `Faltam ${reward.pointsCost - currentPoints}`
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {redeemableRewards.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Continue acumulando pontos!</h3>
                <p className="text-gray-600">
                  Você precisa de mais pontos para resgatar recompensas. 
                  Continue agendando e avaliando para ganhar mais pontos.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba Histórico */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de Pontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'earned' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.type === 'earned' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <Gift className="w-4 h-4" />
                        )}
                      </div>
                      
                      <div>
                        <div className="font-medium">{transaction.reason}</div>
                        <div className="text-sm text-gray-500">
                          {transaction.date.toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`font-semibold ${
                      transaction.type === 'earned' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'earned' ? '+' : ''}{transaction.points}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dicas para Ganhar Mais Pontos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-beauty-gold-500" />
            Como Ganhar Mais Pontos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-beauty-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-beauty-purple-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-beauty-purple-600 font-bold text-sm">10</span>
              </div>
              <div>
                <div className="font-medium">Compareça aos atendimentos</div>
                <div className="text-sm text-gray-600">10 pontos por atendimento concluído</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-green-600 font-bold text-sm">15</span>
              </div>
              <div>
                <div className="font-medium">Avalie o atendimento</div>
                <div className="text-sm text-gray-600">15 pontos por avaliação enviada</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <div className="font-medium">Gaste no salão</div>
                <div className="text-sm text-gray-600">1 ponto a cada R$ 10 gastos</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-yellow-600 font-bold text-sm">50</span>
              </div>
              <div>
                <div className="font-medium">Indique amigos</div>
                <div className="text-sm text-gray-600">50 pontos por novo cliente indicado</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}