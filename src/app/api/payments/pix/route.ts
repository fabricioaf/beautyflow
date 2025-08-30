import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      amount, 
      appointmentId, 
      serviceId, 
      clientEmail, 
      clientName,
      description = 'Pagamento de serviço BeautyFlow'
    } = body

    // Validações básicas
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    if (!appointmentId || !serviceId) {
      return NextResponse.json({ error: 'Dados do agendamento obrigatórios' }, { status: 400 })
    }

    // Criar Payment Intent com PIX
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe trabalha com centavos
      currency: 'brl',
      payment_method_types: ['pix'],
      metadata: {
        appointmentId,
        serviceId,
        professionalId: session.user.id,
        clientEmail: clientEmail || '',
        clientName: clientName || '',
        paymentType: 'pix'
      },
      description,
      // Configurações específicas do PIX
      payment_method_options: {
        pix: {
          expires_after_seconds: 300 // PIX expira em 5 minutos
        }
      }
    })

    // Retorna os dados necessários para o frontend
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: 'BRL',
      status: paymentIntent.status,
      expiresAt: new Date(Date.now() + 300 * 1000).toISOString(), // 5 minutos
      qrCodeData: null // Será gerado no frontend via Stripe Elements
    })

  } catch (error) {
    console.error('Erro ao criar PIX:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Erro no processamento do pagamento', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET para verificar status do pagamento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('payment_intent_id')

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment Intent ID obrigatório' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    return NextResponse.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
      created: new Date(paymentIntent.created * 1000).toISOString()
    })

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar status do pagamento' },
      { status: 500 }
    )
  }
}