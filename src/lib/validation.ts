import { z } from 'zod'

// Validadores básicos comuns
export const commonValidators = {
  id: z.string().min(1, 'ID é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(
    /^\\+?[1-9]\\d{1,14}$/,
    'Telefone deve ter formato válido (+5511999999999)'
  ),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  url: z.string().url('URL inválida'),
  uuid: z.string().uuid('UUID inválido'),
  date: z.string().datetime('Data inválida'),
  positiveNumber: z.number().positive('Deve ser um número positivo'),
  nonNegativeNumber: z.number().min(0, 'Deve ser um número não negativo'),
  percentage: z.number().min(0).max(100, 'Porcentagem deve estar entre 0 e 100'),
  currency: z.number().min(0.01, 'Valor deve ser maior que zero'),
}

// Schema para paginação
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional().transform((page, ctx) => {
    if (page) {
      return (page - 1) * ctx.limit || 20
    }
    return undefined
  }),
})

// Schema para filtros de busca
export const searchSchema = z.object({
  search: z.string().max(100).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

// Schemas para agendamentos
export const appointmentSchemas = {
  create: z.object({
    clientId: commonValidators.id,
    serviceId: commonValidators.id.optional(),
    serviceName: z.string().min(1, 'Nome do serviço é obrigatório'),
    servicePrice: commonValidators.currency,
    serviceDuration: z.number().int().min(5, 'Duração mínima é 5 minutos').max(480, 'Duração máxima é 8 horas'),
    scheduledFor: commonValidators.date,
    notes: z.string().max(500).optional(),
    teamMemberId: commonValidators.id.optional(),
  }),
  
  update: z.object({
    id: commonValidators.id,
    clientId: commonValidators.id.optional(),
    serviceId: commonValidators.id.optional(),
    serviceName: z.string().min(1).optional(),
    servicePrice: commonValidators.currency.optional(),
    serviceDuration: z.number().int().min(5).max(480).optional(),
    scheduledFor: commonValidators.date.optional(),
    status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
    paymentStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PAID']).optional(),
    notes: z.string().max(500).optional(),
    teamMemberId: commonValidators.id.optional(),
  }),
  
  statusUpdate: z.object({
    id: commonValidators.id,
    status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
    paymentStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PAID']).optional(),
    notes: z.string().max(500).optional(),
  }),
}

// Schemas para clientes
export const clientSchemas = {
  create: z.object({
    name: commonValidators.name,
    email: commonValidators.email.optional(),
    phone: commonValidators.phone.optional(),
    birthDate: z.string().datetime().optional(),
    address: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    preferences: z.record(z.any()).optional(),
  }),
  
  update: z.object({
    id: commonValidators.id,
    name: commonValidators.name.optional(),
    email: commonValidators.email.optional(),
    phone: commonValidators.phone.optional(),
    birthDate: z.string().datetime().optional(),
    address: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    preferences: z.record(z.any()).optional(),
    loyaltyPoints: commonValidators.nonNegativeNumber.optional(),
  }),
}

// Schemas para serviços
export const serviceSchemas = {
  create: z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
    description: z.string().max(500).optional(),
    price: commonValidators.currency,
    duration: z.number().int().min(5, 'Duração mínima é 5 minutos').max(480, 'Duração máxima é 8 horas'),
    category: z.string().max(50).optional(),
    isActive: z.boolean().default(true),
    metadata: z.record(z.any()).optional(),
  }),
  
  update: z.object({
    id: commonValidators.id,
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    price: commonValidators.currency.optional(),
    duration: z.number().int().min(5).max(480).optional(),
    category: z.string().max(50).optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
  }),
}

// Schemas para notificações
export const notificationSchemas = {
  create: z.object({
    type: z.enum([
      'APPOINTMENT_CONFIRMATION',
      'APPOINTMENT_REMINDER',
      'PAYMENT_CONFIRMATION',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'PAYMENT_CANCELED',
      'PAYMENT_RECEIVED',
      'PAYMENT_DISPUTE',
      'APPOINTMENT_CANCELLATION',
      'NO_SHOW_WARNING',
      'MARKETING',
      'SYSTEM',
      'TEAM_INVITE'
    ]),
    title: z.string().min(1, 'Título é obrigatório').max(100),
    message: z.string().min(1, 'Mensagem é obrigatória').max(1000),
    recipient: z.string().min(1, 'Destinatário é obrigatório'),
    channel: z.enum(['app', 'whatsapp', 'sms', 'email']).default('app'),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
    professionalId: commonValidators.id.optional(),
    appointmentId: commonValidators.id.optional(),
    metadata: z.record(z.any()).optional(),
  }),
  
  update: z.object({
    id: commonValidators.id,
    status: z.enum(['pending', 'sent', 'failed', 'cancelled']).optional(),
    read: z.boolean().optional(),
    sentAt: z.string().datetime().optional(),
    readAt: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional(),
  }),
}

