import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { LoyaltySystem } from '@/lib/loyalty-system'

const prisma = new PrismaClient()
const loyaltySystem = new LoyaltySystem()

// GET - Obter pontos e histórico do cliente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID obrigatório' }, { status: 400 })
    }

    // Buscar cliente e verificar se pertence ao profissional logado
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        professional: {
          userId: session.user.id
        }
      },
      include: {
        appointments: {
          where: { status: 'COMPLETED' },
          orderBy: { scheduledFor: 'desc' }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Calcular estatísticas
    const totalAppointments = client.appointments.length
    const totalSpent = client.appointments.reduce((sum, apt) => sum + apt.servicePrice, 0)
    const loyaltyLevel = loyaltySystem.getLoyaltyLevel(client.loyaltyPoints)

    // Buscar transações de pontos (simulado - em produção seria uma tabela separada)
    const transactions = client.appointments.map(apt => ({
      id: apt.id,
      type: 'earned' as const,
      points: loyaltySystem.calculateAppointmentPoints(apt.servicePrice),
      reason: `Atendimento: ${apt.serviceName}`,
      date: apt.scheduledFor,
      appointmentId: apt.id
    }))

    // Verificar se é aniversário e ainda não ganhou pontos este ano
    const hasBirthdayBonus = client.birthDate && 
      loyaltySystem.isClientBirthday(client.birthDate) &&
      !loyaltySystem.hasBirthdayPointsThisYear(transactions)

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        loyaltyPoints: client.loyaltyPoints,
        birthDate: client.birthDate
      },
      stats: {
        totalAppointments,
        totalSpent,
        loyaltyLevel
      },
      transactions,
      hasBirthdayBonus,
      availableRewards: loyaltySystem.getAvailableRewards(),
      redeemableRewards: loyaltySystem.getRedeemableRewards(client.loyaltyPoints)
    })

  } catch (error) {
    console.error('Erro ao buscar dados de fidelidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Adicionar ou resgatar pontos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, action, points, reason, rewardId, appointmentId } = body

    if (!clientId || !action) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    // Buscar cliente
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        professional: {
          userId: session.user.id
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    let updatedPoints = client.loyaltyPoints
    let transactionReason = reason || ''

    switch (action) {
      case 'add_points':
        if (!points || points <= 0) {
          return NextResponse.json({ error: 'Pontos inválidos' }, { status: 400 })
        }
        updatedPoints += points
        break

      case 'redeem_reward':
        if (!rewardId) {
          return NextResponse.json({ error: 'ID da recompensa obrigatório' }, { status: 400 })
        }

        const redeemResult = loyaltySystem.redeemReward(clientId, client.loyaltyPoints, rewardId)
        if (!redeemResult.success) {
          return NextResponse.json({ error: redeemResult.error }, { status: 400 })
        }

        updatedPoints = redeemResult.newPoints
        transactionReason = `Resgate: ${rewardId}`
        
        // Retornar também o cupom gerado
        return NextResponse.json({
          success: true,
          newPoints: updatedPoints,
          coupon: redeemResult.coupon,
          message: 'Recompensa resgatada com sucesso!'
        })

      case 'birthday_bonus':
        if (!client.birthDate || !loyaltySystem.isClientBirthday(client.birthDate)) {
          return NextResponse.json({ error: 'Não é aniversário do cliente' }, { status: 400 })
        }
        
        const birthdayPoints = loyaltySystem.calculateBirthdayPoints()
        updatedPoints += birthdayPoints
        transactionReason = 'Bonus de aniversário'
        break

      case 'review_bonus':
        const reviewPoints = loyaltySystem.calculateReviewPoints()
        updatedPoints += reviewPoints
        transactionReason = 'Avaliação enviada'
        break

      case 'referral_bonus':
        const referralPoints = loyaltySystem.calculateReferralPoints()
        updatedPoints += referralPoints
        transactionReason = 'Indicação de amigo'
        break

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    // Atualizar pontos no banco
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: updatedPoints }
    })

    // Criar registro de transação (em produção seria uma tabela separada)
    // Por enquanto, retornamos apenas o resultado

    const newLoyaltyLevel = loyaltySystem.getLoyaltyLevel(updatedPoints)
    const levelChanged = loyaltySystem.getLoyaltyLevel(client.loyaltyPoints).level !== newLoyaltyLevel.level

    return NextResponse.json({
      success: true,
      oldPoints: client.loyaltyPoints,
      newPoints: updatedPoints,
      pointsChanged: updatedPoints - client.loyaltyPoints,
      loyaltyLevel: newLoyaltyLevel,
      levelChanged,
      message: levelChanged 
        ? `Parabéns! Você subiu para o nível ${newLoyaltyLevel.level}!`
        : 'Pontos atualizados com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao processar pontos de fidelidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configurações do programa de fidelidade
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, adjustPoints, reason } = body

    if (!clientId || adjustPoints === undefined) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    // Verificar se é admin/profissional
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar cliente
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        professionalId: professional.id
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const newPoints = Math.max(0, client.loyaltyPoints + adjustPoints)

    // Atualizar pontos
    await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: newPoints }
    })

    return NextResponse.json({
      success: true,
      oldPoints: client.loyaltyPoints,
      newPoints,
      adjustment: adjustPoints,
      reason: reason || 'Ajuste manual',
      message: 'Pontos ajustados com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao ajustar pontos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}