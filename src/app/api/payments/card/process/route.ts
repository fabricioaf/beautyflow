import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import Stripe from 'stripe'

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const prisma = new PrismaClient()

// Schema de validação
const cardPaymentSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  appointmentId: z.string().optional(),
  description: z.string().optional(),
  card: z.object({
    number: z.string().min(13).max(19),
    expiry: z.string().regex(/^\d{2}\/\d{2}$/),
    cvc: z.string().min(3).max(4),
    name: z.string().min(1)
  })
})

// Função para simular processamento Stripe (desenvolvimento)
async function processStripePayment(amount: number, cardData: any, description?: string) {
  try {
    // Em produção, usaria o Stripe real
    // Por agora, vamos simular o comportamento
    
    if (process.env.NODE_ENV === 'production' && process.env.STRIPE_SECRET_KEY) {
      // Código real do Stripe para produção
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe usa centavos
        currency: 'brl',
        description: description || 'Pagamento BeautyFlow',
        payment_method_data: {
          type: 'card',
          card: {
            number: cardData.number,
            exp_month: parseInt(cardData.expiry.split('/')[0]),
            exp_year: parseInt('20' + cardData.expiry.split('/')[1]),
            cvc: cardData.cvc
          },
          billing_details: {
            name: cardData.name
          }
        },
        confirm: true,
        return_url: `${process.env.NEXTAUTH_URL}/payments/success`
      })

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret
      }
    } else {
      // Simulação para desenvolvimento
      const simulatedResult = {
        id: `pi_${Math.random().toString(36).substring(2)}`,
        status: 'succeeded', // ou 'requires_action' para 3D Secure
        client_secret: `pi_${Math.random().toString(36).substring(2)}_secret`
      }

      // Simular falha ocasional (10% chance)
      if (Math.random() < 0.1) {
        throw new Error('Cartão recusado pelo banco')
      }

      // Simular 3D Secure ocasional (20% chance)
      if (Math.random() < 0.2) {
        simulatedResult.status = 'requires_action'
      }

      return simulatedResult
    }
  } catch (error: any) {
    if (error.type === 'StripeCardError') {
      throw new Error(`Cartão recusado: ${error.message}`)
    }
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, appointmentId, description, card } = cardPaymentSchema.parse(body)

    // Calcular taxas
    const fee = amount * 0.029 + 0.30
    const totalAmount = amount + fee

    // Processar pagamento com Stripe
    const stripeResult = await processStripePayment(totalAmount, card, description)

    // Criar registro de pagamento
    const payment = await prisma.payment.create({
      data: {
        professionalId: session.user.professionalId || 'default',
        appointmentId: appointmentId || null,
        amount: totalAmount,
        currency: 'BRL',
        method: 'CREDIT_CARD',
        status: stripeResult.status === 'succeeded' ? 'COMPLETED' : 'PROCESSING',
        stripePaymentIntentId: stripeResult.id,
        paidAt: stripeResult.status === 'succeeded' ? new Date() : null,
        metadata: {
          originalAmount: amount,
          fee: fee,
          cardLast4: card.number.slice(-4),
          cardName: card.name,
          stripeClientSecret: stripeResult.client_secret
        }
      }
    })

    // Atualizar agendamento se pagamento foi aprovado
    if (appointmentId && stripeResult.status === 'succeeded') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { paymentStatus: 'COMPLETED' }
      })
    }

    // Resposta baseada no status
    if (stripeResult.status === 'succeeded') {
      return NextResponse.json({
        success: true,
        status: 'succeeded',
        payment: {
          id: payment.id,
          amount: totalAmount,
          status: 'completed',
          method: 'credit_card',
          cardLast4: card.number.slice(-4)
        }
      })
    } else if (stripeResult.status === 'requires_action') {
      return NextResponse.json({
        success: true,
        status: 'requires_action',
        payment: {
          id: payment.id,
          amount: totalAmount,
          status: 'requires_action',
          client_secret: stripeResult.client_secret
        }
      })
    } else {
      throw new Error('Status de pagamento inesperado')
    }

  } catch (error: any) {
    console.error('Erro no processamento do cartão:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados do cartão inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    // Erros específicos de pagamento
    if (error.message.includes('recusado') || error.message.includes('declined')) {
      return NextResponse.json(
        { error: 'Cartão recusado pelo banco emissor' },
        { status: 402 }
      )
    }

    if (error.message.includes('insufficient_funds')) {
      return NextResponse.json(
        { error: 'Saldo insuficiente' },
        { status: 402 }
      )
    }

    if (error.message.includes('expired_card')) {
      return NextResponse.json(
        { error: 'Cartão expirado' },
        { status: 402 }
      )
    }

    return NextResponse.json(
      { error: 'Erro no processamento do pagamento' },
      { status: 500 }
    )
  }
}