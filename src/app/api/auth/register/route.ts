import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema de validação
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  accountType: z.enum(['professional', 'client']).default('client')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar dados de entrada
    const validatedData = registerSchema.parse(body)
    const { name, email, password, phone, businessName, accountType } = validatedData

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já existe com este email' },
        { status: 409 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Determinar o role baseado no tipo de conta
    let userRole: UserRole = 'USER'
    if (accountType === 'professional') {
      userRole = 'PROFESSIONAL'
    }

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: userRole
      }
    })

    // Se for profissional, criar registro Professional
    if (accountType === 'professional') {
      await prisma.professional.create({
        data: {
          userId: user.id,
          businessName: businessName || null,
          phone: phone || null,
          // Configurações padrão para profissionais
          workingHours: {
            monday: { start: '08:00', end: '18:00', isWorking: true },
            tuesday: { start: '08:00', end: '18:00', isWorking: true },
            wednesday: { start: '08:00', end: '18:00', isWorking: true },
            thursday: { start: '08:00', end: '18:00', isWorking: true },
            friday: { start: '08:00', end: '18:00', isWorking: true },
            saturday: { start: '08:00', end: '16:00', isWorking: true },
            sunday: { start: '08:00', end: '16:00', isWorking: false }
          },
          services: [
            {
              id: '1',
              name: 'Corte Feminino',
              duration: 60,
              price: 50.00,
              category: 'Cabelo'
            },
            {
              id: '2',
              name: 'Escova',
              duration: 45,
              price: 35.00,
              category: 'Cabelo'
            },
            {
              id: '3',
              name: 'Manicure',
              duration: 45,
              price: 25.00,
              category: 'Unhas'
            }
          ],
          settings: {
            timezone: 'America/Sao_Paulo',
            currency: 'BRL',
            language: 'pt-BR',
            notifications: {
              email: true,
              whatsapp: true,
              sms: false
            },
            booking: {
              advanceBookingDays: 30,
              cancellationHours: 24,
              confirmationRequired: true
            }
          }
        }
      })
    }

    // Retornar sucesso (sem dados sensíveis)
    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro no registro:', error)

    // Erro de validação
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    // Erro de banco de dados
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 409 }
      )
    }

    // Erro genérico
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}