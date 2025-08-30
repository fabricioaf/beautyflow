'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Sparkles, 
  User,
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Chrome,
  Github,
  Loader2,
  CheckCircle,
  Building2,
  Phone
} from 'lucide-react'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: '',
    accountType: 'professional' // 'professional' ou 'client'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'social'>('credentials')
  const router = useRouter()
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      })
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A confirmação de senha deve ser igual à senha",
        variant: "destructive"
      })
      return false
    }

    if (formData.password.length < 6) {
      toast({
        title: "Senha muito fraca",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      })
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleCredentialsSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          businessName: formData.businessName,
          accountType: formData.accountType
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Faça login para acessar sua conta",
        variant: "default"
      })

      // Redirecionar para login
      router.push('/auth/signin?message=account-created')
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente em alguns instantes",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignup = async (provider: 'google' | 'github') => {
    setIsLoading(true)
    setLoginMethod('social')
    
    try {
      await signIn(provider, { 
        callbackUrl: '/auth/welcome'
      })
    } catch (error) {
      toast({
        title: "Erro no Registro",
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
          <p className="text-gray-600">Crie sua conta e transforme seu negócio</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Tipo de Conta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Conta
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, accountType: 'professional' }))}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.accountType === 'professional'
                      ? 'border-beauty-purple-500 bg-beauty-purple-50 text-beauty-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className="w-5 h-5 mx-auto mb-1" />
                  Profissional
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, accountType: 'client' }))}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.accountType === 'client'
                      ? 'border-beauty-purple-500 bg-beauty-purple-50 text-beauty-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className="w-5 h-5 mx-auto mb-1" />
                  Cliente
                </button>
              </div>
            </div>

            {/* Formulário de Registro */}
            <form onSubmit={handleCredentialsSignup} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {formData.accountType === 'professional' && (
                <>
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Salão/Negócio
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="businessName"
                        name="businessName"
                        type="text"
                        placeholder="Nome do seu salão"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={handleInputChange}
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

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                    Criando conta...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </Button>
            </form>

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou registre-se com</span>
              </div>
            </div>

            {/* Registro Social */}
            <div className="space-y-3">
              <Button
                onClick={() => handleSocialSignup('google')}
                variant="outline"
                className="w-full py-6 border-2"
                disabled={isLoading}
              >
                {isLoading && loginMethod === 'social' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Chrome className="w-5 h-5 mr-2 text-red-500" />
                )}
                Registrar com Google
              </Button>

              <Button
                onClick={() => handleSocialSignup('github')}
                variant="outline"
                className="w-full py-6 border-2"
                disabled={isLoading}
              >
                {isLoading && loginMethod === 'social' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Github className="w-5 h-5 mr-2" />
                )}
                Registrar com GitHub
              </Button>
            </div>

            {/* Links */}
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Link 
                  href="/auth/signin"
                  className="text-beauty-purple-600 hover:text-beauty-purple-700 font-medium"
                >
                  Fazer login
                </Link>
              </div>
            </div>

            {/* Features para Profissionais */}
            {formData.accountType === 'professional' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600 text-center mb-3">
                  Recursos inclusos no seu plano:
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
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Gestão de Equipe
                  </Badge>
                </div>
              </div>
            )}
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