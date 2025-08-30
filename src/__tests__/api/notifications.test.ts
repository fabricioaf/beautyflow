import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '@/app/api/notifications/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NotificationType } from '@prisma/client'

// Mock das dependências
jest.mock('@/lib/prisma', () => ({
  prisma: {
    professional: {
      findUnique: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn(),
  scheduleAppointmentNotifications: jest.fn(),
  processNotificationQueue: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('API de Notificações', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/notifications', () => {
    const mockSession = {
      user: {
        id: 'user1',
        email: 'test@example.com',
        role: 'PROFESSIONAL'
      }
    }

    const mockProfessional = {
      id: 'prof1',
      userId: 'user1',
      businessName: 'Test Salon'
    }

    const mockNotifications = [
      {
        id: 'notif1',
        professionalId: 'prof1',
        appointmentId: 'apt1',
        type: NotificationType.APPOINTMENT_CONFIRMATION,
        title: 'Agendamento Confirmado',
        message: 'Seu agendamento foi confirmado',
        channel: 'whatsapp',
        recipient: '+5511999999999',
        status: 'pending',
        priority: 'NORMAL',
        read: false,
        sentAt: null,
        readAt: null,
        metadata: {},
        createdAt: new Date('2024-01-20T10:00:00Z'),
        appointment: {
          id: 'apt1',
          serviceName: 'Corte',
          scheduledFor: new Date('2024-01-20T14:00:00Z'),
          client: {
            name: 'João Silva',
            phone: '+5511999999999'
          }
        }
      }
    ]

    it('deve listar notificações com sucesso', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications as any)
      mockPrisma.notification.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].type).toBe(NotificationType.APPOINTMENT_CONFIRMATION)
    })

    it('deve filtrar por tipo de notificação', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications as any)
      mockPrisma.notification.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/notifications?type=APPOINTMENT_CONFIRMATION')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'APPOINTMENT_CONFIRMATION'
          })
        })
      )
    })

    it('deve filtrar por status', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.findMany.mockResolvedValue([])
      mockPrisma.notification.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/notifications?status=sent')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'sent'
          })
        })
      )
    })

    it('deve retornar erro 401 se não autenticado', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('deve retornar erro 404 se profissional não encontrado', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications')
      const response = await GET(request)

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/notifications', () => {
    const mockSession = {
      user: {
        id: 'user1',
        email: 'test@example.com',
        role: 'PROFESSIONAL'
      }
    }

    const mockProfessional = {
      id: 'prof1',
      userId: 'user1',
      businessName: 'Test Salon'
    }

    const validNotificationData = {
      type: 'APPOINTMENT_CONFIRMATION',
      title: 'Agendamento Confirmado',
      message: 'Seu agendamento foi confirmado para amanhã às 14:00',
      recipient: '+5511999999999',
      channel: 'whatsapp',
      appointmentId: 'apt1',
      priority: 'NORMAL'
    }

    it('deve criar notificação com sucesso', async () => {
      const mockCreatedNotification = {
        id: 'notif1',
        ...validNotificationData,
        professionalId: 'prof1',
        userId: 'user1',
        status: 'pending',
        read: false,
        metadata: {},
        createdAt: new Date(),
        appointment: {
          id: 'apt1',
          serviceName: 'Corte',
          scheduledFor: new Date('2024-01-21T14:00:00Z'),
          client: {
            name: 'João Silva',
            phone: '+5511999999999'
          }
        }
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.create.mockResolvedValue(mockCreatedNotification as any)

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(validNotificationData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.type).toBe('APPOINTMENT_CONFIRMATION')
      expect(data.message).toBe('Notificação criada com sucesso')
    })

    it('deve retornar erro 400 para dados inválidos', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      
      const invalidData = {
        type: 'APPOINTMENT_CONFIRMATION',
        // Campos obrigatórios ausentes: title, message, recipient
        channel: 'whatsapp'
      }

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('obrigatórios')
    })

    it('deve usar profissional padrão se não fornecido', async () => {
      const dataWithoutProfessional = {
        ...validNotificationData
        // professionalId não fornecido
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif1',
        professionalId: 'prof1',
        ...dataWithoutProfessional
      } as any)

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(dataWithoutProfessional)
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            professionalId: 'prof1'
          })
        })
      )
    })

    it('deve retornar erro 401 se não autenticado', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(validNotificationData)
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/notifications', () => {
    const mockSession = {
      user: {
        id: 'user1',
        email: 'test@example.com',
        role: 'PROFESSIONAL'
      }
    }

    const mockProfessional = {
      id: 'prof1',
      userId: 'user1'
    }

    const mockExistingNotification = {
      id: 'notif1',
      professionalId: 'prof1',
      userId: 'user1',
      type: NotificationType.APPOINTMENT_CONFIRMATION,
      status: 'pending',
      read: false,
      readAt: null,
      metadata: {}
    }

    const mockUpdatedNotification = {
      ...mockExistingNotification,
      status: 'sent',
      sentAt: new Date(),
      appointment: {
        id: 'apt1',
        serviceName: 'Corte',
        scheduledFor: new Date(),
        client: {
          name: 'João Silva',
          phone: '+5511999999999'
        }
      }
    }

    it('deve atualizar status da notificação com sucesso', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.findFirst.mockResolvedValue(mockExistingNotification as any)
      mockPrisma.notification.update.mockResolvedValue(mockUpdatedNotification as any)

      const updateData = {
        id: 'notif1',
        status: 'sent',
        sentAt: '2024-01-20T10:30:00Z'
      }

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('sent')
      expect(data.message).toBe('Notificação atualizada com sucesso')
    })

    it('deve marcar como lida automaticamente quando read=true', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.findFirst.mockResolvedValue(mockExistingNotification as any)
      mockPrisma.notification.update.mockResolvedValue({
        ...mockUpdatedNotification,
        read: true,
        readAt: new Date()
      } as any)

      const updateData = {
        id: 'notif1',
        read: true
      }

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            read: true,
            readAt: expect.any(Date)
          })
        })
      )
    })

    it('deve retornar erro 400 se ID não fornecido', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const updateData = {
        // id ausente
        status: 'sent'
      }

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('ID')
    })

    it('deve retornar erro 404 se notificação não encontrada', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.findFirst.mockResolvedValue(null)

      const updateData = {
        id: 'notif999',
        status: 'sent'
      }

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const response = await PUT(request)

      expect(response.status).toBe(404)
    })

    it('deve atualizar metadata preservando dados existentes', async () => {
      const notificationWithMetadata = {
        ...mockExistingNotification,
        metadata: { existingKey: 'existingValue' }
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.notification.findFirst.mockResolvedValue(notificationWithMetadata as any)
      mockPrisma.notification.update.mockResolvedValue(mockUpdatedNotification as any)

      const updateData = {
        id: 'notif1',
        metadata: { newKey: 'newValue' }
      }

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: {
              existingKey: 'existingValue',
              newKey: 'newValue'
            }
          })
        })
      )
    })
  })
})