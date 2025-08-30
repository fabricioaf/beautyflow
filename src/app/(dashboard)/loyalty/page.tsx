import { LoyaltyProgram } from '@/components/loyalty/loyalty-program'

export default function LoyaltyPage() {
  // Em produção, estes dados viriam da API
  const mockClientData = {
    clientId: 'client_123',
    currentPoints: 340,
    totalEarned: 580
  }

  const handleRedeemReward = async (rewardId: string) => {
    try {
      const response = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: mockClientData.clientId,
          action: 'redeem_reward',
          rewardId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Atualizar UI ou redirecionar
        console.log('Recompensa resgatada:', data)
      }
    } catch (error) {
      console.error('Erro ao resgatar recompensa:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Programa de Fidelidade</h1>
              <p className="text-gray-600 mt-1">
                Acompanhe seus pontos, níveis e recompensas disponíveis
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-6">
        <LoyaltyProgram
          clientId={mockClientData.clientId}
          currentPoints={mockClientData.currentPoints}
          totalEarned={mockClientData.totalEarned}
          onRedeemReward={handleRedeemReward}
        />
      </div>
    </div>
  )
}

export async function generateMetadata() {
  return {
    title: 'Programa de Fidelidade | BeautyFlow',
    description: 'Gerencie seus pontos de fidelidade, visualize recompensas e acompanhe seu nível.'
  }
}