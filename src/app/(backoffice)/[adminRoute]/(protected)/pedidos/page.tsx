import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { SearchBar } from '@/components/admin/data/search-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/pedidos/order-status-badge'
import Link from 'next/link'
import { Button } from '@/components/admin/ui/button'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getAdminUrl } from '@/lib/admin-url'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/card'
import { Package, Truck, CheckCircle2, Clock, XCircle, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await searchParams
  const search = resolvedParams?.search || ''
  const statusFilter = resolvedParams?.status || ''

  // 1. Fetch Status Counts for Dashboard
  const { data: allStatuses } = await supabase.from('orders').select('status')
  const counts = {
    PENDING: 0,
    PAID: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELED: 0
  }
  if (allStatuses) {
    allStatuses.forEach(row => {
      if (counts[row.status as keyof typeof counts] !== undefined) {
        counts[row.status as keyof typeof counts]++
      }
    })
  }

  // 2. Build Search Query
  let query = supabase
    .from('orders')
    .select('*, profile:profiles(id, full_name, email, phone), payments(method, external_id)')
    .order('created_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  if (search) {
    // Busca multi-tabela em JS (Profiles e Payments)
    const [{ data: profs }, { data: pays }] = await Promise.all([
      supabase.from('profiles')
        .select('id')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`),
      supabase.from('payments')
        .select('order_id')
        .eq('external_id', search)
    ])

    const userIds = profs?.map(p => p.id) || []
    const orderIds = pays?.map(p => p.order_id) || []
    
    // Filtro composto
    let orClauses = []
    if (orderIds.length > 0) orClauses.push(`id.in.(${orderIds.join(',')})`)
    if (userIds.length > 0) orClauses.push(`profile_id.in.(${userIds.join(',')})`)
    if (!isNaN(Number(search))) orClauses.push(`order_number.eq.${Number(search)}`)
    
    // Adiciona busca em metadados jsonb de transportadora
    orClauses.push(`tracking_code.ilike.%${search}%`)

    if (orClauses.length > 0) {
      query = query.or(orClauses.join(','))
    } else {
      // Se não achou nada nos lookups, força um match impossível para retornar vazio
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: orders, error } = await query

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Pedidos" 
        description="Painel operacional: gerencie pagamentos, separação, envios e cancelamentos."
      />

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.PENDING}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.PAID}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Separação</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.PROCESSING}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.SHIPPED}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.DELIVERED}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/20 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.CANCELED}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar placeholder="Buscar (Nº, Nome, Email, Token, Rastreio)..." />
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Link href={getAdminUrl('/pedidos')}>
            <Button variant={!statusFilter ? 'default' : 'outline'} size="sm">Todos</Button>
          </Link>
          <Link href={getAdminUrl('/pedidos?status=PENDING')}>
            <Button variant={statusFilter === 'PENDING' ? 'default' : 'outline'} size="sm">Pendentes</Button>
          </Link>
          <Link href={getAdminUrl('/pedidos?status=PAID')}>
            <Button variant={statusFilter === 'PAID' ? 'default' : 'outline'} size="sm">Pagos</Button>
          </Link>
          <Link href={getAdminUrl('/pedidos?status=PROCESSING')}>
            <Button variant={statusFilter === 'PROCESSING' ? 'default' : 'outline'} size="sm">Em Separação</Button>
          </Link>
          <Link href={getAdminUrl('/pedidos?status=SHIPPED')}>
            <Button variant={statusFilter === 'SHIPPED' ? 'default' : 'outline'} size="sm">Enviados</Button>
          </Link>
          <Link href={getAdminUrl('/pedidos?status=DELIVERED')}>
            <Button variant={statusFilter === 'DELIVERED' ? 'default' : 'outline'} size="sm">Entregues</Button>
          </Link>
          <Link href={getAdminUrl('/pedidos?status=CANCELED')}>
            <Button variant={statusFilter === 'CANCELED' ? 'default' : 'outline'} size="sm">Cancelados</Button>
          </Link>
        </div>
      </div>

      {orders && orders.length > 0 ? (
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido & Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Transação / Frete</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status Entrega</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const pay = o.payments?.[0]
                const ship = o.shipping_details as any || {}
                const phone = o.profile?.phone || (o.shipping_address as any)?.phone || '-'
                
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-bold text-primary">#{o.order_number}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                    </TableCell>
                    <TableCell>
                      {o.profile?.id ? (
                        <Link href={getAdminUrl(`/clientes/${o.profile.id}`)} className="font-medium text-primary hover:underline truncate max-w-[200px] block">
                          {o.profile.full_name || 'Desconhecido'}
                        </Link>
                      ) : (
                        <div className="font-medium truncate max-w-[200px]">Desconhecido</div>
                      )}
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{o.profile?.email || '-'}</div>
                      <div className="text-xs text-muted-foreground">{phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs uppercase font-medium">{pay?.method || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px] font-mono" title={pay?.external_id}>{pay?.external_id || '-'}</div>
                      <div className="text-xs mt-1 text-primary">{ship?.name || 'Frete não def.'}</div>
                    </TableCell>
                    <TableCell><PaymentStatusBadge status={o.payment_status} /></TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={getAdminUrl(`/pedidos/${o.id}`)}>
                        <Button variant="outline" size="sm">Detalhes</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState 
          title="Nenhum pedido encontrado"
          description={search || statusFilter ? "Tente limpar os filtros de busca." : "Sua loja ainda não possui pedidos."}
        />
      )}
    </div>
  )
}
