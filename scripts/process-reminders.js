#!/usr/bin/env node

/**
 * Script para processar lembretes pendentes
 * Deve ser executado periodicamente (ex: a cada 5 minutos)
 * 
 * Uso:
 * - Local: node scripts/process-reminders.js
 * - Cron: */5 * * * * /usr/bin/node /path/to/scripts/process-reminders.js
 * - Vercel Cron: configurar como webhook para /api/cron/reminders
 */

const https = require('https')
const http = require('http')

const config = {
  // URL da aplicação (ajustar conforme ambiente)
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Token de autenticação do cron (opcional, para segurança)
  cronToken: process.env.CRON_SECRET_TOKEN,
  
  // Timeout em milliseconds
  timeout: 30000
}

async function processReminders() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/cron/reminders', config.baseUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BeautyFlow-Cron/1.0'
      },
      timeout: config.timeout
    }

    // Adicionar token de autenticação se configurado
    if (config.cronToken) {
      options.headers['Authorization'] = `Bearer ${config.cronToken}`
    }

    const req = client.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ Lembretes processados com sucesso:`, response)
            resolve(response)
          } else {
            console.error(`❌ Erro HTTP ${res.statusCode}:`, response)
            reject(new Error(`HTTP ${res.statusCode}: ${response.error || 'Erro desconhecido'}`))
          }
        } catch (parseError) {
          console.error('❌ Erro ao interpretar resposta:', parseError)
          console.error('Resposta recebida:', data)
          reject(parseError)
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Erro de conexão:', error)
      reject(error)
    })

    req.on('timeout', () => {
      console.error('❌ Timeout na requisição')
      req.destroy()
      reject(new Error('Timeout na requisição'))
    })

    // Finalizar requisição
    req.end()
  })
}

async function main() {
  const startTime = Date.now()
  
  console.log(`🚀 Iniciando processamento de lembretes...`)
  console.log(`📅 Timestamp: ${new Date().toISOString()}`)
  console.log(`🌐 URL: ${config.baseUrl}/api/cron/reminders`)
  
  try {
    const result = await processReminders()
    const duration = Date.now() - startTime
    
    console.log(`✅ Processamento concluído em ${duration}ms`)
    console.log(`📊 Resultado:`, result)
    
    process.exit(0)
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    console.error(`❌ Falha no processamento após ${duration}ms`)
    console.error(`🔍 Erro:`, error.message)
    
    // Em ambientes de produção, você pode querer notificar sobre falhas
    // Ex: enviar para Sentry, Slack, etc.
    
    process.exit(1)
  }
}

// Executar apenas se chamado diretamente (não importado)
if (require.main === module) {
  main()
}

module.exports = { processReminders }