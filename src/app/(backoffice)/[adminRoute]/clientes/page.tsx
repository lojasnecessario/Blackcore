import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { SearchBar } from '@/components/admin/data/search-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import Link from 'next/link'
import { Button } from '@/components/admin/ui/button'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getAdminUrl } from '@/lib/admin-url'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/card'
import { Users, UserPlus, Star, DollarSign } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; filter?: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await searchParams
  const search = resolvedParams?.search || ''
  const filter = resolvedParams?.filter || ''

  // 1. Fetch Customers and their orders dynamically
  let query = supabase
    .from('profiles')
    .select('*, orders(id, status, total, created_at)')
    .eq('role', 'CUSTOMER')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data: profiles, error } = await query

  // 2. Process metrics in memory (Authorized by Phase E Rules)
  let totalCustomers = 0
  let activeCustomers = 0
  let vipCustomers = 0
  let newThisMonth = 0
  let totalRevenueAll = 0

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const processedCustomers = (profiles || []).map(profile => {
    totalCustomers++
    
    const createdDate = new Date(profile.created_at)
    if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
      newThisMonth++
    }

    const validOrders = profile.orders ? profile.orders.filter((o: any) => o.status !== 'CANCELED' && o.status !== 'REFUNDED') : []
    const orderCount = validOrders.length
    
    if (orderCount > 0) activeCustomers++

    const totalSpent = validOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
    totalRevenueAll += totalSpent
    
    // Sort orders by date descending to find the last order
    const sortedOrders = [...validOrders].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const lastOrderDate = sortedOrders.length > 0 ? sortedOrders[0].created_at : null

    // Determine badge/segmentation
    let segment = 'LEAD'
    if (orderCount === 1) segment = 'NEW_CUSTOMER'
    else if (orderCount >= 2) segment = 'RECURRING'
    
    if (orderCount >= 5 || totalSpent >= 2000) {
      segment = 'VIP'
      vipCustomers++
    }

    return {
      ...profile,
      orderCount,
      totalSpent,
      lastOrderDate,
      segment
    }
  })

  const avgTicket = activeCustomers > 0 ? totalRevenueAll / activeCustomers : 0

  // 3. Apply memory filters
  let filteredCustomers = processedCustomers
  if (filter === 'no-orders') filteredCustomers = processedCustomers.filter(c => c.orderCount === 0)
  if (filter === 'one-order') filteredCustomers = processedCustomers.filter(c => c.orderCount === 1)
  if (filter === 'recurring') filteredCustomers = processedCustomers.filter(c => c.orderCount >= 2)
  if (filter === 'vip') filteredCustomers = processedCustomers.filter(c => c.segment === 'VIP')

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const renderBadge = (segment: string) => {
    switch(segment) {
      case 'LEAD': return <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-semibold">Lead</span>
      case 'NEW_CUSTOMER': return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-semibold">Novo Cliente</span>
      case 'RECURRING': return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-semibold">Recorrente</span>
      case 'VIP': return <span className="px-2 py-1 bg-primary/20 text-primary border border-primary/50 rounded text-xs font-bold uppercase">VIP</span>
      default: return null
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Clientes" 
        description="Gestão de relacionamento e histórico de compras."
      />

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
            <Star className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vipCustomers}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos este Mês</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newThisMonth}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio (Geral)</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgTicket)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar placeholder="Buscar (Nome, Email, Telefone)..." />
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Link href={getAdminUrl('/clientes')}>
            <Button variant={!filter ? 'default' : 'outline'} size="sm">Todos</Button>
          </Link>
          <Link href={getAdminUrl('/clientes?filter=no-orders')}>
            <Button variant={filter === 'no-orders' ? 'default' : 'outline'} size="sm">Sem Compras</Button>
          </Link>
          <Link href={getAdminUrl('/clientes?filter=one-order')}>
            <Button variant={filter === 'one-order' ? 'default' : 'outline'} size="sm">1 Compra</Button>
          </Link>
          <Link href={getAdminUrl('/clientes?filter=recurring')}>
            <Button variant={filter === 'recurring' ? 'default' : 'outline'} size="sm">Recorrentes</Button>
          </Link>
          <Link href={getAdminUrl('/clientes?filter=vip')}>
            <Button variant={filter === 'vip' ? 'default' : 'outline'} size="sm">VIP</Button>
          </Link>
        </div>
      </div>

      {filteredCustomers && filteredCustomers.length > 0 ? (
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead className="text-center">Total Pedidos</TableHead>
                <TableHead className="text-right">Valor Gasto</TableHead>
                <TableHead>Última Compra</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-bold text-primary">{c.full_name || 'Desconhecido'}</div>
                    <div className="text-xs text-muted-foreground">{c.email || '-'}</div>
                    <div className="text-xs text-muted-foreground">{c.phone || '-'}</div>
                    <div className="text-xs text-muted-foreground mt-1">Cadastrado em {format(new Date(c.created_at), "dd/MM/yyyy")}</div>
                  </TableCell>
                  <TableCell>
                    {renderBadge(c.segment)}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {c.orderCount}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-500">
                    {formatCurrency(c.totalSpent)}
                  </TableCell>
                  <TableCell>
                    {c.lastOrderDate ? (
                      <div className="text-sm">{format(new Date(c.lastOrderDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={getAdminUrl(`/clientes/${c.id}`)}>
                      <Button variant="secondary" size="sm">Ver Perfil</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState 
          title="Nenhum cliente encontrado"
          description={search || filter ? "Tente limpar os filtros de busca." : "Sua loja ainda não possui clientes cadastrados."}
        />
      )}
    </div>
  )
}
