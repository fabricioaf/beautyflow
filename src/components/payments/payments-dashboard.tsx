'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Calendar,
  PieChart
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Transaction {
  id: string
  amount: number
  netAmount: number
  feeAmount: number
  currency: string
  method: string
  status: string
  paidAt: string | null
  createdAt: string
  client: {
    id: string
    name: string
    email: string
    phone?: string
  }
  appointment?: {
    id: string
    serviceName: string
    scheduledFor: string
    status: string
  }
  disputes: any[]
}

interface TransactionStats {
  total: {
    transactions: number
    amount: number
    netAmount: number
    feeAmount: number
  }
  monthly: {
    transactions: number
    amount: number
    netAmount: number
    feeAmount: number
  }
  byStatus: Record<string, {
    count: number
    amount: number
    netAmount: number
  }>
}

interface PaymentsDashboardProps {
  className?: string
}

export default function PaymentsDashboard({ className }: PaymentsDashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    method: '',
    search: '',
    startDate: '',
    endDate: ''
  })

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })

      const response = await fetch(`/api/payments/transactions?${params}`)
      const data = await response.json()

      if (response.ok) {
        setTransactions(data.transactions)
        setStats(data.stats)
        setTotalPages(data.pagination.pages)
      } else {
        console.error('Error fetching transactions:', data.error)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [page, filters])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'PENDING':
      case 'PROCESSING':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'CANCELED':
      case 'EXPIRED':
        return <XCircle className="w-4 h-4 text-gray-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PAID: 'default',
      PENDING: 'secondary',
      PROCESSING: 'secondary',
      FAILED: 'destructive',
      CANCELED: 'outline',
      EXPIRED: 'outline'
    }

    const colors: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELED: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status]}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    )
  }

  const getMethodIcon = (method: string) => {
    return <CreditCard className="w-4 h-4" />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100)
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/payments/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'csv',
          filters
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Criar e baixar CSV
        const csvContent = [
          Object.keys(data.data[0]).join(','),
          ...data.data.map((row: any) => Object.values(row).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting transactions:', error)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      method: '',
      search: '',
      startDate: '',
      endDate: ''
    })
    setPage(1)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-beauty-pink to-beauty-purple bg-clip-text text-transparent">
            Pagamentos
          </h1>
          <p className="text-gray-600">Gerencie todas suas transações e pagamentos</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={fetchTransactions} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.total.netAmount)}</p>
                  <p className="text-xs text-gray-500">
                    {stats.total.transactions} transações
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Este Mês</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.monthly.netAmount)}</p>
                  <p className="text-xs text-gray-500">
                    {stats.monthly.transactions} transações
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxas Pagas</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.total.feeAmount)}</p>
                  <p className="text-xs text-gray-500">
                    Total em taxas
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aprovação</p>
                  <p className="text-2xl font-bold">
                    {stats.total.transactions > 0 
                      ? Math.round((stats.byStatus.PAID?.count || 0) / stats.total.transactions * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Taxa de aprovação
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ID, cliente..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="PAID">Pagos</SelectItem>
                  <SelectItem value="PENDING">Pendentes</SelectItem>
                  <SelectItem value="PROCESSING">Processando</SelectItem>
                  <SelectItem value="FAILED">Falharam</SelectItem>
                  <SelectItem value="CANCELED">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Método</label>
              <Select
                value={filters.method}
                onValueChange={(value) => handleFilterChange('method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os métodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os métodos</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Início</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fim</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={clearFilters} variant="outline" size="sm">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-beauty-purple-600"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Líquido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-xs">
                        {transaction.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.client.name}</div>
                          <div className="text-sm text-gray-500">{transaction.client.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.appointment?.serviceName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMethodIcon(transaction.method)}
                          {transaction.method}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        -{formatCurrency(transaction.feeAmount)}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(transaction.netAmount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{new Date(transaction.createdAt).toLocaleDateString('pt-BR')}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      size="sm"
                      variant="outline"
                    >
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      size="sm"
                      variant="outline"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}