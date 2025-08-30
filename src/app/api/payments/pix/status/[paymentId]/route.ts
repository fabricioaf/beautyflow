import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = params

    // Buscar pagamento
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: true
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    // Verificar se o pagamento pertence ao usuário
    const userProfessionalId = session.user.professionalId
    if (payment.professionalId !== userProfessionalId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Simular verificação de status (em produção seria via webhook)
    let status = payment.status.toLowerCase()
    
    // Simular pagamento aprovado aleatoriamente para demonstração
    if (status === 'pending') {
      const metadata = payment.metadata as any
      const expiresAt = new Date(metadata?.expiresAt)
      
      if (new Date() > expiresAt) {
        // PIX expirado
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'CANCELLED' }
        })
        status = 'expired'
      } else {
        // Simular aprovação aleatória (20% chance)
        const shouldApprove = Math.random() < 0.2
        
        if (shouldApprove) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: { 
              status: 'COMPLETED',
              paidAt: new Date()
            }
          })
          
          // Atualizar status do agendamento se existir
          if (payment.appointmentId) {
            await prisma.appointment.update({
              where: { id: payment.appointmentId },
              data: { paymentStatus: 'COMPLETED' }
            })
          }
          
          status = 'paid'
        }
      }
    }

    return NextResponse.json({
      id: payment.id,
      status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      paidAt: payment.paidAt,
      appointment: payment.appointment ? {
        id: payment.appointment.id,
        serviceName: payment.appointment.serviceName,
        scheduledFor: payment.appointment.scheduledFor
      } : null
    })

  } catch (error) {
    console.error('Erro ao verificar status do PIX:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}