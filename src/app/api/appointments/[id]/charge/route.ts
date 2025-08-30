import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { z } from 'zod'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

// Schema de validação
const chargeSchema = z.object({
  appointmentId: z.string(),
  method: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD']),
  amount: z.number().min(100), // Mínimo R$ 1,00
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = chargeSchema.parse(body)
    const { appointmentId, method, amount, description, metadata } = validatedData

    // Buscar o professional do usuário
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      )
    }

    // Buscar agendamento
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        ...(session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' 
          ? {} 
          : { professionalId: professional!.id })
      },
      include: {
        client: true,
        professional: {
          include: {
            user: true
          }
        }
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verificar se já existe transação para este agendamento
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        appointmentId: appointment.id,
        status: {
          in: ['PENDING', 'PROCESSING', 'PAID']
        }
      }
    })

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Payment already exists for this appointment' },
        { status: 409 }
      )
    }

    // Calcular taxas
    let feeAmount = 0
    if (method === 'CREDIT_CARD') {
      feeAmount = Math.round(amount * 0.029) + 30 // 2.9% + R$ 0,30
    } else if (method === 'DEBIT_CARD') {
      feeAmount = Math.round(amount * 0.019) + 30 // 1.9% + R$ 0,30
    }
    // PIX sem taxa

    const netAmount = amount - feeAmount

    // Criar transação no banco
    const transaction = await prisma.transaction.create({
      data: {
        professionalId: appointment.professionalId,
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        amount,
        netAmount,
        feeAmount,
        method,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        metadata: {
          description: description || `Pagamento para ${appointment.serviceName}`,
          appointmentDate: appointment.scheduledFor.toISOString(),
          serviceName: appointment.serviceName,
          createdFrom: 'appointment_charge',
          ...metadata
        }
      }
    })

    let paymentResponse: any = {}

    if (method === 'PIX') {
      // Gerar PIX (mock - em produção usar provedor real)
      const pixKey = `pix-${transaction.id}`
      const pixQrCode = `pix-qr-${transaction.id}`

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          pixKey,
          pixQrCode,
          metadata: {
            ...transaction.metadata as any,
            pixGenerated: true,
            pixExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
          }
        }
      })

      paymentResponse = {
        type: 'PIX',
        pixKey,
        pixQrCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }

    } else {
      // Criar PaymentIntent no Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'brl',
        description: description || `Pagamento - ${appointment.serviceName}`,
        metadata: {
          transactionId: transaction.id,
          appointmentId: appointment.id,
          professionalId: appointment.professionalId,
          clientId: appointment.clientId
        },
        payment_method_types: method === 'CREDIT_CARD' ? ['card'] : ['card'],
        capture_method: 'automatic'
      })

      // Atualizar transação com dados do Stripe
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: 'PROCESSING',
          metadata: {
            ...transaction.metadata as any,
            stripeCreated: true,
            stripeClientSecret: paymentIntent.client_secret
          }
        }
      })

      paymentResponse = {
        type: 'STRIPE',
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    }

    // Atualizar status do agendamento
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        paymentStatus: 'PROCESSING'
      }
    })

    // Criar notificação para o cliente
    await prisma.notification.create({
      data: {
        userId: appointment.client.userId,
        title: 'Cobrança Gerada',
        message: `Uma cobrança de R$ ${(amount / 100).toFixed(2)} foi gerada para seu agendamento de ${appointment.serviceName}.`,
        type: 'PAYMENT_CONFIRMATION',
        metadata: {
          transactionId: transaction.id,
          appointmentId: appointment.id,
          amount,
          method
        }
      }
    })

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount,
        netAmount,
        feeAmount,
        method,
        status: transaction.status,
        expiresAt: transaction.expiresAt
      },
      payment: paymentResponse,
      appointment: {
        id: appointment.id,
        serviceName: appointment.serviceName,
        scheduledFor: appointment.scheduledFor,
        client: {
          name: appointment.client.name,
          email: appointment.client.email
        }
      }
    })

  } catch (error) {
    console.error('Error creating appointment charge:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Listar transações de um agendamento
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointmentId')

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointmentId is required' },
        { status: 400 }
      )
    }

    // Buscar o professional do usuário
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      )
    }

    // Buscar agendamento
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        ...(session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' 
          ? {} 
          : { professionalId: professional!.id })
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Buscar transações do agendamento
    const transactions = await prisma.transaction.findMany({
      where: {
        appointmentId: appointment.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        disputes: true
      }
    })

    return NextResponse.json({
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        amount: transaction.amount,
        netAmount: transaction.netAmount,
        feeAmount: transaction.feeAmount,
        method: transaction.method,
        status: transaction.status,
        paidAt: transaction.paidAt,
        createdAt: transaction.createdAt,
        expiresAt: transaction.expiresAt,
        metadata: transaction.metadata,
        disputes: transaction.disputes
      }))
    })

  } catch (error) {
    console.error('Error fetching appointment transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}