import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

// Tipos de erro personalizado
export class AppError extends Error {
  statusCode: number
  code?: string
  details?: any

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Muitas tentativas. Tente novamente mais tarde.') {
    super(message, 429, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

// Função para lidar com erros do Prisma
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = error.meta?.target as string[] || ['campo']
      return new ConflictError(
        `Já existe um registro com este ${target[0]}`,
        { field: target[0], value: error.meta?.target }
      )
    
    case 'P2025':
      // Record not found
      return new NotFoundError('Registro')
    
    case 'P2003':
      // Foreign key constraint violation
      return new ValidationError(
        'Operação não permitida: registro está sendo referenciado por outros dados',
        { constraint: error.meta?.field_name }
      )
    
    case 'P2014':
      // Required relation violation
      return new ValidationError(
        'Operação não permitida: relação obrigatória não encontrada',
        { relation: error.meta?.relation_name }
      )
    
    case 'P2021':
      // Table does not exist
      return new AppError('Erro de configuração do banco de dados', 500, 'DATABASE_CONFIG_ERROR')
    
    case 'P2022':
      // Column does not exist
      return new AppError('Erro de estrutura do banco de dados', 500, 'DATABASE_SCHEMA_ERROR')
    
    case 'P1001':
      // Can't reach database server
      return new AppError('Falha na conexão com o banco de dados', 503, 'DATABASE_CONNECTION_ERROR')
    
    case 'P1008':
      // Operations timed out
      return new AppError('Operação do banco de dados expirou', 504, 'DATABASE_TIMEOUT_ERROR')
    
    default:
      console.error('Prisma error not handled:', error)
      return new AppError('Erro interno do banco de dados', 500, 'DATABASE_ERROR', {
        code: error.code,
        meta: error.meta
      })
  }
}

// Função para lidar com erros do Zod
function handleZodError(error: ZodError): ValidationError {
  const issues = error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
    received: issue.received,
    expected: issue.expected
  }))

  return new ValidationError(
    'Dados inválidos fornecidos',
    { issues }
  )
}

// Função principal de tratamento de erros
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Erro personalizado da aplicação
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: error.statusCode }
    )
  }

  // Erro de validação Zod
  if (error instanceof ZodError) {
    const validationError = handleZodError(error)
    return NextResponse.json(
      {
        success: false,
        error: validationError.message,
        code: validationError.code,
        details: validationError.details,
        ...(process.env.NODE_ENV === 'development' && { stack: validationError.stack })
      },
      { status: validationError.statusCode }
    )
  }

  // Erro do Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error)
    return NextResponse.json(
      {
        success: false,
        error: prismaError.message,
        code: prismaError.code,
        ...(prismaError.details && { details: prismaError.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: prismaError.stack })
      },
      { status: prismaError.statusCode }
    )
  }

  // Erro de conexão Prisma
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Falha na inicialização do banco de dados',
        code: 'DATABASE_INIT_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error.message,
          stack: error.stack 
        })
      },
      { status: 503 }
    )
  }

  // Erro de timeout Prisma
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Erro crítico do banco de dados',
        code: 'DATABASE_PANIC_ERROR'
      },
      { status: 500 }
    )
  }

  // Erro de sintaxe/parse do JavaScript
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Formato de dados inválido',
        code: 'SYNTAX_ERROR',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      },
      { status: 400 }
    )
  }

  // Erro genérico JavaScript
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error.stack,
          name: error.name 
        })
      },
      { status: 500 }
    )
  }

  // Erro desconhecido
  return NextResponse.json(
    {
      success: false,
      error: 'Erro interno do servidor',
      code: 'UNKNOWN_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        details: String(error) 
      })
    },
    { status: 500 }
  )
}

// Wrapper para handlers de API com tratamento automático de erro
export function withErrorHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

// Helper para validar sessão
export async function validateSession(session: any) {
  if (!session?.user?.email) {
    throw new AuthenticationError('Sessão inválida ou expirada')
  }
  return session
}

// Helper para validar profissional
export async function validateProfessional(professional: any, userId?: string) {
  if (!professional) {
    throw new NotFoundError('Profissional')
  }
  
  if (userId && professional.userId !== userId) {
    throw new AuthorizationError('Acesso negado ao perfil profissional')
  }
  
  return professional
}

// Helper para validar permissões de role
export function validateRole(userRole: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(userRole)) {
    throw new AuthorizationError('Permissões insuficientes para esta operação')
  }
}

// Helper para validar propriedade de recurso
export function validateOwnership(resource: any, professionalId: string, resourceName: string = 'recurso') {
  if (!resource) {
    throw new NotFoundError(resourceName)
  }
  
  if (resource.professionalId !== professionalId) {
    throw new AuthorizationError(`Acesso negado ao ${resourceName}`)
  }
  
  return resource
}