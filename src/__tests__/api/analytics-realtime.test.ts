import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/realtime/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { AppointmentStatus } from '@prisma/client'

// Mock das dependências
jest.mock('@/lib/prisma', () => ({
  prisma: {
    professional: {
      findUnique: jest.fn(),
    },
    appointment: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    client: {
      count: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('API de Analytics Realtime', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

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

  describe('GET /api/analytics/realtime', () => {
    it('deve retornar erro 401 se não autenticado', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/analytics/realtime')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('deve retornar erro 404 se profissional não encontrado', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/analytics/realtime')
      const response = await GET(request)

      expect(response.status).toBe(404)
    })

    describe('tipo: metrics', () => {
      it('deve retornar métricas em tempo real com sucesso', async () => {
        // Mocks para receita
        mockPrisma.appointment.aggregate
          .mockResolvedValueOnce({ _sum: { servicePrice: 1850.0 } }) // Hoje
          .mockResolvedValueOnce({ _sum: { servicePrice: 1720.0 } }) // Ontem

        // Mock para agendamentos por status
        mockPrisma.appointment.groupBy.mockResolvedValue([
          { status: 'SCHEDULED', _count: 12 },
          { status: 'COMPLETED', _count: 6 },
          { status: 'CANCELLED', _count: 0 }
        ] as any)

        // Mock para total de clientes
        mockPrisma.client.count.mockResolvedValueOnce(342) // Total
        mockPrisma.client.count.mockResolvedValueOnce(3)   // Novos hoje

        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

        const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=metrics')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveProperty('revenue')
        expect(data.data).toHaveProperty('appointments')
        expect(data.data).toHaveProperty('clients')
        expect(data.data).toHaveProperty('performance')

        // Verificar cálculos
        expect(data.data.revenue.today).toBe(1850.0)
        expect(data.data.revenue.yesterday).toBe(1720.0)
        expect(data.data.revenue.growth).toBeCloseTo(7.56, 1)
        expect(data.data.clients.total).toBe(342)
        expect(data.data.clients.newToday).toBe(3)
        expect(data.data.appointments.today).toBe(18) // 12 + 6 + 0
      })

      it('deve calcular crescimento zero quando receita de ontem for zero', async () => {
        mockPrisma.appointment.aggregate
          .mockResolvedValueOnce({ _sum: { servicePrice: 1850.0 } }) // Hoje
          .mockResolvedValueOnce({ _sum: { servicePrice: 0 } })      // Ontem

        mockPrisma.appointment.groupBy.mockResolvedValue([])
        mockPrisma.client.count.mockResolvedValueOnce(342)
        mockPrisma.client.count.mockResolvedValueOnce(3)

        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

        const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=metrics')
        const response = await GET(request)
        const data = await response.json()

        expect(data.data.revenue.growth).toBe(0)
      })
    })

    describe('tipo: historical', () => {
      it('deve retornar dados históricos com sucesso', async () => {
        // Mock para cada dia dos últimos 7 dias
        mockPrisma.appointment.aggregate.mockResolvedValue({ _sum: { servicePrice: 1500.0 } })
        mockPrisma.appointment.count.mockResolvedValue(15)
        mockPrisma.appointment.findMany.mockResolvedValue([
          { clientId: 'client1' },
          { clientId: 'client2' },
          { clientId: 'client1' } // Duplicado para testar distinct
        ] as any)

        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

        const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=historical&days=3')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveLength(3)
        
        // Verificar estrutura dos dados históricos
        data.data.forEach((day: any) => {
          expect(day).toHaveProperty('date')
          expect(day).toHaveProperty('revenue')
          expect(day).toHaveProperty('appointments')
          expect(day).toHaveProperty('clients')
          expect(day).toHaveProperty('satisfaction')
          expect(day.revenue).toBe(1500.0)
          expect(day.appointments).toBe(15)
          expect(day.clients).toBe(2) // Clientes únicos (distinct)
        })

        // Verificar que as chamadas foram feitas para cada dia
        expect(mockPrisma.appointment.aggregate).toHaveBeenCalledTimes(3)
        expect(mockPrisma.appointment.count).toHaveBeenCalledTimes(3)
        expect(mockPrisma.appointment.findMany).toHaveBeenCalledTimes(3)
      })

      it('deve usar valor padrão de 7 dias se não especificado', async () => {
        mockPrisma.appointment.aggregate.mockResolvedValue({ _sum: { servicePrice: 1500.0 } })
        mockPrisma.appointment.count.mockResolvedValue(15)
        mockPrisma.appointment.findMany.mockResolvedValue([])

        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

        const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=historical')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(7)
      })
    })

    describe('tipo: services', () => {
      it('deve retornar estatísticas de serviços com sucesso', async () => {
        const mockServicesStats = [
          { serviceName: 'Corte + Escova', _count: 45, _sum: { servicePrice: 2250.0 } },
          { serviceName: 'Manicure', _count: 38, _sum: { servicePrice: 1140.0 } },
          { serviceName: 'Coloração', _count: 28, _sum: { servicePrice: 2240.0 } }
        ]

        const mockPreviousStats = [
          { serviceName: 'Corte + Escova', _count: 40 },
          { serviceName: 'Manicure', _count: 35 },
          { serviceName: 'Coloração', _count: 30 }
        ]

        mockPrisma.appointment.groupBy
          .mockResolvedValueOnce(mockServicesStats as any)
          .mockResolvedValueOnce(mockPreviousStats as any)

        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

        const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=services&limit=5')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveLength(3)

        // Verificar cálculo de crescimento
        const corteEscova = data.data.find((s: any) => s.name === 'Corte + Escova')
        expect(corteEscova.growth).toBeCloseTo(12.5, 1) // (45-40)/40 * 100

        const manicure = data.data.find((s: any) => s.name === 'Manicure')
        expect(manicure.growth).toBeCloseTo(8.57, 1) // (38-35)/35 * 100

        // Verificar ordenação por contagem (descendente)
        expect(data.data[0].name).toBe('Corte + Escova')
        expect(data.data[0].count).toBe(45)
      })

      it('deve calcular crescimento de 100% para serviços novos', async () => {
        const mockServicesStats = [
          { serviceName: 'Novo Serviço', _count: 10, _sum: { servicePrice: 500.0 } }
        ]

        mockPrisma.appointment.groupBy
          .mockResolvedValueOnce(mockServicesStats as any)
          .mockResolvedValueOnce([]) // Sem dados anteriores

        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

        const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=services')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data[0].growth).toBe(100)
      })
    })

    describe('tipo: segmentation', () => {
      it('deve retornar segmentação de clientes com sucesso', async () => {
        // Mocks para contagem de clientes por segmento
        mockPrisma.client.count
          .mockResolvedValueOnce(45)  // VIP
          .mockResolvedValueOnce(128) // Fiéis
          .mockResolvedValueOnce(169) // Ocasionais
          .mockResolvedValueOnce(342) // Total

        // Mocks para receita por segmento
        mockPrisma.appointment.aggregate
          .mockResolvedValueOnce({ _sum: { servicePrice: 20250.0 } }) // VIP
          .mockResolvedValueOnce({ _sum: { servicePrice: 35840.0 } }) // Fiéis
          .mockResolvedValueOnce({ _sum: { servicePrice: 25350.0 } }) // Ocasionais

        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

        const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=segmentation')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveLength(3)

        const vipSegment = data.data.find((s: any) => s.segment === 'Clientes VIP')
        expect(vipSegment.count).toBe(45)
        expect(vipSegment.percentage).toBeCloseTo(13.16, 1) // 45/342 * 100
        expect(vipSegment.revenue).toBe(20250.0)
        expect(vipSegment.avgTicket).toBe(450.0) // 20250/45
        expect(vipSegment.color).toBe('#8B5CF6')

        const loyalSegment = data.data.find((s: any) => s.segment === 'Clientes Fiéis')
        expect(loyalSegment.count).toBe(128)
        expect(loyalSegment.avgTicket).toBeCloseTo(280.0, 1)
      })

      it('deve evitar divisão por zero quando não há clientes', async () => {
        mockPrisma.client.count.mockResolvedValue(0)
        mockPrisma.appointment.aggregate.mockResolvedValue({ _sum: { servicePrice: 0 } })

        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

        const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=segmentation')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        data.data.forEach((segment: any) => {
          expect(segment.percentage).toBe(0)
          expect(segment.avgTicket).toBe(0)
        })
      })
    })

    it('deve retornar erro 400 para tipo não suportado', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)

      const request = new NextRequest('http://localhost:3000/api/analytics/realtime?type=invalid_type')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('não suportado')
    })

    it('deve usar professionalId do parâmetro se fornecido', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockPrisma.professional.findUnique.mockResolvedValue(mockProfessional as any)
      
      // Mock simples para evitar erros
      mockPrisma.appointment.aggregate.mockResolvedValue({ _sum: { servicePrice: 0 } })
      mockPrisma.appointment.groupBy.mockResolvedValue([])
      mockPrisma.client.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/analytics/realtime?professionalId=prof2&type=metrics')
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Verificar se usou o professionalId fornecido, não o do professional logado
      expect(mockPrisma.appointment.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            professionalId: 'prof2'
          })
        })
      )
    })
  })
})