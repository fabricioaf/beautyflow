import { NextRequest, NextResponse } from 'next/server'
import { reminderScheduler } from '@/lib/reminder-scheduler'

// Endpoint para cron job que processa lembretes pendentes
export async function POST(request: NextRequest) {
  try {
    // Verificar token de autenticação do cron (opcional, para segurança)
    const authHeader = request.headers.get('authorization')
    const cronToken = process.env.CRON_SECRET_TOKEN

    if (cronToken && authHeader !== `Bearer ${cronToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Iniciando processamento de lembretes pendentes...')
    
    const startTime = Date.now()
    
    // Processar lembretes pendentes
    await reminderScheduler.processPendingReminders()
    
    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`[CRON] Processamento de lembretes concluído em ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Lembretes processados com sucesso',
      processedAt: new Date().toISOString(),
      duration: `${duration}ms`
    })

  } catch (error) {
    console.error('[CRON] Erro ao processar lembretes:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar status do cron
export async function GET() {
  try {
    // Buscar estatísticas básicas
    const stats = await reminderScheduler.getReminderStats()

    return NextResponse.json({
      status: 'active',
      lastCheck: new Date().toISOString(),
      stats
    })

  } catch (error) {
    console.error('Erro ao verificar status do cron:', error)
    
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}