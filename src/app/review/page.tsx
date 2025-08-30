'use client'

import { PostAppointmentReview } from '@/components/reviews/post-appointment-review'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

export default function ReviewPage() {
  const searchParams = useSearchParams()
  
  // Dados que viriam da URL ou API
  const appointmentId = searchParams.get('appointment') || 'apt_123'
  const professionalName = searchParams.get('professional') || 'Ana Paula'
  const serviceName = searchParams.get('service') || 'Corte + Escova'
  const serviceDate = new Date(searchParams.get('date') || Date.now())
  const clientName = searchParams.get('client') || 'Marina Silva'

  const handleSubmitReview = async (reviewData: any) => {
    try {
      // Enviar avaliação para API
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          ...reviewData
        })
      })

      if (response.ok) {
        // Adicionar pontos de fidelidade
        await fetch('/api/loyalty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: 'client_123', // Viria da sessão
            action: 'review_bonus',
            reason: 'Avaliação pós-atendimento'
          })
        })
      }
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error)
    }
  }

  const handleSkipReview = () => {
    // Redirecionar ou fechar modal
    window.close()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <PostAppointmentReview
          appointmentId={appointmentId}
          professionalName={professionalName}
          serviceName={serviceName}
          serviceDate={serviceDate}
          clientName={clientName}
          onSubmit={handleSubmitReview}
          onSkip={handleSkipReview}
        />
      </div>
    </div>
  )
}

// Versão para when embedded in other pages
export function EmbeddedReview({ appointmentId }: { appointmentId: string }) {
  return (
    <Card className="max-w-md">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold mb-2">Como foi seu atendimento?</h3>
          <p className="text-gray-600 text-sm">
            Sua opinião é muito importante para nós!
          </p>
        </div>
        
        <div className="text-center">
          <a 
            href={`/review?appointment=${appointmentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-beauty-gradient text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            ⭐ Avaliar Atendimento
          </a>
        </div>
        
        <div className="text-center mt-3">
          <p className="text-xs text-gray-500">
            Ganhe +15 pontos de fidelidade ao avaliar!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}