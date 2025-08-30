import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST - Criar nova avaliação
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      appointmentId,
      rating,
      comment,
      wouldRecommend,
      serviceQuality,
      professionalAttitude,
      cleanliness,
      valueForMoney
    } = body

    // Validações básicas
    if (!appointmentId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Dados de avaliação inválidos' },
        { status: 400 }
      )
    }

    // Buscar o agendamento
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

    if (!appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se agendamento foi concluído
    if (appointment.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Agendamento ainda não foi concluído' },
        { status: 400 }
      )
    }

    // Verificar se já existe avaliação para este agendamento
    // (Em produção seria uma tabela separada Review)
    // Por enquanto, vamos simular salvando nos metadados

    const reviewData = {
      rating,
      comment: comment || '',
      wouldRecommend: wouldRecommend || false,
      detailedRatings: {
        serviceQuality: serviceQuality || 0,
        professionalAttitude: professionalAttitude || 0,
        cleanliness: cleanliness || 0,
        valueForMoney: valueForMoney || 0
      },
      submittedAt: new Date(),
      clientName: appointment.client.name
    }

    // Atualizar appointment com dados da avaliação (simulação)
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        notes: `Avaliação: ${rating} estrelas. ${comment || ''}`
      }
    })

    // Calcular média de avaliações do profissional
    // Em produção, isso seria feito com uma query agregada na tabela de reviews
    const professionalRating = rating // Simplificado

    // Enviar notificação para o profissional
    await prisma.notification.create({
      data: {
        id: `review_${Date.now()}`,
        professionalId: appointment.professionalId,
        appointmentId: appointmentId,
        type: 'MARKETING', // Usar um tipo mais específico em produção
        title: rating >= 4 ? 'Nova avaliação positiva! ⭐' : 'Nova avaliação recebida',
        message: rating >= 4 
          ? `${appointment.client.name} avaliou seu atendimento com ${rating} estrelas!`
          : `${appointment.client.name} enviou uma avaliação.`,
        channel: 'dashboard',
        recipient: appointment.professional.user.email || '',
        metadata: reviewData
      }
    })

    // Resposta da API
    return NextResponse.json({
      success: true,
      reviewId: `review_${appointmentId}_${Date.now()}`,
      message: 'Avaliação enviada com sucesso!',
      data: {
        rating,
        professionalRating,
        pointsEarned: 15 // Pontos fixos por avaliação
      }
    })

  } catch (error) {
    console.error('Erro ao processar avaliação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Obter avaliações
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const appointmentId = searchParams.get('appointmentId')

    // Buscar avaliações do profissional
    if (professionalId) {
      // Em produção, buscar de uma tabela dedicada de reviews
      const appointments = await prisma.appointment.findMany({
        where: {
          professionalId,
          status: 'COMPLETED',
          notes: {
            contains: 'Avaliação:'
          }
        },
        include: {
          client: true
        },
        orderBy: {
          scheduledFor: 'desc'
        },
        take: 50
      })

      // Simular extração de dados de avaliação das notes
      const reviews = appointments.map(apt => {
        const notesMatch = apt.notes?.match(/Avaliação: (\d) estrelas\.(.*)/)
        return {
          id: `review_${apt.id}`,
          appointmentId: apt.id,
          rating: notesMatch ? parseInt(notesMatch[1]) : 5,
          comment: notesMatch ? notesMatch[2].trim() : '',
          clientName: apt.client.name,
          serviceName: apt.serviceName,
          date: apt.scheduledFor
        }
      })

      // Calcular estatísticas
      const totalReviews = reviews.length
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0

      const ratingDistribution = {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length
      }

      return NextResponse.json({
        reviews,
        stats: {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          ratingDistribution
        }
      })
    }

    // Buscar avaliação específica
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { client: true }
      })

      if (!appointment) {
        return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
      }

      // Verificar se já existe avaliação
      const hasReview = appointment.notes?.includes('Avaliação:')

      return NextResponse.json({
        hasReview,
        appointmentId,
        serviceName: appointment.serviceName,
        clientName: appointment.client.name,
        date: appointment.scheduledFor
      })
    }

    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao buscar avaliações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}