'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Sparkles, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Chrome,
  Github,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'social'>('credentials')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  useEffect(() => {
    // Verificar se já está logado
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl)
      }
    })

    // Mostrar erro se houver
    if (error) {
      let errorMessage = 'Erro ao fazer login'
      
      switch (error) {
        case 'CredentialsSignin':
          errorMessage = 'Email ou senha incorretos'
          break
        case 'OAuthAccountNotLinked':
          errorMessage = 'Esta conta já está conectada com outro método de login'
          break
        case 'OAuthCallback':
          errorMessage = 'Erro na autenticação OAuth'
          break
        case 'AccessDenied':
          errorMessage = 'Acesso negado'
          break
        default:
          errorMessage = 'Erro inesperado durante o login'
      }
      
      toast({
        title: "Erro no Login",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }, [error, callbackUrl, router, toast])

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl,
        redirect: false
      })

      if (result?.error) {
        toast({
          title: "Erro no Login",
          description: "Email ou senha incorretos",
          variant: "destructive"
        })
      } else if (result?.ok) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
          variant: "default"
        })
        router.push(callbackUrl)
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true)
    setLoginMethod('social')
    
    try {
      await signIn(provider, { callbackUrl })
    } catch (error) {
      toast({
        title: "Erro no Login",
        description: `Erro ao conectar com ${provider}`,
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-beauty-purple-50 via-white to-beauty-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-beauty-pink to-beauty-purple rounded-2xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-beauty-pink to-beauty-purple bg-clip-text text-transparent">
              BeautyFlow
            </h1>
          </div>
          <p className="text-gray-600">Faça login para acessar sua conta</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Entrar</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Login com Credenciais */}
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full beauty-gradient text-white font-medium py-6"
                disabled={isLoading && loginMethod === 'credentials'}
              >
                {isLoading && loginMethod === 'credentials' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou continue com</span>
              </div>
            </div>

            {/* Login Social */}
            <div className="space-y-3">
              <Button
                onClick={() => handleSocialLogin('google')}
                variant="outline"
                className="w-full py-6 border-2"
                disabled={isLoading}
              >
                {isLoading && loginMethod === 'social' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Chrome className="w-5 h-5 mr-2 text-red-500" />
                )}
                Continuar com Google
              </Button>

              <Button
                onClick={() => handleSocialLogin('github')}
                variant="outline"
                className="w-full py-6 border-2"
                disabled={isLoading}
              >
                {isLoading && loginMethod === 'social' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Github className="w-5 h-5 mr-2" />
                )}
                Continuar com GitHub
              </Button>
            </div>

            {/* Links */}
            <div className="text-center space-y-2">
              <Link 
                href="/auth/forgot-password"
                className="text-sm text-beauty-purple-600 hover:text-beauty-purple-700 font-medium"
              >
                Esqueceu sua senha?
              </Link>
              
              <div className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link 
                  href="/auth/signup"
                  className="text-beauty-purple-600 hover:text-beauty-purple-700 font-medium"
                >
                  Criar conta
                </Link>
              </div>
            </div>

            {/* Features */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600 text-center mb-3">
                Por que escolher o BeautyFlow?
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  IA Anti No-Show
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Analytics Avançado
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  WhatsApp Automático
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          © 2024 BeautyFlow. Todos os direitos reservados.
        </div>
      </div>
    </div>
  )
}