import { 
  validateAppointmentConflicts,
  findAvailableSlots,
  calculateDuration 
} from '../appointment-validation'

describe('Appointment Validation', () => {
  const mockWorkingHours = [
    {
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    },
    {
      dayOfWeek: 2, // Tuesday
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    },
  ]

  const mockExistingAppointments = [
    {
      id: 'existing-1',
      scheduledFor: new Date('2024-12-23T10:00:00'), // Monday 10:00
      serviceDuration: 60,
      professionalId: 'prof-1',
    },
    {
      id: 'existing-2', 
      scheduledFor: new Date('2024-12-23T14:30:00'), // Monday 14:30
      serviceDuration: 90,
      professionalId: 'prof-1',
    },
  ]

  describe('validateAppointmentConflicts', () => {
    it('should detect time conflict with existing appointment', () => {
      const newAppointment = {
        scheduledFor: new Date('2024-12-23T10:30:00'), // Conflicts with existing-1
        serviceDuration: 60,
        professionalId: 'prof-1',
      }

      const result = validateAppointmentConflicts(
        newAppointment,
        mockExistingAppointments,
        mockWorkingHours,
        []
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].type).toBe('TIME_OVERLAP')
    })

    it('should allow appointment without conflicts', () => {
      const newAppointment = {
        scheduledFor: new Date('2024-12-23T12:00:00'), // No conflicts
        serviceDuration: 60,
        professionalId: 'prof-1',
      }

      const result = validateAppointmentConflicts(
        newAppointment,
        mockExistingAppointments,
        mockWorkingHours,
        []
      )

      expect(result.isValid).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should detect outside working hours', () => {
      const newAppointment = {
        scheduledFor: new Date('2024-12-23T19:00:00'), // After 18:00
        serviceDuration: 60,
        professionalId: 'prof-1',
      }

      const result = validateAppointmentConflicts(
        newAppointment,
        mockExistingAppointments,
        mockWorkingHours,
        []
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.type === 'OUTSIDE_WORKING_HOURS')).toBe(true)
    })

    it('should detect weekend when not working', () => {
      const newAppointment = {
        scheduledFor: new Date('2024-12-22T14:00:00'), // Sunday
        serviceDuration: 60,
        professionalId: 'prof-1',
      }

      const result = validateAppointmentConflicts(
        newAppointment,
        mockExistingAppointments,
        mockWorkingHours,
        []
      )

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.type === 'OUTSIDE_WORKING_HOURS')).toBe(true)
    })
  })

  describe('findAvailableSlots', () => {
    it('should find available slots between appointments', () => {
      const date = new Date('2024-12-23') // Monday
      const duration = 60

      const slots = findAvailableSlots(
        date,
        duration,
        'prof-1',
        mockExistingAppointments,
        mockWorkingHours,
        [],
        5
      )

      expect(slots).toBeInstanceOf(Array)
      expect(slots.length).toBeGreaterThan(0)
      
      // Should have slots between 09:00-10:00, 11:00-14:30, 16:00-18:00
      const slotTimes = slots.map(s => s.split('T')[1].split(':').slice(0, 2).join(':'))
      expect(slotTimes).toContain('09:00')
      expect(slotTimes).toContain('11:00')
    })

    it('should respect service duration when finding slots', () => {
      const date = new Date('2024-12-23') // Monday
      const duration = 120 // 2 hours

      const slots = findAvailableSlots(
        date,
        duration,
        'prof-1',
        mockExistingAppointments,
        mockWorkingHours,
        [],
        5
      )

      // With 2-hour duration, should have fewer available slots
      expect(slots.length).toBeLessThan(5)
    })

    it('should return empty array for fully booked day', () => {
      const fullyBookedAppointments = Array.from({ length: 10 }, (_, i) => ({
        id: `busy-${i}`,
        scheduledFor: new Date(`2024-12-23T${9 + i}:00:00`),
        serviceDuration: 60,
        professionalId: 'prof-1',
      }))

      const date = new Date('2024-12-23')
      const duration = 60

      const slots = findAvailableSlots(
        date,
        duration,
        'prof-1',
        fullyBookedAppointments,
        mockWorkingHours,
        [],
        5
      )

      expect(slots).toHaveLength(0)
    })
  })

  describe('calculateDuration', () => {
    it('should calculate basic service duration', () => {
      const services = [
        { id: '1', name: 'Corte', duration: 30 },
        { id: '2', name: 'Escova', duration: 45 },
      ]

      const duration = calculateDuration(services, [])
      expect(duration).toBe(75) // 30 + 45
    })

    it('should add buffer time between services', () => {
      const services = [
        { id: '1', name: 'Corte', duration: 30 },
        { id: '2', name: 'Pintura', duration: 120 },
      ]

      const options = { bufferMinutes: 15 }
      const duration = calculateDuration(services, [], options)
      
      expect(duration).toBe(165) // 30 + 120 + 15 buffer
    })

    it('should handle single service without buffer', () => {
      const services = [
        { id: '1', name: 'Manicure', duration: 45 },
      ]

      const options = { bufferMinutes: 15 }
      const duration = calculateDuration(services, [], options)
      
      expect(duration).toBe(45) // No buffer for single service
    })
  })
})