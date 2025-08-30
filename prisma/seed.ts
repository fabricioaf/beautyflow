import { PrismaClient, UserRole, AppointmentStatus, PaymentStatus, PaymentMethod } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Limpar dados existentes (cuidado em produção)
  if (process.env.NODE_ENV === 'development') {
    await prisma.appointmentReminder.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.dispute.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.appointment.deleteMany()
    await prisma.service.deleteMany()
    await prisma.client.deleteMany()
    await prisma.teamMember.deleteMany()
    await prisma.professional.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
  }

  // 1. Criar usuários
  const hashedPassword = await bcrypt.hash('123456', 12)

  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin BeautyFlow',
      email: 'admin@beautyflow.com',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
      isActive: true,
    },
  })

  const professionalUser = await prisma.user.create({
    data: {
      name: 'Ana Silva',
      email: 'ana@salaobella.com',
      password: hashedPassword,
      phone: '11987654321',
      role: UserRole.PROFESSIONAL,
      emailVerified: new Date(),
      isActive: true,
    },
  })

  const staffUser = await prisma.user.create({
    data: {
      name: 'Carlos Santos',
      email: 'carlos@salaobella.com',
      password: hashedPassword,
      phone: '11876543210',
      role: UserRole.STAFF,
      emailVerified: new Date(),
      isActive: true,
    },
  })

  // 2. Criar profissional
  const professional = await prisma.professional.create({
    data: {
      userId: professionalUser.id,
      businessName: 'Salão Bella Vita',
      phone: '11987654321',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      cnpj: '12.345.678/0001-90',
      verified: true,
      plan: 'PROFESSIONAL',
      workingHours: {
        monday: { start: '09:00', end: '18:00', isWorking: true },
        tuesday: { start: '09:00', end: '18:00', isWorking: true },
        wednesday: { start: '09:00', end: '18:00', isWorking: true },
        thursday: { start: '09:00', end: '18:00', isWorking: true },
        friday: { start: '09:00', end: '19:00', isWorking: true },
        saturday: { start: '08:00', end: '17:00', isWorking: true },
        sunday: { start: '09:00', end: '15:00', isWorking: false },
      },
      reminderSettings: {
        whatsappEnabled: true,
        emailEnabled: false,
        smsEnabled: false,
        reminder24h: true,
        reminder2h: true,
        confirmationRequired: true,
      },
    },
  })

  // 3. Criar membro da equipe
  const teamMember = await prisma.teamMember.create({
    data: {
      userId: staffUser.id,
      professionalId: professional.id,
      position: 'Cabeleireiro',
      permissions: {
        canViewSchedule: true,
        canEditSchedule: true,
        canViewClients: true,
        canEditClients: false,
        canViewFinancial: false,
      },
      salary: 2500.0,
      commission: 15.0,
      workingHours: {
        monday: { start: '10:00', end: '18:00', isWorking: true },
        tuesday: { start: '10:00', end: '18:00', isWorking: true },
        wednesday: { start: '10:00', end: '18:00', isWorking: true },
        thursday: { start: '10:00', end: '18:00', isWorking: true },
        friday: { start: '10:00', end: '18:00', isWorking: true },
        saturday: { start: '09:00', end: '16:00', isWorking: true },
        sunday: { start: '09:00', end: '14:00', isWorking: false },
      },
      isActive: true,
    },
  })

  // 4. Criar serviços
  const services = await Promise.all([
    prisma.service.create({
      data: {
        professionalId: professional.id,
        name: 'Corte Feminino',
        description: 'Corte de cabelo feminino com lavagem',
        price: 45.0,
        duration: 60,
        category: 'Cabelo',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        professionalId: professional.id,
        name: 'Escova Modeladora',
        description: 'Escova modeladora profissional',
        price: 35.0,
        duration: 45,
        category: 'Cabelo',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        professionalId: professional.id,
        name: 'Coloração',
        description: 'Coloração completa do cabelo',
        price: 120.0,
        duration: 150,
        category: 'Cabelo',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        professionalId: professional.id,
        name: 'Manicure',
        description: 'Cuidado completo das unhas das mãos',
        price: 25.0,
        duration: 45,
        category: 'Unhas',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        professionalId: professional.id,
        name: 'Pedicure',
        description: 'Cuidado completo das unhas dos pés',
        price: 30.0,
        duration: 60,
        category: 'Unhas',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        professionalId: professional.id,
        name: 'Limpeza de Pele',
        description: 'Limpeza profunda facial',
        price: 80.0,
        duration: 90,
        category: 'Estética',
        isActive: true,
      },
    }),
  ])

  // 5. Criar clientes
  const clients = []
  const clientNames = [
    'Maria Santos',
    'Ana Costa',
    'Juliana Oliveira',
    'Fernanda Lima',
    'Carla Souza',
    'Patrícia Alves',
    'Renata Ferreira',
    'Luciana Martins',
    'Adriana Silva',
    'Beatriz Rocha',
    'Camila Torres',
    'Débora Gomes',
    'Elaine Barbosa',
    'Flávia Nascimento',
    'Giovana Pereira'
  ]

  for (let i = 0; i < clientNames.length; i++) {
    const name = clientNames[i]
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}.cliente@email.com`
    const phone = `119${String(Math.floor(Math.random() * 90000000) + 10000000)}`
    
    const client = await prisma.client.create({
      data: {
        professionalId: professional.id,
        name,
        email,
        phone,
        birthDate: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        loyaltyPoints: Math.floor(Math.random() * 500),
        notes: i % 3 === 0 ? 'Cliente VIP - Sempre pontual' : undefined,
        preferences: {
          favoriteServices: [services[Math.floor(Math.random() * services.length)].name],
          allergies: i % 5 === 0 ? ['Níquel'] : [],
          preferredTime: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)],
        },
      },
    })
    clients.push(client)
  }

  // 6. Criar agendamentos (últimos 3 meses + próximos 2 meses)
  const now = new Date()
  const appointments = []

  // Agendamentos passados (para histórico e análise de IA)
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 90) + 1 // 1-90 dias atrás
    const appointmentDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    
    // Ajustar para horário comercial
    appointmentDate.setHours(9 + Math.floor(Math.random() * 9)) // 9-17h
    appointmentDate.setMinutes([0, 30][Math.floor(Math.random() * 2)])
    appointmentDate.setSeconds(0)
    appointmentDate.setMilliseconds(0)

    const client = clients[Math.floor(Math.random() * clients.length)]
    const service = services[Math.floor(Math.random() * services.length)]
    
    // 85% completed, 8% no-show, 7% cancelled
    let status: AppointmentStatus
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING
    
    const rand = Math.random()
    if (rand < 0.85) {
      status = AppointmentStatus.COMPLETED
      paymentStatus = Math.random() < 0.9 ? PaymentStatus.COMPLETED : PaymentStatus.PENDING
    } else if (rand < 0.93) {
      status = AppointmentStatus.NO_SHOW
    } else {
      status = AppointmentStatus.CANCELLED
    }

    const appointment = await prisma.appointment.create({
      data: {
        professionalId: professional.id,
        clientId: client.id,
        teamMemberId: Math.random() < 0.3 ? teamMember.id : undefined,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,
        scheduledFor: appointmentDate,
        status,
        paymentStatus,
        notes: Math.random() < 0.1 ? 'Cliente chegou atrasado' : undefined,
      },
    })
    appointments.push(appointment)

    // Criar pagamento se foi pago
    if (paymentStatus === PaymentStatus.COMPLETED) {
      await prisma.payment.create({
        data: {
          professionalId: professional.id,
          appointmentId: appointment.id,
          amount: service.price,
          method: [PaymentMethod.PIX, PaymentMethod.CREDIT_CARD, PaymentMethod.CASH][Math.floor(Math.random() * 3)],
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(appointmentDate.getTime() + service.duration * 60 * 1000),
        },
      })
    }
  }

  // Agendamentos futuros (próximos 60 dias)
  for (let i = 0; i < 80; i++) {
    const daysAhead = Math.floor(Math.random() * 60) + 1 // 1-60 dias à frente
    const appointmentDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    
    // Ajustar para horário comercial
    appointmentDate.setHours(9 + Math.floor(Math.random() * 9)) // 9-17h
    appointmentDate.setMinutes([0, 30][Math.floor(Math.random() * 2)])
    appointmentDate.setSeconds(0)
    appointmentDate.setMilliseconds(0)

    const client = clients[Math.floor(Math.random() * clients.length)]
    const service = services[Math.floor(Math.random() * services.length)]
    
    // 70% scheduled, 25% confirmed, 5% cancelled
    let status: AppointmentStatus
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING
    
    const rand = Math.random()
    if (rand < 0.70) {
      status = AppointmentStatus.SCHEDULED
    } else if (rand < 0.95) {
      status = AppointmentStatus.CONFIRMED
      // 30% dos confirmados já pagaram
      if (Math.random() < 0.3) {
        paymentStatus = PaymentStatus.COMPLETED
      }
    } else {
      status = AppointmentStatus.CANCELLED
    }

    const appointment = await prisma.appointment.create({
      data: {
        professionalId: professional.id,
        clientId: client.id,
        teamMemberId: Math.random() < 0.3 ? teamMember.id : undefined,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,
        scheduledFor: appointmentDate,
        status,
        paymentStatus,
      },
    })

    // Criar pagamento antecipado se necessário
    if (paymentStatus === PaymentStatus.COMPLETED) {
      await prisma.payment.create({
        data: {
          professionalId: professional.id,
          appointmentId: appointment.id,
          amount: service.price,
          method: [PaymentMethod.PIX, PaymentMethod.CREDIT_CARD][Math.floor(Math.random() * 2)],
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Pago nos últimos 7 dias
        },
      })
    }
  }

  // 7. Criar algumas notificações
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: professionalUser.id,
        professionalId: professional.id,
        type: 'APPOINTMENT_CONFIRMATION',
        title: 'Novo agendamento confirmado',
        message: 'Maria Santos confirmou seu agendamento para amanhã às 14:30',
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: professionalUser.id,
        professionalId: professional.id,
        type: 'PAYMENT_SUCCESS',
        title: 'Pagamento recebido',
        message: 'PIX de R$ 45,00 recebido de Ana Costa',
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: professionalUser.id,
        professionalId: professional.id,
        type: 'NO_SHOW_WARNING',
        title: 'Cliente com risco de falta',
        message: 'Juliana Oliveira tem 78% de chance de faltar ao agendamento de amanhã',
        read: false,
      },
    }),
  ])

  console.log('✅ Seed concluído com sucesso!')
  console.log(`📊 Dados criados:`)
  console.log(`   👥 ${await prisma.user.count()} usuários`)
  console.log(`   🏢 ${await prisma.professional.count()} profissionais`)
  console.log(`   👤 ${await prisma.client.count()} clientes`)
  console.log(`   💼 ${await prisma.service.count()} serviços`)
  console.log(`   📅 ${await prisma.appointment.count()} agendamentos`)
  console.log(`   💰 ${await prisma.payment.count()} pagamentos`)
  console.log(`   🔔 ${await prisma.notification.count()} notificações`)
  
  console.log('\n🔐 Credenciais de teste:')
  console.log('   Admin: admin@beautyflow.com / 123456')
  console.log('   Profissional: ana@salaobella.com / 123456')
  console.log('   Staff: carlos@salaobella.com / 123456')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })