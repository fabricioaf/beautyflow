'use client'

import { CalendarView } from '@/components/calendar/calendar-view'
import { AppointmentModal } from '@/components/calendar/appointment-modal'
import { useState } from 'react'

interface Appointment {
  id: string
  clientName: string
  service: string
  time: string
  duration: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  price: number
}

export function CalendarInterface() {
  const [showModal, setShowModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | undefined>()

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowModal(true)
  }

  const handleNewAppointment = (date: Date, time?: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    setSelectedAppointment(undefined)
    setShowModal(true)
  }

  const handleSaveAppointment = (appointment: Appointment) => {
    console.log('Salvando agendamento:', appointment)
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <CalendarView
        onAppointmentClick={handleAppointmentClick}
        onDateClick={setSelectedDate}
        onNewAppointment={handleNewAppointment}
      />
      
      <AppointmentModal
        open={showModal}
        onOpenChange={setShowModal}
        appointment={selectedAppointment}
        initialDate={selectedDate}
        initialTime={selectedTime}
        onSave={handleSaveAppointment}
      />
    </div>
  )
}