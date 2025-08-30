import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const prisma = new PrismaClient()

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  // Processar diferentes tipos de eventos
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
        break
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
        
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent)
        break
        
      case 'payment_intent.requires_action':
        // PIX gerado, aguardando pagamento
        await handlePaymentPending(event.data.object as Stripe.PaymentIntent)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id)
  
  const { appointmentId, serviceId, professionalId, clientEmail } = paymentIntent.metadata
  
  try {
    // Atualizar status do pagamento no banco
    const payment = await prisma.payment.upsert({
      where: {
        stripePaymentIntentId: paymentIntent.id
      },
      update: {
        status: 'COMPLETED',
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntent.id
      },
      create: {
        id: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: paymentIntent.amount / 100, // Converter de centavos
        currency: paymentIntent.currency.toUpperCase(),
        method: 'PIX',
        status: 'COMPLETED',
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntent.id,
        professionalId,
        appointmentId: appointmentId || undefined,
        metadata: {
          serviceId,
          clientEmail,
          paymentType: 'pix'
        }
      }
    })

    // Atualizar status do agendamento se existir
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { 
          status: 'CONFIRMED',
          paymentStatus: 'PAID'
        }
      })

      // Enviar notificação de confirmação
      await sendPaymentConfirmationNotification(appointmentId, payment.amount)
    }

    console.log('Payment processed successfully:', payment.id)

  } catch (error) {
    console.error('Error updating payment in database:', error)
    throw error
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id)
  
  const { appointmentId } = paymentIntent.metadata
  
  try {
    // Atualizar status do pagamento
    await prisma.payment.upsert({
      where: {
        stripePaymentIntentId: paymentIntent.id
      },
      update: {
        status: 'FAILED'
      },
      create: {
        id: `pix_failed_${Date.now()}`,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        method: 'PIX',
        status: 'FAILED',
        stripePaymentIntentId: paymentIntent.id,
        professionalId: paymentIntent.metadata.professionalId,
        appointmentId: appointmentId || undefined,
        metadata: paymentIntent.metadata
      }
    })

    // Atualizar agendamento
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { 
          paymentStatus: 'FAILED'
        }
      })
    }

  } catch (error) {
    console.error('Error handling payment failure:', error)
    throw error
  }
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment canceled:', paymentIntent.id)
  
  const { appointmentId } = paymentIntent.metadata
  
  try {
    await prisma.payment.upsert({
      where: {
        stripePaymentIntentId: paymentIntent.id
      },
      update: {
        status: 'CANCELLED'
      },
      create: {
        id: `pix_canceled_${Date.now()}`,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        method: 'PIX',
        status: 'CANCELLED',
        stripePaymentIntentId: paymentIntent.id,
        professionalId: paymentIntent.metadata.professionalId,
        appointmentId: appointmentId || undefined,
        metadata: paymentIntent.metadata
      }
    })

    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { 
          paymentStatus: 'CANCELLED'
        }
      })
    }

  } catch (error) {
    console.error('Error handling payment cancellation:', error)
    throw error
  }
}

async function handlePaymentPending(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment pending (PIX generated):', paymentIntent.id)
  
  const { appointmentId } = paymentIntent.metadata
  
  try {
    await prisma.payment.upsert({
      where: {
        stripePaymentIntentId: paymentIntent.id
      },
      update: {
        status: 'PENDING'
      },
      create: {
        id: `pix_pending_${Date.now()}`,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        method: 'PIX',
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
        professionalId: paymentIntent.metadata.professionalId,
        appointmentId: appointmentId || undefined,
        metadata: paymentIntent.metadata
      }
    })

    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { 
          paymentStatus: 'PENDING'
        }
      })
    }

  } catch (error) {
    console.error('Error handling pending payment:', error)
    throw error
  }
}

async function sendPaymentConfirmationNotification(appointmentId: string, amount: number) {
  try {
    // Buscar dados do agendamento
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        professional: {
          include: {
            user: true
          }
        }
      }
    })

    if (!appointment) return

    // Preparar dados para notificação
    const notificationData = {
      type: 'PAYMENT_CONFIRMED',
      recipient: appointment.client.phone || appointment.client.email,
      title: 'Pagamento Confirmado! 💚',
      message: `Seu pagamento de R$ ${amount.toFixed(2)} foi confirmado! Agendamento confirmado para ${appointment.scheduledFor.toLocaleDateString('pt-BR')}.`,
      data: {
        appointmentId,
        amount,
        paymentMethod: 'PIX',
        professionalName: appointment.professional.user.name
      }
    }

    // Aqui você integraria com seu sistema de notificações
    // Por exemplo: WhatsApp, SMS, Email, etc.
    console.log('Sending payment confirmation notification:', notificationData)

  } catch (error) {
    console.error('Error sending payment confirmation:', error)
  }
}