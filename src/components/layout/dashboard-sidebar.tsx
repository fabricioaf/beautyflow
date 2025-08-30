'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageCircle,
  BarChart3,
  CreditCard,
  Bot,
  Settings,
  Crown,
  Sparkles,
  Brain,
  TrendingUp,
  Zap
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agendamentos', href: '/dashboard/agendamentos', icon: Calendar },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { name: 'Analytics & BI', href: '/analytics', icon: TrendingUp, pro: true },
  { name: 'IA Anti No-Show', href: '/predictions', icon: Brain, pro: true },
  { name: 'Demo da IA', href: '/ai-demo', icon: Zap, pro: true },
  { name: 'WhatsApp', href: '/dashboard/whatsapp', icon: MessageCircle, pro: true },
  { name: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3 },
  { name: 'Pagamentos', href: '/dashboard/pagamentos', icon: CreditCard },
  { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings }
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 lg:block hidden">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-beauty-pink to-beauty-purple rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-beauty-pink to-beauty-purple bg-clip-text text-transparent">
            BeautyFlow
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-beauty-pink to-beauty-purple text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className={cn("flex-shrink-0 w-5 h-5 mr-3", isActive ? "text-white" : "text-gray-400")} />
              <span className="flex-1">{item.name}</span>
              {item.pro && (
                <Crown className="w-4 h-4 ml-2 text-yellow-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade CTA */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-beauty-pink to-beauty-purple rounded-lg p-4 text-white">
          <h3 className="text-sm font-semibold">Upgrade para Pro</h3>
          <p className="text-xs mt-1 opacity-90">Acesse IA e WhatsApp automático</p>
          <button className="w-full mt-3 bg-white text-beauty-pink font-medium py-2 px-3 rounded-md text-sm hover:bg-gray-100 transition-colors">
            Fazer Upgrade
          </button>
        </div>
      </div>
    </div>
  )
}