import { UserRole } from '@prisma/client'

// Mapeamento de permissões por role
export const ROLE_PERMISSIONS = {
  USER: ['read:own'],
  PROFESSIONAL: [
    'read:own', 'write:own', 'read:clients', 'write:clients',
    'read:appointments', 'write:appointments', 'read:analytics',
    'read:team', 'write:team', 'read:payments', 'write:payments'
  ],
  STAFF: [
    'read:appointments', 'write:appointments', 'read:clients', 'write:clients',
    'read:own', 'write:own'
  ],
  ADMIN: [
    'read:all', 'write:all', 'delete:all', 'manage:users',
    'manage:system', 'read:analytics', 'manage:billing'
  ],
  SUPER_ADMIN: ['*'] // Todas as permissões
} as const

export type Permission = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS][number] | '*'

// Verificar se um role tem uma permissão específica
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole]
  
  // Super admin tem todas as permissões
  if (rolePermissions.includes('*')) {
    return true
  }
  
  return rolePermissions.includes(permission as any)
}

// Verificar se um role é maior ou igual a outro
export function isRoleAtLeast(userRole: UserRole, minimumRole: UserRole): boolean {
  const roleHierarchy = {
    USER: 0,
    STAFF: 1,
    PROFESSIONAL: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole]
}

// Verificar se um usuário pode acessar um recurso
export function canAccessResource(
  userRole: UserRole,
  resourceOwnerId: string,
  userId: string,
  requiredPermission: Permission
): boolean {
  // Se tem a permissão específica
  if (hasPermission(userRole, requiredPermission)) {
    return true
  }
  
  // Se é o próprio usuário e tem permissão own
  if (resourceOwnerId === userId && hasPermission(userRole, 'read:own')) {
    return true
  }
  
  return false
}

// Gerar token de convite seguro
export function generateInviteToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

// Validar se um convite ainda é válido
export function isInviteValid(inviteExpiry: Date | null): boolean {
  if (!inviteExpiry) return false
  return new Date() < inviteExpiry
}

// Calcular data de expiração do convite (7 dias)
export function getInviteExpiry(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7)
  return expiry
}

// Funções para verificação de roles específicas
export const roleCheckers = {
  isSuperAdmin: (role: UserRole) => role === 'SUPER_ADMIN',
  isAdmin: (role: UserRole) => ['ADMIN', 'SUPER_ADMIN'].includes(role),
  isProfessional: (role: UserRole) => ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'].includes(role),
  isStaff: (role: UserRole) => ['STAFF', 'PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'].includes(role),
  canManageTeam: (role: UserRole) => ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'].includes(role),
  canViewAnalytics: (role: UserRole) => ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'].includes(role),
  canManageSystem: (role: UserRole) => ['ADMIN', 'SUPER_ADMIN'].includes(role)
}

// Tipos para tipagem segura
export type RoleChecker = keyof typeof roleCheckers