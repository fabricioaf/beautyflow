export default function BookingPage({ params }: { params: { professionalId: string } }) {
  return (
    <div>
      <h1>Booking Page - Professional {params.professionalId}</h1>
      <p>Implementação do portal de agendamento para clientes</p>
    </div>
  )
}