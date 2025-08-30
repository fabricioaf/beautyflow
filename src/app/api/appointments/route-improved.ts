import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus, PaymentStatus } from '@prisma/client'
import { 
  withErrorHandler, 
  withLogging,
  validateSession, 
  validateProfessional, 
  validateOwnership,
  NotFoundError, 
  ConflictError,
  AuthenticationError,
  ValidationError 
} from '@/lib/error-handler'
import { 
  validateAndSanitize, 
  appointmentSchemas, 
  paginationSchema, 
  searchSchema,
  checkRateLimit,
  integrityValidators 
} from '@/lib/validation'
import { logger } from '@/lib/monitoring'
import { reminderScheduler } from '@/lib/reminder-scheduler'

// GET - Listar agendamentos com tratamento robusto de erros
export const GET = withLogging(withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now()
  
  // Rate limiting
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
  const rateLimit = checkRateLimit(`appointments_get_${clientIP}`, 60000, 100)
  
  if (!rateLimit.allowed) {
    logger.security({
      type: 'rate_limit_exceeded',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: '/api/appointments',
      details: { limit: 100, window: '1min' }
    })
    throw new ValidationError('Muitas requisições. Tente novamente em 1 minuto.')
  }
  
  // Validar sessão
  const session = await getServerSession(authOptions)
  validateSession(session)
  
  // Validar parâmetros de entrada
  const url = new URL(request.url)
  const searchParams = Object.fromEntries(url.searchParams.entries())
  
  const pagination = validateAndSanitize(paginationSchema, {
    limit: searchParams.limit,
    offset: searchParams.offset,
    page: searchParams.page
  })
  
  const search = validateAndSanitize(searchSchema, {
    search: searchParams.search,
    sortBy: searchParams.sortBy || 'scheduledFor',
    sortOrder: searchParams.sortOrder || 'asc',
    status: searchParams.status,
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo
  })
  
  // Log da operação
  logger.info('Listando agendamentos', {
    userId: session.user.id,
    filters: search,
    pagination
  })
  
  // Buscar e validar professional
  const professional = await prisma.professional.findUnique({
    where: { userId: session.user.id }
  })
  
  const targetProfessionalId = searchParams.professionalId || professional?.id
  
  if (!professional && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {\n    throw new NotFoundError('Profissional')\n  }\n  \n  // Construir filtros\n  const where: any = {\n    professionalId: targetProfessionalId\n  }\n\n  // Filtros de data\n  if (search.dateFrom || search.dateTo || searchParams.date) {\n    const dateFilter: any = {}\n    \n    if (searchParams.date) {\n      // Filtro por dia específico\n      const filterDate = new Date(searchParams.date)\n      const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0))\n      const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999))\n      \n      dateFilter.gte = startOfDay\n      dateFilter.lte = endOfDay\n    } else {\n      // Filtros de range\n      if (search.dateFrom) {\n        dateFilter.gte = new Date(search.dateFrom)\n      }\n      if (search.dateTo) {\n        dateFilter.lte = new Date(search.dateTo)\n      }\n    }\n    \n    where.scheduledFor = dateFilter\n  }\n\n  // Outros filtros\n  if (search.status) {\n    where.status = search.status as AppointmentStatus\n  }\n  \n  if (searchParams.clientId) {\n    where.clientId = searchParams.clientId\n  }\n  \n  if (searchParams.teamMemberId) {\n    where.teamMemberId = searchParams.teamMemberId\n  }\n  \n  // Filtro de busca textual\n  if (search.search) {\n    where.OR = [\n      {\n        serviceName: {\n          contains: search.search,\n          mode: 'insensitive'\n        }\n      },\n      {\n        notes: {\n          contains: search.search,\n          mode: 'insensitive'\n        }\n      },\n      {\n        client: {\n          name: {\n            contains: search.search,\n            mode: 'insensitive'\n          }\n        }\n      }\n    ]\n  }\n\n  // Executar consultas em paralelo\n  const [appointments, total] = await Promise.all([\n    prisma.appointment.findMany({\n      where,\n      include: {\n        client: {\n          select: {\n            id: true,\n            name: true,\n            phone: true,\n            email: true,\n            loyaltyPoints: true\n          }\n        },\n        service: {\n          select: {\n            id: true,\n            name: true,\n            price: true,\n            duration: true,\n            category: true\n          }\n        },\n        teamMember: {\n          select: {\n            id: true,\n            user: {\n              select: {\n                name: true\n              }\n            },\n            position: true\n          }\n        },\n        payments: {\n          select: {\n            id: true,\n            amount: true,\n            method: true,\n            status: true,\n            paidAt: true\n          }\n        }\n      },\n      orderBy: {\n        [search.sortBy]: search.sortOrder\n      },\n      take: pagination.limit,\n      skip: pagination.offset\n    }),\n    prisma.appointment.count({ where })\n  ])\n\n  const duration = Date.now() - startTime\n  \n  logger.info('Agendamentos listados com sucesso', {\n    userId: session.user.id,\n    professionalId: targetProfessionalId,\n    count: appointments.length,\n    total,\n    duration\n  })\n\n  return NextResponse.json({\n    success: true,\n    data: appointments,\n    pagination: {\n      total,\n      limit: pagination.limit,\n      offset: pagination.offset,\n      hasMore: pagination.offset + pagination.limit < total,\n      page: Math.floor(pagination.offset / pagination.limit) + 1,\n      totalPages: Math.ceil(total / pagination.limit)\n    },\n    meta: {\n      duration,\n      filters: search\n    }\n  })\n}))

// POST - Criar novo agendamento com validações robustas
export const POST = withLogging(withErrorHandler(async (request: NextRequest) => {\n  const startTime = Date.now()\n  \n  // Rate limiting\n  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'\n  const rateLimit = checkRateLimit(`appointments_post_${clientIP}`, 60000, 20)\n  \n  if (!rateLimit.allowed) {\n    logger.security({\n      type: 'rate_limit_exceeded',\n      ip: clientIP,\n      userAgent: request.headers.get('user-agent') || 'unknown',\n      endpoint: '/api/appointments',\n      details: { limit: 20, window: '1min' }\n    })\n    throw new ValidationError('Muitas tentativas de criação. Tente novamente em 1 minuto.')\n  }\n  \n  // Validar sessão\n  const session = await getServerSession(authOptions)\n  validateSession(session)\n  \n  // Validar e sanitizar dados de entrada\n  const body = await request.json()\n  const appointmentData = validateAndSanitize(appointmentSchemas.create, body)\n  \n  logger.info('Criando novo agendamento', {\n    userId: session.user.id,\n    data: { ...appointmentData, notes: appointmentData.notes ? '[HIDDEN]' : undefined }\n  })\n  \n  // Buscar e validar professional\n  const professional = await prisma.professional.findUnique({\n    where: { userId: session.user.id }\n  })\n  validateProfessional(professional, session.user.id)\n  \n  // Buscar e validar serviço (se serviceId fornecido)\n  let service = null\n  if (appointmentData.serviceId) {\n    service = await prisma.service.findFirst({\n      where: {\n        id: appointmentData.serviceId,\n        professionalId: professional.id,\n        isActive: true\n      }\n    })\n    \n    if (!service) {\n      throw new NotFoundError('Serviço')\n    }\n    \n    // Usar dados do serviço se não fornecidos\n    if (!appointmentData.serviceName) appointmentData.serviceName = service.name\n    if (!appointmentData.servicePrice) appointmentData.servicePrice = service.price\n    if (!appointmentData.serviceDuration) appointmentData.serviceDuration = service.duration\n  }\n  \n  // Validar cliente\n  const client = await prisma.client.findFirst({\n    where: {\n      id: appointmentData.clientId,\n      professionalId: professional.id\n    }\n  })\n  \n  if (!client) {\n    throw new NotFoundError('Cliente')\n  }\n  \n  // Validar team member (se fornecido)\n  if (appointmentData.teamMemberId) {\n    const teamMember = await prisma.teamMember.findFirst({\n      where: {\n        id: appointmentData.teamMemberId,\n        professionalId: professional.id,\n        isActive: true\n      }\n    })\n    \n    if (!teamMember) {\n      throw new NotFoundError('Membro da equipe')\n    }\n  }\n  \n  const appointmentDate = new Date(appointmentData.scheduledFor)\n  const duration = appointmentData.serviceDuration\n  \n  // Validações de integridade\n  const conflictValidation = await integrityValidators.appointmentConflict.validate({\n    professionalId: professional.id,\n    scheduledFor: appointmentDate.toISOString(),\n    duration\n  }, prisma)\n  \n  if (!conflictValidation) {\n    // Buscar detalhes do conflito para resposta detalhada\n    const conflictingAppointment = await prisma.appointment.findFirst({\n      where: {\n        professionalId: professional.id,\n        status: { not: AppointmentStatus.CANCELLED },\n        scheduledFor: {\n          gte: new Date(appointmentDate.getTime() - duration * 60000),\n          lt: new Date(appointmentDate.getTime() + duration * 60000)\n        }\n      },\n      include: {\n        client: { select: { name: true } },\n        service: { select: { name: true, duration: true } }\n      }\n    })\n    \n    throw new ConflictError('Conflito de horário detectado', {\n      conflictWith: {\n        id: conflictingAppointment?.id,\n        clientName: conflictingAppointment?.client?.name,\n        serviceName: conflictingAppointment?.serviceName,\n        scheduledFor: conflictingAppointment?.scheduledFor\n      }\n    })\n  }\n  \n  // Validar limite diário de agendamentos (opcional)\n  const dailyLimitValidation = await integrityValidators.dailyAppointmentLimit.validate({\n    clientId: appointmentData.clientId,\n    professionalId: professional.id,\n    scheduledFor: appointmentDate.toISOString(),\n    maxPerDay: 3\n  }, prisma)\n  \n  if (!dailyLimitValidation) {\n    throw new ConflictError('Cliente já atingiu o limite de agendamentos por dia (máximo 3)')\n  }\n  \n  // Criar agendamento em transação\n  const appointment = await prisma.$transaction(async (tx) => {\n    const newAppointment = await tx.appointment.create({\n      data: {\n        professionalId: professional.id,\n        clientId: appointmentData.clientId,\n        serviceId: appointmentData.serviceId,\n        serviceName: appointmentData.serviceName,\n        servicePrice: appointmentData.servicePrice,\n        serviceDuration: appointmentData.serviceDuration,\n        scheduledFor: appointmentDate,\n        teamMemberId: appointmentData.teamMemberId,\n        notes: appointmentData.notes,\n        status: AppointmentStatus.SCHEDULED,\n        paymentStatus: PaymentStatus.PENDING\n      },\n      include: {\n        client: {\n          select: {\n            id: true,\n            name: true,\n            phone: true,\n            email: true\n          }\n        },\n        service: {\n          select: {\n            id: true,\n            name: true,\n            price: true,\n            duration: true,\n            category: true\n          }\n        }\n      }\n    })\n    \n    // Criar notificação de confirmação\n    await tx.notification.create({\n      data: {\n        professionalId: professional.id,\n        appointmentId: newAppointment.id,\n        userId: session.user.id,\n        type: 'APPOINTMENT_CONFIRMATION',\n        title: 'Novo agendamento criado',\n        message: `Agendamento para ${client.name} em ${appointmentDate.toLocaleDateString('pt-BR')} às ${appointmentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,\n        channel: 'app',\n        recipient: session.user.email!,\n        priority: 'NORMAL',\n        status: 'pending'\n      }\n    })\n    \n    return newAppointment\n  })\n  \n  // Agendar lembretes automáticos (não crítico)\n  try {\n    await reminderScheduler.scheduleReminders(appointment.id)\n    logger.info('Lembretes agendados', { appointmentId: appointment.id })\n  } catch (reminderError) {\n    logger.warn('Falha ao agendar lembretes', { \n      appointmentId: appointment.id, \n      error: reminderError \n    })\n    // Não falhar o agendamento por causa dos lembretes\n  }\n  \n  const duration = Date.now() - startTime\n  \n  logger.info('Agendamento criado com sucesso', {\n    userId: session.user.id,\n    professionalId: professional.id,\n    appointmentId: appointment.id,\n    clientId: appointment.clientId,\n    duration\n  })\n\n  return NextResponse.json({\n    success: true,\n    data: appointment,\n    message: 'Agendamento criado com sucesso',\n    meta: {\n      duration,\n      remindersScheduled: true\n    }\n  }, { status: 201 })\n}))

// PUT - Atualizar agendamento
export const PUT = withLogging(withErrorHandler(async (request: NextRequest) => {\n  const session = await getServerSession(authOptions)\n  validateSession(session)\n  \n  const body = await request.json()\n  const updateData = validateAndSanitize(appointmentSchemas.update, body)\n  \n  const professional = await prisma.professional.findUnique({\n    where: { userId: session.user.id }\n  })\n  validateProfessional(professional, session.user.id)\n  \n  // Buscar e validar propriedade do agendamento\n  const existingAppointment = await prisma.appointment.findFirst({\n    where: {\n      id: updateData.id,\n      professionalId: professional.id\n    }\n  })\n  \n  validateOwnership(existingAppointment, professional.id, 'agendamento')\n  \n  // Validar conflitos se horário for alterado\n  if (updateData.scheduledFor) {\n    const newDate = new Date(updateData.scheduledFor)\n    const duration = updateData.serviceDuration || existingAppointment.serviceDuration\n    \n    const conflictValidation = await integrityValidators.appointmentConflict.validate({\n      professionalId: professional.id,\n      scheduledFor: newDate.toISOString(),\n      duration,\n      excludeId: updateData.id\n    }, prisma)\n    \n    if (!conflictValidation) {\n      throw new ConflictError('Novo horário conflita com outro agendamento')\n    }\n  }\n  \n  // Atualizar agendamento\n  const updatedAppointment = await prisma.appointment.update({\n    where: { id: updateData.id },\n    data: {\n      ...updateData,\n      updatedAt: new Date()\n    },\n    include: {\n      client: {\n        select: {\n          id: true,\n          name: true,\n          phone: true,\n          email: true\n        }\n      },\n      service: {\n        select: {\n          id: true,\n          name: true,\n          price: true,\n          duration: true\n        }\n      }\n    }\n  })\n  \n  logger.info('Agendamento atualizado', {\n    userId: session.user.id,\n    appointmentId: updateData.id,\n    changes: updateData\n  })\n\n  return NextResponse.json({\n    success: true,\n    data: updatedAppointment,\n    message: 'Agendamento atualizado com sucesso'\n  })\n}))