// Schemas para pagamentos
export const paymentSchemas = {
  create: z.object({
    appointmentId: commonValidators.id.optional(),
    amount: commonValidators.currency,
    currency: z.string().length(3).default('BRL'),
    method: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER']),
    description: z.string().max(200).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  
  update: z.object({
    id: commonValidators.id,
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(),
    paidAt: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional(),
  }),
}

// Schemas para usuários
export const userSchemas = {
  create: z.object({
    name: commonValidators.name,
    email: commonValidators.email,
    password: commonValidators.password,
    phone: commonValidators.phone.optional(),
    role: z.enum(['USER', 'PROFESSIONAL', 'STAFF', 'ADMIN', 'SUPER_ADMIN']).default('USER'),
  }),
  
  update: z.object({
    id: commonValidators.id,
    name: commonValidators.name.optional(),
    email: commonValidators.email.optional(),
    phone: commonValidators.phone.optional(),
    role: z.enum(['USER', 'PROFESSIONAL', 'STAFF', 'ADMIN', 'SUPER_ADMIN']).optional(),
    isActive: z.boolean().optional(),
  }),
  
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: commonValidators.password,
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  }),
}

// Função para sanitizar strings
export function sanitizeString(str: string): string {
  return str
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove caracteres HTML perigosos
    .replace(/\\s+/g, ' ') // Normaliza espaços
}

// Função para sanitizar email
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Função para sanitizar telefone
export function sanitizePhone(phone: string): string {
  return phone.replace(/\\D/g, '') // Remove tudo que não é dígito
}

// Função para validar e sanitizar dados de entrada
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    throw new z.ZodError(result.error.issues)
  }
  
  return result.data
}

// Função para validar permissões de API
export function validateApiPermissions(
  userRole: string,
  resource: string,
  action: string
): boolean {
  const permissions = {
    SUPER_ADMIN: ['*'],
    ADMIN: ['users:*', 'professionals:*', 'appointments:*', 'clients:*', 'services:*', 'notifications:*', 'payments:*'],
    PROFESSIONAL: ['appointments:*', 'clients:*', 'services:*', 'notifications:read', 'notifications:create', 'payments:read'],
    STAFF: ['appointments:read', 'appointments:update', 'clients:read', 'clients:update', 'notifications:read'],
    USER: ['appointments:read']
  }
  
  const userPermissions = permissions[userRole as keyof typeof permissions] || []
  const requiredPermission = `${resource}:${action}`
  
  return userPermissions.includes('*') || 
         userPermissions.includes(`${resource}:*`) || 
         userPermissions.includes(requiredPermission)
}

// Rate limiting básico (em memória)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  windowMs: number = 60000, // 1 minuto
  maxRequests: number = 100
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier
  
  let record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs
    }
    rateLimitStore.set(key, record)
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: record.resetTime
    }
  }
  
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    }
  }
  
  record.count++
  
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime
  }
}

// Validação de integridade de dados relacionais
export const integrityValidators = {
  // Verifica se o agendamento pode ser criado sem conflitos
  appointmentConflict: {
    schema: z.object({
      professionalId: commonValidators.id,
      scheduledFor: commonValidators.date,
      duration: z.number().int().min(5),
      excludeId: commonValidators.id.optional(),
    }),
    
    async validate(data: any, prisma: any) {
      const { professionalId, scheduledFor, duration, excludeId } = data
      const startTime = new Date(scheduledFor)
      const endTime = new Date(startTime.getTime() + duration * 60000)
      
      const conflicts = await prisma.appointment.findMany({
        where: {
          professionalId,
          ...(excludeId && { id: { not: excludeId } }),
          status: { not: 'CANCELLED' },
          OR: [
            {
              scheduledFor: {
                gte: startTime,
                lt: endTime
              }
            },
            {
              AND: [
                {
                  scheduledFor: { lte: startTime }
                },
                {
                  // Assume que temos um campo calculado para endTime
                  scheduledFor: { gte: new Date(startTime.getTime() - 480 * 60000) } // Max 8 horas antes
                }
              ]
            }
          ]
        }
      })
      
      return conflicts.length === 0
    }
  },
  
  // Verifica se o cliente pode ter outro agendamento no mesmo dia
  dailyAppointmentLimit: {
    schema: z.object({
      clientId: commonValidators.id,
      professionalId: commonValidators.id,
      scheduledFor: commonValidators.date,
      maxPerDay: z.number().int().min(1).default(3),
      excludeId: commonValidators.id.optional(),
    }),
    
    async validate(data: any, prisma: any) {
      const { clientId, professionalId, scheduledFor, maxPerDay, excludeId } = data
      const day = new Date(scheduledFor)
      day.setHours(0, 0, 0, 0)
      const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000)
      
      const todayAppointments = await prisma.appointment.count({
        where: {
          clientId,
          professionalId,
          ...(excludeId && { id: { not: excludeId } }),
          status: { notIn: ['CANCELLED'] },
          scheduledFor: {
            gte: day,
            lt: nextDay
          }
        }
      })
      
      return todayAppointments < maxPerDay
    }
  }
}