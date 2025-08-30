import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const prisma = new PrismaClient()

// Webhook secret do Stripe
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      console.error('No Stripe signature found')
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    console.log('Webhook received:', event.type)

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Dispute)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePayment(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, event.type)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Processing successful payment:', paymentIntent.id)

    // Buscar transação no banco
    const transaction = await prisma.transaction.findFirst({
      where: {
        stripePaymentIntentId: paymentIntent.id
      },
      include: {
        appointment: {
          include: {
            client: true,
            professional: true
          }
        }
      }
    })

    if (!transaction) {
      console.error('Transaction not found for payment intent:', paymentIntent.id)
      return
    }

    // Atualizar status da transação
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        stripeChargeId: paymentIntent.latest_charge as string,
        metadata: {
          ...transaction.metadata as any,
          webhookProcessedAt: new Date().toISOString(),
          paymentMethod: paymentIntent.payment_method_types[0]
        }
      }
    })

    // Se houver agendamento associado, confirmar
    if (transaction.appointment) {
      await prisma.appointment.update({
        where: { id: transaction.appointment.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED'
        }
      })

      // Criar notificação para o cliente
      await prisma.notification.create({
        data: {
          userId: transaction.appointment.client.id,
          title: 'Pagamento Confirmado',
          message: `Seu pagamento de R$ ${(transaction.amount / 100).toFixed(2)} foi confirmado. Agendamento confirmado para ${transaction.appointment.date.toLocaleDateString('pt-BR')}.`,
          type: 'PAYMENT_SUCCESS',
          metadata: {
            transactionId: transaction.id,
            appointmentId: transaction.appointment.id,
            amount: transaction.amount
          }
        }
      })

      // Criar notificação para o profissional
      await prisma.notification.create({
        data: {
          userId: transaction.appointment.professional.userId,
          title: 'Pagamento Recebido',
          message: `Pagamento de R$ ${(transaction.amount / 100).toFixed(2)} confirmado para agendamento de ${transaction.appointment.client.name}.`,
          type: 'PAYMENT_RECEIVED',
          metadata: {
            transactionId: transaction.id,
            appointmentId: transaction.appointment.id,
            amount: transaction.amount,
            clientName: transaction.appointment.client.name
          }
        }
      })
    }

    console.log('Payment processed successfully for transaction:', transaction.id)

  } catch (error) {
    console.error('Error handling payment success:', error)
    throw error
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Processing failed payment:', paymentIntent.id)

    const transaction = await prisma.transaction.findFirst({
      where: {
        stripePaymentIntentId: paymentIntent.id
      },
      include: {
        appointment: {
          include: {
            client: true
          }
        }
      }
    })

    if (!transaction) {
      console.error('Transaction not found for failed payment:', paymentIntent.id)
      return
    }

    // Atualizar status da transação
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        metadata: {
          ...transaction.metadata as any,
          failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
          webhookProcessedAt: new Date().toISOString()
        }
      }
    })

    // Se houver agendamento, marcar como pendente
    if (transaction.appointment) {
      await prisma.appointment.update({
        where: { id: transaction.appointment.id },
        data: {
          paymentStatus: 'FAILED',
          status: 'PENDING'
        }
      })

      // Notificar cliente sobre falha no pagamento
      await prisma.notification.create({
        data: {
          userId: transaction.appointment.client.id,
          title: 'Falha no Pagamento',
          message: `Houve um problema com seu pagamento de R$ ${(transaction.amount / 100).toFixed(2)}. Tente novamente ou entre em contato conosco.`,
          type: 'PAYMENT_FAILED',
          metadata: {
            transactionId: transaction.id,
            appointmentId: transaction.appointment.id,
            amount: transaction.amount,
            reason: paymentIntent.last_payment_error?.message
          }
        }
      })
    }

    console.log('Failed payment processed for transaction:', transaction.id)

  } catch (error) {
    console.error('Error handling payment failure:', error)
    throw error
  }
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Processing canceled payment:', paymentIntent.id)

    const transaction = await prisma.transaction.findFirst({
      where: {
        stripePaymentIntentId: paymentIntent.id
      },
      include: {
        appointment: {
          include: {
            client: true
          }
        }
      }
    })

    if (!transaction) {
      console.error('Transaction not found for canceled payment:', paymentIntent.id)
      return
    }

    // Atualizar status da transação
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'CANCELED',
        metadata: {
          ...transaction.metadata as any,
          canceledAt: new Date().toISOString(),
          webhookProcessedAt: new Date().toISOString()
        }
      }
    })

    // Se houver agendamento, liberar horário
    if (transaction.appointment) {
      await prisma.appointment.update({
        where: { id: transaction.appointment.id },
        data: {
          paymentStatus: 'CANCELED',
          status: 'CANCELED'
        }
      })

      // Notificar cliente sobre cancelamento
      await prisma.notification.create({
        data: {
          userId: transaction.appointment.client.id,
          title: 'Pagamento Cancelado',
          message: `O pagamento do seu agendamento foi cancelado. O horário foi liberado.`,
          type: 'PAYMENT_CANCELED',
          metadata: {
            transactionId: transaction.id,
            appointmentId: transaction.appointment.id,
            amount: transaction.amount
          }
        }
      })
    }

    console.log('Canceled payment processed for transaction:', transaction.id)

  } catch (error) {
    console.error('Error handling payment cancellation:', error)
    throw error
  }
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  try {
    console.log('Processing charge dispute:', dispute.id)

    // Buscar transação pela charge
    const transaction = await prisma.transaction.findFirst({
      where: {
        stripeChargeId: dispute.charge as string
      },
      include: {
        appointment: {
          include: {
            client: true,
            professional: true
          }
        }
      }
    })

    if (!transaction) {
      console.error('Transaction not found for dispute:', dispute.id)
      return
    }

    // Criar registro de disputa
    await prisma.dispute.create({
      data: {
        transactionId: transaction.id,
        stripeDisputeId: dispute.id,
        amount: dispute.amount,
        reason: dispute.reason,
        status: dispute.status.toUpperCase(),
        evidence: dispute.evidence || {},
        metadata: {
          createdAt: new Date(dispute.created * 1000).toISOString(),
          currency: dispute.currency
        }
      }
    })

    // Notificar profissional sobre disputa
    if (transaction.appointment?.professional) {
      await prisma.notification.create({
        data: {
          userId: transaction.appointment.professional.userId,
          title: 'Disputa de Pagamento',
          message: `Uma disputa foi aberta para o pagamento de R$ ${(dispute.amount / 100).toFixed(2)}. Motivo: ${dispute.reason}`,
          type: 'PAYMENT_DISPUTE',
          priority: 'HIGH',
          metadata: {
            disputeId: dispute.id,
            transactionId: transaction.id,
            amount: dispute.amount,
            reason: dispute.reason
          }
        }
      })
    }

    console.log('Dispute processed for transaction:', transaction.id)

  } catch (error) {
    console.error('Error handling charge dispute:', error)
    throw error
  }
}

async function handleInvoicePayment(invoice: Stripe.Invoice) {
  try {
    console.log('Processing invoice payment:', invoice.id)

    // Processar pagamentos de assinatura ou faturas
    if (invoice.subscription) {
      // Lógica para assinaturas futuras
      console.log('Invoice payment for subscription:', invoice.subscription)
    }

  } catch (error) {
    console.error('Error handling invoice payment:', error)
    throw error
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription, eventType: string) {
  try {
    console.log('Processing subscription change:', subscription.id, eventType)

    // Lógica para mudanças de assinatura (futuro)
    // Pode ser usado para planos profissionais premium

  } catch (error) {
    console.error('Error handling subscription change:', error)
    throw error
  }
}