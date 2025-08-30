import { NextAuthOptions, DefaultSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'

// Extender tipos do NextAuth
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: UserRole
      professionalId?: string
      teamMemberId?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: UserRole
    professionalId?: string
    teamMemberId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    professionalId?: string
    teamMemberId?: string
  }
}

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            professional: true,
            teamMember: true
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Atualizar último login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          professionalId: user.professional?.id,
          teamMemberId: user.teamMember?.id
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Verificar se o usuário está ativo
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email }
        })
        
        if (dbUser && !dbUser.isActive) {
          return false
        }
      }
      
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.professionalId = token.professionalId
        session.user.teamMemberId = token.teamMemberId
      }
      return session
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.professionalId = user.professionalId
        token.teamMemberId = user.teamMemberId
      }
      
      // Atualizar token quando a sessão for atualizada
      if (trigger === 'update' && session) {
        token.role = session.role
        token.professionalId = session.professionalId
        token.teamMemberId = session.teamMemberId
      }
      
      return token
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome'
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log de login
      console.log(`User ${user.email} signed in with ${account?.provider}`)
      
      if (isNewUser) {
        // Lógica para novos usuários
        console.log(`New user created: ${user.email}`)
      }
    },
    async signOut({ session, token }) {
      console.log(`User signed out: ${session?.user?.email}`)
    }
  }
}