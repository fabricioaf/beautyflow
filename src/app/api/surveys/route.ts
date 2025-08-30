import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obter pesquisas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const surveyId = searchParams.get('surveyId')
    const includeResponses = searchParams.get('includeResponses') === 'true'

    // Buscar profissional
    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    if (surveyId) {
      // Buscar pesquisa específica
      // Em produção seria uma tabela dedicada Survey
      // Por enquanto simulamos com dados no campo settings do professional
      const surveys = professional.settings as any
      const survey = surveys?.surveys?.find((s: any) => s.id === surveyId)

      if (!survey) {
        return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 })
      }

      let responses = []
      if (includeResponses) {
        // Buscar respostas (simuladas)
        responses = [
          {
            id: 'resp_1',
            clientName: 'Marina Silva',
            submittedAt: new Date('2024-01-20T14:30:00'),
            responses: {
              overall_satisfaction: 5,
              recommend: 9,
              service_quality: 'Qualidade do serviço',
              suggestions: 'Continuar com o excelente trabalho!'
            }
          },
          {
            id: 'resp_2',
            clientName: 'Ana Costa',
            submittedAt: new Date('2024-01-20T16:15:00'),
            responses: {
              overall_satisfaction: 4,
              recommend: 8,
              service_quality: 'Atendimento profissional',
              suggestions: ''
            }
          }
        ]
      }

      return NextResponse.json({
        survey,
        responses,
        stats: {
          totalResponses: responses.length,
          averageRating: responses.length > 0 
            ? responses.reduce((sum, r) => sum + r.responses.overall_satisfaction, 0) / responses.length
            : 0,
          npsScore: responses.length > 0
            ? responses.reduce((sum, r) => sum + r.responses.recommend, 0) / responses.length
            : 0
        }
      })
    } else {
      // Buscar todas as pesquisas do profissional
      const surveys = (professional.settings as any)?.surveys || []
      
      return NextResponse.json({
        surveys: surveys.map((survey: any) => ({
          ...survey,
          responseCount: Math.floor(Math.random() * 50) + 5, // Simulado
          averageRating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0
          lastResponse: new Date()
        }))
      })
    }

  } catch (error) {
    console.error('Erro ao buscar pesquisas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova pesquisa ou responder pesquisa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, surveyData, surveyId, responses, clientId } = body

    if (action === 'create') {
      // Criar nova pesquisa
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const professional = await prisma.professional.findUnique({
        where: { userId: session.user.id }
      })

      if (!professional) {
        return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
      }

      // Validar dados da pesquisa
      if (!surveyData.title || !surveyData.questions || surveyData.questions.length === 0) {
        return NextResponse.json(
          { error: 'Dados da pesquisa inválidos' },
          { status: 400 }
        )
      }

      // Criar pesquisa
      const newSurvey = {
        id: `survey_${Date.now()}`,
        title: surveyData.title,
        description: surveyData.description,
        questions: surveyData.questions,
        createdAt: new Date(),
        isActive: true,
        professionalId: professional.id
      }

      // Salvar no campo settings (em produção seria uma tabela separada)
      const currentSettings = (professional.settings as any) || {}
      const surveys = currentSettings.surveys || []
      surveys.push(newSurvey)

      await prisma.professional.update({
        where: { id: professional.id },
        data: {
          settings: {
            ...currentSettings,
            surveys
          }
        }
      })

      return NextResponse.json({
        success: true,
        survey: newSurvey,
        message: 'Pesquisa criada com sucesso!'
      })

    } else if (action === 'respond') {
      // Responder a uma pesquisa
      if (!surveyId || !responses || !clientId) {
        return NextResponse.json(
          { error: 'Dados da resposta inválidos' },
          { status: 400 }
        )
      }

      // Buscar cliente
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      })

      if (!client) {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
      }

      // Salvar resposta (em produção seria uma tabela SurveyResponse)
      const responseRecord = {
        id: `response_${Date.now()}`,
        surveyId,
        clientId,
        clientName: client.name,
        responses,
        submittedAt: new Date()
      }

      // Em produção, salvar em tabela dedicada
      console.log('Survey response saved:', responseRecord)

      // Adicionar pontos de fidelidade
      await prisma.client.update({
        where: { id: clientId },
        data: {
          loyaltyPoints: {
            increment: 10 // 10 pontos por pesquisa respondida
          }
        }
      })

      return NextResponse.json({
        success: true,
        responseId: responseRecord.id,
        pointsEarned: 10,
        message: 'Resposta enviada com sucesso! Você ganhou 10 pontos de fidelidade.'
      })

    } else {
      return NextResponse.json(
        { error: 'Ação inválida' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Erro ao processar pesquisa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar pesquisa
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { surveyId, updates } = body

    if (!surveyId) {
      return NextResponse.json({ error: 'ID da pesquisa obrigatório' }, { status: 400 })
    }

    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Atualizar pesquisa no settings
    const currentSettings = (professional.settings as any) || {}
    const surveys = currentSettings.surveys || []
    
    const surveyIndex = surveys.findIndex((s: any) => s.id === surveyId)
    if (surveyIndex === -1) {
      return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 })
    }

    surveys[surveyIndex] = {
      ...surveys[surveyIndex],
      ...updates,
      updatedAt: new Date()
    }

    await prisma.professional.update({
      where: { id: professional.id },
      data: {
        settings: {
          ...currentSettings,
          surveys
        }
      }
    })

    return NextResponse.json({
      success: true,
      survey: surveys[surveyIndex],
      message: 'Pesquisa atualizada com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao atualizar pesquisa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir pesquisa
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const surveyId = searchParams.get('surveyId')

    if (!surveyId) {
      return NextResponse.json({ error: 'ID da pesquisa obrigatório' }, { status: 400 })
    }

    const professional = await prisma.professional.findUnique({
      where: { userId: session.user.id }
    })

    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Remover pesquisa do settings
    const currentSettings = (professional.settings as any) || {}
    const surveys = currentSettings.surveys || []
    
    const filteredSurveys = surveys.filter((s: any) => s.id !== surveyId)

    await prisma.professional.update({
      where: { id: professional.id },
      data: {
        settings: {
          ...currentSettings,
          surveys: filteredSurveys
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Pesquisa excluída com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao excluir pesquisa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}