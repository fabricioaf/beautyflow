'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, 
  AlertTriangle,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'

const errorMessages = {
  'Configuration': 'Erro de configuração do servidor.',
  'AccessDenied': 'Acesso negado. Você não tem permissão para acessar este recurso.',
  'Verification': 'O token de verificação expirou ou é inválido.',
  'OAuthSignin': 'Erro ao tentar fazer login com o provedor OAuth.',
  'OAuthCallback': 'Erro no callback do provedor OAuth.',
  'OAuthCreateAccount': 'Erro ao criar conta com o provedor OAuth.',
  'EmailCreateAccount': 'Erro ao criar conta com email.',
  'Callback': 'Erro no callback de autenticação.',
  'OAuthAccountNotLinked': 'Esta conta já está vinculada a outro método de login.',
  'EmailSignin': 'Erro ao enviar email de login.',
  'CredentialsSignin': 'Credenciais inválidas. Verifique seu email e senha.',
  'SessionRequired': 'É necessário estar logado para acessar esta página.',
  'Default': 'Ocorreu um erro inesperado durante a autenticação.'
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') as keyof typeof errorMessages
  
  const errorMessage = errorMessages[error] || errorMessages.Default
  
  const getErrorIcon = () => {
    switch (error) {
      case 'AccessDenied':
        return <AlertTriangle className="w-8 h-8 text-red-600" />
      case 'SessionRequired':
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />
      default:
        return <AlertTriangle className="w-8 h-8 text-red-600" />
    }
  }

  const getErrorTitle = () => {
    switch (error) {
      case 'AccessDenied':
        return 'Acesso Negado'
      case 'SessionRequired':
        return 'Login Necessário'
      case 'CredentialsSignin':
        return 'Credenciais Inválidas'
      case 'OAuthAccountNotLinked':
        return 'Conta Já Vinculada'
      default:
        return 'Erro de Autenticação'
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
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              {getErrorIcon()}
            </div>
            <CardTitle className="text-2xl font-bold">{getErrorTitle()}</CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              {errorMessage}
            </p>

            {error === 'CredentialsSignin' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-medium mb-1">Dicas:</p>
                <ul className="text-left space-y-1">
                  <li>• Verifique se digitou o email corretamente</li>
                  <li>• Certifique-se de que a senha está correta</li>
                  <li>• Tente recuperar sua senha se necessário</li>
                </ul>
              </div>
            )}

            {error === 'OAuthAccountNotLinked' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">O que fazer:</p>
                <p className="text-left">
                  Faça login usando o mesmo método que você usou quando criou sua conta, 
                  ou entre em contato conosco para vincular suas contas.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Link href="/auth/signin">
                <Button className="w-full beauty-gradient text-white font-medium">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              </Link>
              
              {error === 'CredentialsSignin' && (
                <Link href="/auth/forgot-password">
                  <Button variant="outline" className="w-full">
                    Esqueci minha senha
                  </Button>
                </Link>
              )}
              
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Página Inicial
                </Button>
              </Link>
            </div>

            {/* Informações de suporte */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Precisa de ajuda?{' '}
                <Link 
                  href="/contact" 
                  className="text-beauty-purple-600 hover:text-beauty-purple-700 font-medium"
                >
                  Entre em contato
                </Link>
              </p>
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