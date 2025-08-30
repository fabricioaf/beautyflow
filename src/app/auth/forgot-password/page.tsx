'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { 
  Sparkles, 
  Mail, 
  ArrowLeft,
  Loader2,
  CheckCircle
} from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira seu email",
        variant: "destructive"
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar email')
      }

      setEmailSent(true)
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada",
        variant: "default"
      })
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Tente novamente em alguns instantes",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-beauty-purple-50 via-white to-beauty-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0">
            <CardContent className="text-center p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Email Enviado!</h2>
              <p className="text-gray-600 mb-6">
                Enviamos as instruções para redefinir sua senha para <strong>{email}</strong>
              </p>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Não recebeu o email? Verifique sua caixa de spam ou tente novamente.
                </p>
                
                <Button
                  onClick={() => {
                    setEmailSent(false)
                    setEmail('')
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Tentar outro email
                </Button>
                
                <Link href="/auth/signin">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
          <p className="text-gray-600">Recupere o acesso à sua conta</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Esqueceu sua senha?</CardTitle>
            <p className="text-gray-600 text-sm mt-2">
              Digite seu email e enviaremos instruções para redefinir sua senha
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button
                type="submit"
                className="w-full beauty-gradient text-white font-medium py-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando email...
                  </>
                ) : (
                  'Enviar instruções'
                )}
              </Button>
            </form>

            {/* Link para voltar */}
            <div className="text-center">
              <Link 
                href="/auth/signin"
                className="inline-flex items-center text-sm text-beauty-purple-600 hover:text-beauty-purple-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar para login
              </Link>
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