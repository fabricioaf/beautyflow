import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '@/app/api/appointments/route'
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/appointments/[id]/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { AppointmentStatus, PaymentStatus } from '@prisma/client'

// Mock das dependências
jest.mock('@/lib/prisma', () => ({
  prisma: {
    professional: {
      findUnique: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/reminder-scheduler', () => ({
  reminderScheduler: {
    scheduleReminders: jest.fn(),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('API de Agendamentos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/appointments', () => {
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

    const mockAppointments = [
      {
        id: 'apt1',
        professionalId: 'prof1',
        clientId: 'client1',
        serviceName: 'Corte',
        servicePrice: 50.0,
        serviceDuration: 60,
        scheduledFor: new Date('2024-01-20T10:00:00Z'),
        status: AppointmentStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        client: {
          id: 'client1',
          name: 'João Silva',
          phone: '11999999999',
          email: 'joao@example.com',
          loyaltyPoints: 10
        },
        service: {
          id: 'service1',
          name: 'Corte',
          price: 50.0,
          duration: 60,
          category: 'Cabelo'
        }
      }
    ]

    it('deve listar agendamentos com sucesso', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments as any)
      mockPrisma.appointment.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/appointments')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].serviceName).toBe('Corte')
    })

    it('deve retornar erro 401 se não autenticado', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/appointments')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('deve retornar erro 404 se profissional não encontrado', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/appointments')
      const response = await GET(request)

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/appointments', () => {
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

    const mockService = {
      id: 'service1',
      name: 'Corte',
      price: 50.0,
      duration: 60,
      professionalId: 'prof1'
    }

    const mockClient = {
      id: 'client1',
      name: 'João Silva',
      professionalId: 'prof1'
    }

    const validAppointmentData = {
      clientId: 'client1',
      serviceId: 'service1',
      scheduledFor: '2024-01-25T10:00:00Z',
      notes: 'Teste'
    }

    it('deve criar agendamento com sucesso', async () => {
      const mockCreatedAppointment = {
        id: 'apt1',
        ...validAppointmentData,
        professionalId: 'prof1',
        serviceName: 'Corte',
        servicePrice: 50.0,
        serviceDuration: 60,
        status: AppointmentStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        client: mockClient,
        service: mockService
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.service.findFirst.mockResolvedValue(mockService as any)
      mockPrisma.client.findFirst.mockResolvedValue(mockClient as any)
      mockPrisma.appointment.findFirst.mockResolvedValue(null) // Sem conflitos
      mockPrisma.appointment.create.mockResolvedValue(mockCreatedAppointment as any)

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.serviceName).toBe('Corte')
    })

    it('deve retornar erro 400 para dados inválidos', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      
      const invalidData = {
        clientId: '', // Inválido
        serviceId: 'service1',
        scheduledFor: '2024-01-25T10:00:00Z'
      }

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('deve retornar erro 409 para conflito de horário', async () => {
      const conflictingAppointment = {
        id: 'apt_existing',
        scheduledFor: new Date('2024-01-25T10:30:00Z'),
        client: { name: 'Maria Santos' },
        service: { name: 'Escova', duration: 90 }
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.service.findFirst.mockResolvedValue(mockService as any)
      mockPrisma.client.findFirst.mockResolvedValue(mockClient as any)
      mockPrisma.appointment.findFirst.mockResolvedValue(conflictingAppointment as any)

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Conflito de horário')
    })
  })

  describe('GET /api/appointments/[id]', () => {
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

    const mockAppointment = {
      id: 'apt1',
      professionalId: 'prof1',
      serviceName: 'Corte',
      client: { name: 'João Silva' },
      service: { name: 'Corte' }
    }

    it('deve buscar agendamento por ID com sucesso', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment as any)

      const request = new NextRequest('http://localhost:3000/api/appointments/apt1')
      const response = await GET_BY_ID(request, { params: { id: 'apt1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('apt1')
    })

    it('deve retornar erro 404 se agendamento não encontrado', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.appointment.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/appointments/apt999')
      const response = await GET_BY_ID(request, { params: { id: 'apt999' } })

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/appointments/[id]', () => {
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

    const mockAppointment = {
      id: 'apt1',
      professionalId: 'prof1',
      status: AppointmentStatus.SCHEDULED
    }

    const mockUpdatedAppointment = {
      ...mockAppointment,
      status: AppointmentStatus.CONFIRMED,
      client: { name: 'João Silva' },
      service: { name: 'Corte' }
    }

    it('deve atualizar status do agendamento com sucesso', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment as any)
      mockPrisma.appointment.update.mockResolvedValue(mockUpdatedAppointment as any)

      const updateData = {
        status: 'CONFIRMED',
        notes: 'Confirmado pelo cliente'
      }

      const request = new NextRequest('http://localhost:3000/api/appointments/apt1', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })
      const response = await PATCH(request, { params: { id: 'apt1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe(AppointmentStatus.CONFIRMED)
    })

    it('deve retornar erro 400 para dados inválidos', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        status: 'INVALID_STATUS'
      }

      const request = new NextRequest('http://localhost:3000/api/appointments/apt1', {
        method: 'PATCH',
        body: JSON.stringify(invalidData)
      })
      const response = await PATCH(request, { params: { id: 'apt1' } })

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/appointments/[id]', () => {
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

    const mockAppointment = {
      id: 'apt1',
      professionalId: 'prof1',
      status: AppointmentStatus.SCHEDULED
    }

    const mockCancelledAppointment = {
      ...mockAppointment,
      status: AppointmentStatus.CANCELLED,
      client: { name: 'João Silva' },
      service: { name: 'Corte' }
    }

    it('deve cancelar agendamento com sucesso', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment as any)
      mockPrisma.appointment.update.mockResolvedValue(mockCancelledAppointment as any)

      const request = new NextRequest('http://localhost:3000/api/appointments/apt1')
      const response = await DELETE(request, { params: { id: 'apt1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe(AppointmentStatus.CANCELLED)
    })

    it('deve retornar erro 404 se agendamento não encontrado', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      mockPrisma.appointment.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/appointments/apt999')
      const response = await DELETE(request, { params: { id: 'apt999' } })

      expect(response.status).toBe(404)
    })
  })
})