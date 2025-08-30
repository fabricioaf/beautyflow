import { Metadata } from 'next'
import RemindersManagement from '@/components/reminders/reminders-management'

export const metadata: Metadata = {
  title: 'Lembretes Automáticos | BeautyFlow',
  description: 'Configure e monitore lembretes automáticos via WhatsApp para seus agendamentos'
}

export default function RemindersPage() {
  return (
    <div className="container mx-auto py-6">
      <RemindersManagement />
    </div>
  )
}