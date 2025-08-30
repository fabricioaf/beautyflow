'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import PaymentsDashboard from '@/components/payments/payments-dashboard'

export default function PaymentsPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-beauty-purple-600"></div>
      </div>
    )
  }

  if (!session || !['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    redirect('/unauthorized')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PaymentsDashboard />
    </div>
  )
}