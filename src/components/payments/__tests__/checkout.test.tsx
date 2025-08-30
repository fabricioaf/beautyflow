import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Checkout } from '../checkout'

// Mock the payment components
jest.mock('../pix-payment', () => ({
  PixPayment: ({ onPaymentSuccess }: any) => (
    <div data-testid="pix-payment">
      <button onClick={() => onPaymentSuccess({ method: 'pix', id: 'test-payment' })}>
        Simular Pagamento PIX
      </button>
    </div>
  ),
}))

jest.mock('../card-payment', () => ({
  CardPayment: ({ onPaymentSuccess }: any) => (
    <div data-testid="card-payment">
      <button onClick={() => onPaymentSuccess({ method: 'card', id: 'test-payment' })}>
        Simular Pagamento Cartão
      </button>
    </div>
  ),
}))

jest.mock('../payment-method-selector', () => ({
  PaymentMethodSelector: ({ onMethodSelect }: any) => (
    <div data-testid="payment-method-selector">
      <button onClick={() => onMethodSelect({ type: 'pix', name: 'PIX' })}>
        Selecionar PIX
      </button>
      <button onClick={() => onMethodSelect({ type: 'credit_card', name: 'Cartão de Crédito' })}>
        Selecionar Cartão
      </button>
    </div>
  ),
}))

describe('Checkout', () => {
  const mockProps = {
    amount: 150.00,
    appointmentId: 'test-appointment',
    appointmentData: {
      serviceName: 'Corte + Escova',
      scheduledFor: new Date('2024-12-20T14:30:00'),
      clientName: 'Maria Silva',
    },
    onPaymentSuccess: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render checkout with method selection step', () => {
    render(<Checkout {...mockProps} />)
    
    expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument()
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument()
    expect(screen.getByText('Corte + Escova')).toBeInTheDocument()
  })

  it('should show appointment details when provided', () => {
    render(<Checkout {...mockProps} />)
    
    expect(screen.getByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('Corte + Escova')).toBeInTheDocument()
    expect(screen.getByText(/20\/12\/2024/)).toBeInTheDocument()
  })

  it('should navigate to payment step when method is selected', async () => {
    render(<Checkout {...mockProps} />)
    
    const pixButton = screen.getByText('Selecionar PIX')
    fireEvent.click(pixButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('pix-payment')).toBeInTheDocument()
      expect(screen.getByText('Voltar')).toBeInTheDocument()
    })
  })

  it('should show card payment when card is selected', async () => {
    render(<Checkout {...mockProps} />)
    
    const cardButton = screen.getByText('Selecionar Cartão')
    fireEvent.click(cardButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('card-payment')).toBeInTheDocument()
    })
  })

  it('should allow going back to method selection', async () => {
    render(<Checkout {...mockProps} />)
    
    // Select method
    fireEvent.click(screen.getByText('Selecionar PIX'))
    
    await waitFor(() => {
      expect(screen.getByTestId('pix-payment')).toBeInTheDocument()
    })
    
    // Go back
    fireEvent.click(screen.getByText('Voltar'))
    
    await waitFor(() => {
      expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument()
    })
  })

  it('should handle successful payment', async () => {
    render(<Checkout {...mockProps} />)
    
    // Select PIX
    fireEvent.click(screen.getByText('Selecionar PIX'))
    
    await waitFor(() => {
      expect(screen.getByTestId('pix-payment')).toBeInTheDocument()
    })
    
    // Complete payment
    fireEvent.click(screen.getByText('Simular Pagamento PIX'))
    
    await waitFor(() => {
      expect(screen.getByText('Pagamento Realizado!')).toBeInTheDocument()
      expect(mockProps.onPaymentSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'pix',
          id: 'test-payment'
        })
      )
    })
  })

  it('should show success screen after payment', async () => {
    render(<Checkout {...mockProps} />)
    
    // Select and complete payment
    fireEvent.click(screen.getByText('Selecionar PIX'))
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Simular Pagamento PIX'))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Pagamento Realizado!')).toBeInTheDocument()
      expect(screen.getByText('PIX processado')).toBeInTheDocument()
    })
  })

  it('should handle cancel action', () => {
    render(<Checkout {...mockProps} />)
    
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    expect(mockProps.onCancel).toHaveBeenCalled()
  })

  it('should display step indicator', () => {
    render(<Checkout {...mockProps} />)
    
    // Should show step 1 active
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Método')).toBeInTheDocument()
    expect(screen.getByText('Pagamento')).toBeInTheDocument()
    expect(screen.getByText('Confirmação')).toBeInTheDocument()
  })

  it('should format currency correctly', () => {
    const propsWithDifferentAmount = {
      ...mockProps,
      amount: 85.50,
    }
    
    render(<Checkout {...propsWithDifferentAmount} />)
    
    expect(screen.getByText('R$ 85,50')).toBeInTheDocument()
  })

  it('should work without appointment data', () => {
    const propsWithoutAppointment = {
      amount: 100.00,
      onPaymentSuccess: jest.fn(),
    }
    
    render(<Checkout {...propsWithoutAppointment} />)
    
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument()
    expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument()
  })
})