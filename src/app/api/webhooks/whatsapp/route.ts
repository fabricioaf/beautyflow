import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import WhatsAppService from '@/lib/whatsapp-service'
import { whatsappConfirmationService } from '@/lib/whatsapp-confirmation-service'

const prisma = new PrismaClient()

interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: {
          name: string
        }
        wa_id: string
      }>
      messages?: Array<{
        from: string
        id: string
        timestamp: string
        text?: {
          body: string
        }
        type: string
        interactive?: {
          type: string
          button_reply?: {
            id: string
            title: string
          }
          list_reply?: {
            id: string
            title: string
          }
        }
      }>
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
        pricing?: {
          billable: boolean
          pricing_model: string
          category: string
        }
      }>
    }
    field: string
  }>
}

interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppWebhookEntry[]
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('Webhook verification request:', { mode, token, challenge })

    // Verify the webhook
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified successfully')
      return new NextResponse(challenge, { status: 200 })
    } else {
      console.error('Webhook verification failed:', { mode, token })
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
  } catch (error) {
    console.error('Error in webhook verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for receiving webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('x-hub-signature-256')

    // In production, verify the webhook signature
    // if (!WhatsAppService.verifyWebhook(signature || '', body, process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '')) {
    //   return NextResponse.json(
    //     { error: 'Invalid signature' },
    //     { status: 401 }
    //   )
    // }

    const payload: WhatsAppWebhookPayload = JSON.parse(body)
    console.log('Webhook received:', JSON.stringify(payload, null, 2))

    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          await processMessagesChange(change.value)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processMessagesChange(value: any) {
  try {
    // Process new messages
    if (value.messages) {
      for (const message of value.messages) {
        await processIncomingMessage(message)
      }
    }

    // Process message statuses (delivered, read, etc.)
    if (value.statuses) {
      for (const status of value.statuses) {
        await processMessageStatus(status)
      }
    }

    // Process contacts (when user first messages)
    if (value.contacts) {
      for (const contact of value.contacts) {
        await processContact(contact)
      }
    }
  } catch (error) {
    console.error('Error processing messages change:', error)
  }
}

async function processIncomingMessage(message: any) {
  try {
    console.log('Processing incoming message:', message)

    const fromNumber = WhatsAppService.formatPhoneNumber(message.from)
    
    // Find client by phone number
    const client = await prisma.client.findFirst({
      where: {
        phone: {
          contains: fromNumber.slice(-11) // Last 11 digits for Brazil
        }
      },
      include: {
        appointments: {
          where: {
            scheduledFor: {
              gte: new Date()
            }
          },
          orderBy: {
            scheduledFor: 'asc'
          },
          take: 1
        }
      }
    })

    if (!client) {
      console.log('Client not found for phone:', fromNumber)
      return
    }

    // Process different types of messages
    if (message.type === 'text') {
      await processTextMessage(client, message)
    } else if (message.type === 'interactive') {
      await processInteractiveMessage(client, message)
    }

    // Log the message in database
    await logWhatsAppMessage(client.id, message, 'RECEIVED')

  } catch (error) {
    console.error('Error processing incoming message:', error)
  }
}

async function processTextMessage(client: any, message: any) {
  try {
    const messageText = message.text.body
    const fromNumber = WhatsAppService.formatPhoneNumber(message.from)
    
    console.log(`Processando mensagem de texto de ${client.name}: "${messageText}"`)

    // Usar o novo sistema inteligente de confirmação
    const interpretedAction = await whatsappConfirmationService.processIncomingMessage(
      fromNumber,
      messageText,
      message.id
    )

    console.log('Ação interpretada:', interpretedAction)

    // Se a confiança for muito baixa, usar o sistema legado
    if (interpretedAction.confidence < 0.3) {
      await handleLegacyTextProcessing(client, message)
      return
    }

    // Executar ação interpretada
    const result = await whatsappConfirmationService.executeAction(
      interpretedAction,
      fromNumber
    )

    console.log('Resultado da execução:', result)

    // Log da mensagem processada
    await logWhatsAppMessage(client.id, message, 'RECEIVED', {
      interpretedAction,
      executionResult: result,
      processingMethod: 'intelligent'
    })

  } catch (error) {
    console.error('Erro ao processar mensagem de texto:', error)
    // Fallback para processamento legado em caso de erro
    await handleLegacyTextProcessing(client, message)
  }
}

// Processamento legado para compatibilidade
async function handleLegacyTextProcessing(client: any, message: any) {
  try {
    const messageText = message.text.body.toLowerCase().trim()
    const whatsapp = WhatsAppService.getInstance()

    // Process confirmation responses
    if (messageText.includes('sim') || messageText.includes('confirmo') || messageText.includes('ok')) {
      await handleAppointmentConfirmation(client, message, true)
    } 
    // Process cancellation responses
    else if (messageText.includes('não') || messageText.includes('nao') || messageText.includes('cancelo') || messageText.includes('cancelar')) {
      await handleAppointmentConfirmation(client, message, false)
    }
    // Process help requests
    else if (messageText.includes('ajuda') || messageText.includes('help') || messageText.includes('suporte')) {
      await handleHelpRequest(client, message)
    }
    // Default response for unrecognized messages
    else {
      await handleDefaultResponse(client, message)
    }

    // Log da mensagem processada pelo sistema legado
    await logWhatsAppMessage(client.id, message, 'RECEIVED', {
      processingMethod: 'legacy'
    })

  } catch (error) {
    console.error('Error processing text message (legacy):', error)
  }
}

async function processInteractiveMessage(client: any, message: any) {
  try {
    const buttonId = message.interactive.button_reply?.id || message.interactive.list_reply?.id

    switch (buttonId) {
      case 'confirm_yes':
      case 'confirm_presence':
        await handleAppointmentConfirmation(client, message, true)
        break
      case 'confirm_no':
      case 'cancel_appointment':
        await handleAppointmentConfirmation(client, message, false)
        break
      default:
        console.log('Unhandled button interaction:', buttonId)
    }

  } catch (error) {
    console.error('Error processing interactive message:', error)
  }
}

async function handleAppointmentConfirmation(client: any, message: any, isConfirmed: boolean) {
  try {
    const whatsapp = WhatsAppService.getInstance()
    const nextAppointment = client.appointments[0]

    if (!nextAppointment) {
      await whatsapp.sendTextMessage(
        message.from,
        `Olá ${client.name}! Não encontramos nenhum agendamento próximo para você. 🤔\n\nSe precisar agendar algo, entre em contato conosco! 😊`
      )
      return
    }

    if (isConfirmed) {
      // Update appointment as confirmed
      await prisma.appointment.update({
        where: { id: nextAppointment.id },
        data: { 
          status: 'CONFIRMED',
          metadata: {
            ...nextAppointment.metadata as any,
            confirmedViaWhatsApp: true,
            confirmedAt: new Date().toISOString()
          }
        }
      })

      await whatsapp.sendTextMessage(
        message.from,
        `✅ Perfeito, ${client.name}!\n\nSeu agendamento está confirmado:\n📅 ${nextAppointment.scheduledFor.toLocaleDateString('pt-BR')}\n⏰ ${nextAppointment.scheduledFor.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\nObrigado pela confirmação! Nos vemos em breve! 💅✨`
      )

      // Create notification for professional
      await prisma.notification.create({
        data: {
          userId: nextAppointment.professional.userId,
          title: 'Agendamento Confirmado via WhatsApp',
          message: `${client.name} confirmou presença no agendamento de ${nextAppointment.serviceName}`,
          type: 'APPOINTMENT_CONFIRMATION',
          metadata: {
            appointmentId: nextAppointment.id,
            clientId: client.id,
            confirmedViaWhatsApp: true
          }
        }
      })

    } else {
      // Cancel the appointment
      await prisma.appointment.update({
        where: { id: nextAppointment.id },
        data: { 
          status: 'CANCELLED',
          metadata: {
            ...nextAppointment.metadata as any,
            cancelledViaWhatsApp: true,
            cancelledAt: new Date().toISOString()
          }
        }
      })

      await whatsapp.sendTextMessage(
        message.from,
        `😔 Que pena, ${client.name}!\n\nSeu agendamento foi cancelado:\n📅 ${nextAppointment.scheduledFor.toLocaleDateString('pt-BR')}\n⏰ ${nextAppointment.scheduledFor.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\nEsperamos você em uma próxima oportunidade! Para reagendar, entre em contato conosco. 😊💅`
      )

      // Create notification for professional
      await prisma.notification.create({
        data: {
          userId: nextAppointment.professional.userId,
          title: 'Agendamento Cancelado via WhatsApp',
          message: `${client.name} cancelou o agendamento de ${nextAppointment.serviceName}`,
          type: 'APPOINTMENT_CANCELLATION',
          metadata: {
            appointmentId: nextAppointment.id,
            clientId: client.id,
            cancelledViaWhatsApp: true
          }
        }
      })
    }

  } catch (error) {
    console.error('Error handling appointment confirmation:', error)
  }
}

async function handleHelpRequest(client: any, message: any) {
  try {
    const whatsapp = WhatsAppService.getInstance()

    await whatsapp.sendTextMessage(
      message.from,
      `👋 Olá ${client.name}!\n\nEstou aqui para ajudar! Você pode:\n\n✅ Confirmar agendamentos\n❌ Cancelar agendamentos\n📅 Consultar horários\n💬 Falar com nossa equipe\n\nO que precisa? 😊`
    )

  } catch (error) {
    console.error('Error handling help request:', error)
  }
}

async function handleDefaultResponse(client: any, message: any) {
  try {
    const whatsapp = WhatsAppService.getInstance()

    await whatsapp.sendTextMessage(
      message.from,
      `Olá ${client.name}! 👋\n\nRecebemos sua mensagem. Nossa equipe irá responder em breve!\n\nPara confirmações rápidas de agendamento, você pode responder:\n• SIM para confirmar\n• NÃO para cancelar\n\nObrigado! 😊💅`
    )

  } catch (error) {
    console.error('Error handling default response:', error)
  }
}

async function processMessageStatus(status: any) {
  try {
    console.log('Processing message status:', status)

    // Update message status in database if we're tracking sent messages
    // This is useful for delivery confirmation and read receipts

  } catch (error) {
    console.error('Error processing message status:', error)
  }
}

async function processContact(contact: any) {
  try {
    console.log('Processing new contact:', contact)

    // When a new contact messages us, we can optionally
    // update their profile name in our database

  } catch (error) {
    console.error('Error processing contact:', error)
  }
}

async function logWhatsAppMessage(
  clientId: string, 
  message: any, 
  direction: 'SENT' | 'RECEIVED',
  metadata?: any
) {
  try {
    // Log da mensagem para auditoria e histórico de conversas
    // Útil para atendimento ao cliente e analytics

    const logData = {
      clientId,
      direction,
      messageId: message.id,
      type: message.type,
      timestamp: message.timestamp,
      content: message.text?.body || message.interactive || null,
      metadata: {
        ...metadata,
        phoneNumber: message.from || message.to,
        messageType: message.type
      }
    }

    console.log(`WhatsApp message logged:`, logData)

    // TODO: Salvar no banco de dados se necessário
    // await prisma.whatsAppMessage.create({ data: logData })

  } catch (error) {
    console.error('Error logging WhatsApp message:', error)
  }
}