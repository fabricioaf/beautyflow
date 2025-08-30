import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppointmentModal } from '../appointment-modal'

// Mock data
const mockServices = [
  { id: '1', name: 'Corte', duration: 30, price: 50, category: 'Cabelo' },
  { id: '2', name: 'Escova', duration: 45, price: 40, category: 'Cabelo' },
  { id: '3', name: 'Manicure', duration: 60, price: 35, category: 'Unhas' },
]

const mockClients = [
  {
    id: '1',
    name: 'Maria Silva',
    phone: '11999999999',
    email: 'maria@email.com',
    lastVisit: new Date('2024-11-15'),
  },
  {
    id: '2', 
    name: 'Ana Santos',
    phone: '11888888888',
    email: 'ana@email.com',
  },
]

// Mock the services and clients data
jest.mock('../../../lib/services', () => ({
  getServices: jest.fn(() => Promise.resolve(mockServices)),
}))

jest.mock('../../../lib/clients', () => ({
  searchClients: jest.fn((query: string) => 
    Promise.resolve(
      mockClients.filter(client => 
        client.name.toLowerCase().includes(query.toLowerCase())
      )
    )
  ),
}))

describe('AppointmentModal', () => {
  const mockProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSave: jest.fn(),
    initialDate: new Date('2024-12-20'),
    initialTime: '14:30',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render appointment modal when open', () => {
    render(<AppointmentModal {...mockProps} />)
    
    expect(screen.getByText('Novo Agendamento')).toBeInTheDocument()
    expect(screen.getByText('Cliente')).toBeInTheDocument()
    expect(screen.getByText('Serviço')).toBeInTheDocument()
    expect(screen.getByText('Data e Horário')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<AppointmentModal {...mockProps} open={false} />)
    
    expect(screen.queryByText('Novo Agendamento')).not.toBeInTheDocument()
  })

  it('should search and select client', async () => {
    render(<AppointmentModal {...mockProps} />)
    
    const clientInput = screen.getByPlaceholderText('Buscar cliente...')
    
    // Search for client
    fireEvent.change(clientInput, { target: { value: 'Maria' } })
    
    await waitFor(() => {
      expect(screen.getByText('Maria Silva')).toBeInTheDocument()
    })
    
    // Select client
    fireEvent.click(screen.getByText('Maria Silva'))
    
    await waitFor(() => {
      expect(clientInput).toHaveValue('Maria Silva')
    })
  })

  it('should select service and update total price', async () => {
    render(<AppointmentModal {...mockProps} />)
    
    // Wait for services to load and select one
    await waitFor(() => {
      const serviceSelect = screen.getByText('Selecione um serviço')
      fireEvent.click(serviceSelect)
    })
    
    await waitFor(() => {
      const corteOption = screen.getByText('Corte - 30min - R$ 50,00')
      fireEvent.click(corteOption)
    })
    
    // Check if total is updated
    await waitFor(() => {
      expect(screen.getByText('R$ 50,00')).toBeInTheDocument()
    })
  })

  it('should validate required fields before saving', async () => {
    render(<AppointmentModal {...mockProps} />)
    
    const saveButton = screen.getByText('Salvar Agendamento')
    fireEvent.click(saveButton)
    
    // Should not call onSave without required fields
    expect(mockProps.onSave).not.toHaveBeenCalled()
  })

  it('should save appointment with all required data', async () => {
    render(<AppointmentModal {...mockProps} />)
    
    // Fill client
    const clientInput = screen.getByPlaceholderText('Buscar cliente...')
    fireEvent.change(clientInput, { target: { value: 'Maria' } })
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Maria Silva'))
    })
    
    // Select service
    await waitFor(() => {
      const serviceSelect = screen.getByText('Selecione um serviço')
      fireEvent.click(serviceSelect)
    })
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Corte - 30min - R$ 50,00'))
    })
    
    // Save appointment
    const saveButton = screen.getByText('Salvar Agendamento')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: '1',
          clientName: 'Maria Silva',
          serviceId: '1',
          serviceName: 'Corte',
          price: 50,
          duration: 30,
        })
      )
    })
  })

  it('should populate form when editing existing appointment', () => {
    const existingAppointment = {
      id: 'existing-1',
      clientId: '1',
      clientName: 'Maria Silva',
      serviceId: '1',
      serviceName: 'Corte',
      date: new Date('2024-12-20'),
      time: '14:30',
      duration: 30,
      price: 50,
      status: 'confirmed' as const,
    }
    
    render(
      <AppointmentModal 
        {...mockProps} 
        appointment={existingAppointment}
      />
    )
    
    expect(screen.getByDisplayValue('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('Editar Agendamento')).toBeInTheDocument()
  })

  it('should handle modal close', () => {
    render(<AppointmentModal {...mockProps} />)
    
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    expect(mockProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should show time slots for selected date', async () => {
    render(<AppointmentModal {...mockProps} />)
    
    // Should show initial time
    expect(screen.getByDisplayValue('14:30')).toBeInTheDocument()
    
    // Change time
    const timeInput = screen.getByDisplayValue('14:30')
    fireEvent.change(timeInput, { target: { value: '15:00' } })
    
    expect(timeInput).toHaveValue('15:00')
  })
})