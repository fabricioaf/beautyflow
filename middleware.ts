import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

// Definir rotas protegidas e suas permissões necessárias
const protectedRoutes = {
  '/dashboard': ['USER'],
  '/analytics': ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'],
  '/predictions': ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'],
  '/ai-demo': ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'],
  '/admin': ['ADMIN', 'SUPER_ADMIN'],
  '/team': ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'],
  '/settings': ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN'],
  '/payments': ['PROFESSIONAL', 'ADMIN', 'SUPER_ADMIN']
} as const

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    // Se não tem token, redirecionar para login
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }
    
    // Verificar permissões por rota
    for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
      if (pathname.startsWith(route)) {
        const userRole = token.role as UserRole
        
        if (!allowedRoles.includes(userRole)) {
          // Usuário não tem permissão para esta rota
          const unauthorizedUrl = new URL('/unauthorized', req.url)
          return NextResponse.redirect(unauthorizedUrl)
        }
      }
    }
    
    // Redirecionamentos baseados no role
    if (pathname === '/dashboard') {
      const userRole = token.role as UserRole
      
      // Redirecionar baseado no tipo de usuário
      switch (userRole) {
        case 'SUPER_ADMIN':
        case 'ADMIN':
          return NextResponse.redirect(new URL('/admin/dashboard', req.url))
        case 'PROFESSIONAL':
          return NextResponse.redirect(new URL('/dashboard/professional', req.url))
        case 'STAFF':
          return NextResponse.redirect(new URL('/dashboard/staff', req.url))
        default:
          return NextResponse.redirect(new URL('/dashboard/client', req.url))
      }
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Permitir acesso a rotas públicas
        const publicRoutes = [
          '/auth/signin',
          '/auth/signup', 
          '/auth/error',
          '/auth/verify-request',
          '/auth/welcome',
          '/api/auth',
          '/',
          '/about',
          '/pricing',
          '/contact'
        ]
        
        // Verificar se a rota é pública
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }
        
        // Para rotas protegidas, precisa ter token
        return !!token
      },
    },
  }
)

// Configurar quais rotas devem passar pelo middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}