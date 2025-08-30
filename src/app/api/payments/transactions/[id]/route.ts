import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const transactionId = params.id

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

    // Construir where clause
    const whereClause: any = { id: transactionId }

    // Se não for admin, verificar se a transação pertence ao profissional
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      whereClause.professionalId = professional!.id
    }

    // Buscar transação
    const transaction = await prisma.transaction.findFirst({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            preferences: true
          }
        },
        appointment: {
          include: {
            teamMember: {
              include: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        professional: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        disputes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Formatear resposta
    const formattedTransaction = {
      id: transaction.id,
      amount: transaction.amount,
      netAmount: transaction.netAmount,
      feeAmount: transaction.feeAmount,
      currency: transaction.currency,
      method: transaction.method,
      status: transaction.status,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      stripeChargeId: transaction.stripeChargeId,
      pixKey: transaction.pixKey,
      pixQrCode: transaction.pixQrCode,
      pixTxId: transaction.pixTxId,
      paidAt: transaction.paidAt,
      expiresAt: transaction.expiresAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      metadata: transaction.metadata,
      client: transaction.client,
      appointment: transaction.appointment,
      professional: session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' 
        ? transaction.professional 
        : undefined,
      disputes: transaction.disputes
    }

    return NextResponse.json({
      transaction: formattedTransaction
    })

  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Endpoint para atualizar status da transação (apenas para admins)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const transactionId = params.id
    const body = await request.json()

    const { status, notes } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validar status
    const validStatuses = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Buscar transação
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        appointment: true
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Atualizar transação
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        metadata: {
          ...transaction.metadata as any,
          adminUpdate: {
            updatedBy: session.user.id,
            updatedAt: new Date().toISOString(),
            notes: notes || 'Status updated by admin'
          }
        }
      },
      include: {
        client: true,
        appointment: true,
        professional: true
      }
    })

    // Se houver agendamento, atualizar status também
    if (transaction.appointment) {
      let appointmentPaymentStatus: any = 'PENDING'
      
      switch (status) {
        case 'PAID':
          appointmentPaymentStatus = 'PAID'
          break
        case 'FAILED':
          appointmentPaymentStatus = 'FAILED'
          break
        case 'CANCELED':
        case 'EXPIRED':
          appointmentPaymentStatus = 'CANCELED'
          break
        case 'REFUNDED':
          appointmentPaymentStatus = 'REFUNDED'
          break
        default:
          appointmentPaymentStatus = 'PENDING'
      }

      await prisma.appointment.update({
        where: { id: transaction.appointment.id },
        data: {
          paymentStatus: appointmentPaymentStatus
        }
      })
    }

    // Criar notificação para o cliente se necessário
    if (status === 'PAID' || status === 'FAILED' || status === 'REFUNDED') {
      let title = ''
      let message = ''
      let type: any = 'SYSTEM'

      switch (status) {
        case 'PAID':
          title = 'Pagamento Confirmado'
          message = `Seu pagamento de R$ ${(transaction.amount / 100).toFixed(2)} foi confirmado.`
          type = 'PAYMENT_SUCCESS'
          break
        case 'FAILED':
          title = 'Falha no Pagamento'
          message = `Houve um problema com seu pagamento de R$ ${(transaction.amount / 100).toFixed(2)}.`
          type = 'PAYMENT_FAILED'
          break
        case 'REFUNDED':
          title = 'Pagamento Reembolsado'
          message = `O reembolso de R$ ${(transaction.amount / 100).toFixed(2)} foi processado.`
          type = 'PAYMENT_SUCCESS'
          break
      }

      await prisma.notification.create({
        data: {
          userId: updatedTransaction.client.userId,
          title,
          message,
          type,
          metadata: {
            transactionId: updatedTransaction.id,
            amount: updatedTransaction.amount,
            adminUpdate: true
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction
    })

  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}