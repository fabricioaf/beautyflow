import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Schema de validação
const pixPaymentSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  appointmentId: z.string().optional(),
  description: z.string().optional()
})

// Função para gerar código PIX (simulação)
function generatePixCode(amount: number, description?: string): string {
  // Em produção, isso seria feito através de uma API de pagamentos real
  // Esta é uma implementação simplificada para demonstração
  
  const payload = {
    version: "01",
    pixKey: "12345678901", // Chave PIX do negócio
    merchantName: "BEAUTYFLOW PAGAMENTOS LTDA",
    merchantCity: "SAO PAULO",
    amount: amount.toFixed(2),
    description: description || "Pagamento BeautyFlow",
    txId: crypto.randomBytes(16).toString('hex')
  }

  // Formato PIX simplificado (em produção usar biblioteca específica)
  const pixCode = `00020126580014BR.GOV.BCB.PIX0136${payload.pixKey}5204000053039865402${payload.amount}5925${payload.merchantName}6014${payload.merchantCity}62160512${payload.description}6304${generateCRC(payload)}`
  
  return pixCode
}

function generateCRC(payload: any): string {
  // CRC simples para demonstração
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

// Função para gerar QR Code (URL de imagem)
function generateQRCodeImage(pixCode: string): string {
  // Em produção, usar um serviço real de QR Code
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, appointmentId, description } = pixPaymentSchema.parse(body)

    // Gerar dados do PIX
    const pixCode = generatePixCode(amount, description)
    const qrCodeImage = generateQRCodeImage(pixCode)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    // Criar registro de pagamento
    const payment = await prisma.payment.create({
      data: {
        professionalId: session.user.professionalId || 'default',
        appointmentId: appointmentId || null,
        amount,
        currency: 'BRL',
        method: 'PIX',
        status: 'PENDING',
        metadata: {
          pixCode,
          qrCodeImage,
          expiresAt: expiresAt.toISOString()
        }
      }
    })

    // Retornar dados do PIX
    return NextResponse.json({
      success: true,
      pixPayment: {
        id: payment.id,
        pixCode,
        qrCodeImage,
        expiresAt,
        status: 'pending',
        amount
      }
    })

  } catch (error) {
    console.error('Erro ao gerar PIX:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}