import { NoShowPredictor } from '../no-show-prediction'
import type { AppointmentData, ClientHistoryData } from '../no-show-prediction'

describe('NoShowPredictor', () => {
  let predictor: NoShowPredictor

  beforeEach(() => {
    predictor = new NoShowPredictor()
  })

  const mockAppointment: AppointmentData = {
    id: 'test-appointment-1',
    clientId: 'test-client-1',
    scheduledFor: new Date('2024-12-20T14:30:00'),
    serviceName: 'Corte + Escova',
    serviceValue: 80,
    serviceDuration: 60,
    paymentStatus: 'PENDING',
    remindersSent: 1,
    createdAt: new Date('2024-12-18T10:00:00'),
  }

  const mockClientHistory: ClientHistoryData = {
    clientId: 'test-client-1',
    totalAppointments: 10,
    completedCount: 8,
    noShowCount: 1,
    cancelCount: 1,
    lastAppointmentDate: new Date('2024-11-15T14:30:00'),
    averageServiceValue: 75,
    loyaltyPoints: 150,
  }

  describe('predictNoShow', () => {
    it('should return low risk for reliable client', async () => {
      const reliableClient: ClientHistoryData = {
        ...mockClientHistory,
        noShowCount: 0,
        completedCount: 10,
        loyaltyPoints: 500,
      }

      const prediction = await predictor.predictNoShow(
        mockAppointment,
        reliableClient
      )

      expect(prediction.riskLevel).toBe('LOW')
      expect(prediction.riskScore).toBeLessThan(30)
      expect(prediction.confidence).toBeGreaterThan(0.5)
    })

    it('should return high risk for unreliable client', async () => {
      const unreliableClient: ClientHistoryData = {
        ...mockClientHistory,
        noShowCount: 5,
        completedCount: 3,
        cancelCount: 2,
        loyaltyPoints: 0,
      }

      const prediction = await predictor.predictNoShow(
        mockAppointment,
        unreliableClient
      )

      expect(prediction.riskLevel).toBe('HIGH')
      expect(prediction.riskScore).toBeGreaterThan(60)
    })

    it('should increase risk for last-minute booking', async () => {
      const lastMinuteAppointment: AppointmentData = {
        ...mockAppointment,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        createdAt: new Date(), // Just created
      }

      const prediction = await predictor.predictNoShow(
        lastMinuteAppointment,
        mockClientHistory
      )

      expect(prediction.riskScore).toBeGreaterThan(40)
      expect(prediction.factors.primary).toContain(expect.stringMatching(/última hora/))
    })

    it('should decrease risk for pre-paid appointments', async () => {
      const paidAppointment: AppointmentData = {
        ...mockAppointment,
        paymentStatus: 'COMPLETED',
      }

      const prediction = await predictor.predictNoShow(
        paidAppointment,
        mockClientHistory
      )

      const unpaidPrediction = await predictor.predictNoShow(
        mockAppointment,
        mockClientHistory
      )

      expect(prediction.riskScore).toBeLessThan(unpaidPrediction.riskScore)
    })

    it('should provide relevant recommendations', async () => {
      const highRiskPrediction = await predictor.predictNoShow(
        mockAppointment,
        {
          ...mockClientHistory,
          noShowCount: 4,
          completedCount: 6,
        }
      )

      expect(highRiskPrediction.recommendations).toContain(
        expect.stringMatching(/WhatsApp|telefone|pagamento/)
      )
    })
  })

  describe('risk scoring accuracy', () => {
    it('should have consistent scoring across similar scenarios', async () => {
      const scenarios = Array.from({ length: 5 }, (_, i) => ({
        ...mockAppointment,
        id: `test-${i}`,
      }))

      const predictions = await Promise.all(
        scenarios.map(scenario =>
          predictor.predictNoShow(scenario, mockClientHistory)
        )
      )

      const scores = predictions.map(p => p.riskScore)
      const maxDiff = Math.max(...scores) - Math.min(...scores)
      expect(maxDiff).toBeLessThan(5) // Should be very consistent for identical scenarios
    })
  })
})