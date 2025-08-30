import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { z } from 'zod'

const prisma = new PrismaClient()

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Por segurança, sempre retornar sucesso mesmo se o usuário não existir
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Se o email existir, você receberá as instruções'
      })
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hora

    // Salvar token no banco
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    // Em produção, aqui você enviaria o email
    // Por enquanto, vamos simular o envio
    console.log(`Reset token para ${email}: ${resetToken}`)
    console.log(`Link de reset: ${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`)

    // TODO: Implementar envio de email
    // await sendPasswordResetEmail(email, resetToken)

    return NextResponse.json({
      success: true,
      message: 'Se o email existir, você receberá as instruções'
    })

  } catch (error) {
    console.error('Erro no forgot password:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}