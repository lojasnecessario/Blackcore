import { createClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/admin/data/metric-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/card'
import { DollarSign, ShoppingBag, Users, Package, AlertTriangle, TrendingUp, Clock, CreditCard, Box, CheckCircle, XCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { OrderStatusBadge } from '@/components/admin/pedidos/order-status-badge'
import Link from 'next/link'
import { getAdminUrl } from '@/lib/admin-url'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: stats, error } = await supabase.rpc('admin_get_dashboard_stats')

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <AlertTriangle className="w-10 h-10 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Erro ao carregar Dashboard</h2>
        <p className="text-muted-foreground mt-2">{error.message}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
        Carregando...
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">Centro de Comando Operacional (Atualizado em tempo real).</p>
      </div>

      {/* 1. KPIs Financeiros */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Faturamento Hoje"
          value={formatCurrency(stats.financial.revenue_today)}
          icon={DollarSign}
        />
        <MetricCard
          title="Faturamento (7d)"
          value={formatCurrency(stats.financial.revenue_7d)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Faturamento (Mês Atual)"
          value={formatCurrency(stats.financial.revenue_month)}
          icon={DollarSign}
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(stats.financial.average_ticket)}
          icon={CreditCard}
        />
      </div>

      {/* 2. Funil Operacional (Pedidos) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Funil Operacional</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Card className="bg-muted/10 border-muted">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-2"><Clock className="w-4 h-4"/> Pendentes</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{stats.orders.pending || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-2 text-blue-600"><CreditCard className="w-4 h-4"/> Pagos</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-blue-600">{stats.orders.paid || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-2 text-amber-600"><Box className="w-4 h-4"/> Separação</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-amber-600">{stats.orders.processing || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-2 text-purple-600"><Package className="w-4 h-4"/> Enviados</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-purple-600">{stats.orders.shipped || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-2 text-emerald-600"><CheckCircle className="w-4 h-4"/> Entregues</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-emerald-600">{stats.orders.delivered || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 border-destructive/20">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-2 text-destructive"><XCircle className="w-4 h-4"/> Cancelados</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-destructive">{stats.orders.canceled || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Grid Inferior: Produtos, Clientes e Timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Coluna 1: Produtos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top 10 Produtos (Volume)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.products.top_selling_products?.length > 0 ? (
                <div className="space-y-4">
                  {stats.products.top_selling_products.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="truncate pr-4 font-medium">{p.title || 'Produto Excluído'}</div>
                      <div className="text-right whitespace-nowrap">
                        <div>{p.qty} unid.</div>
                        <div className="text-muted-foreground text-xs">{formatCurrency(p.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhuma venda registrada.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Estoque Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.products.low_stock_products?.length > 0 ? (
                <div className="space-y-2">
                  {stats.products.low_stock_products.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="truncate pr-2">{p.title} ({p.sku})</span>
                      <span className="font-bold text-amber-600">{p.available}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhum produto em alerta.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-destructive flex items-center gap-2"><XCircle className="w-4 h-4"/> Sem Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.products.out_of_stock_products?.length > 0 ? (
                <div className="space-y-2">
                  {stats.products.out_of_stock_products.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="truncate pr-2 text-muted-foreground">{p.title} ({p.sku})</span>
                      <span className="font-bold text-destructive">0</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Todos os produtos possuem estoque.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Clientes */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4"/> Resumo de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold">{stats.customers.total_customers}</div>
                  <div className="text-sm text-muted-foreground">Clientes Totais</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-md">
                    <div className="text-xl font-bold">{stats.customers.new_customers_month}</div>
                    <div className="text-xs text-muted-foreground">Novos (Mês)</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-md">
                    <div className="text-xl font-bold">{stats.customers.recurring_customers}</div>
                    <div className="text-xs text-muted-foreground">Recorrentes (2+)</div>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md col-span-2 flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-amber-600">{stats.customers.vip_customers}</div>
                      <div className="text-xs text-amber-600/80">VIPs (5+ ped ou R$2k+)</div>
                    </div>
                    <Users className="w-6 h-6 text-amber-600/50" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 3: Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Últimos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.timeline.latest_orders?.length > 0 ? (
                <div className="space-y-4">
                  {stats.timeline.latest_orders.map((o: any) => (
                    <div key={o.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                      <div>
                        <Link href={getAdminUrl(`/pedidos/${o.id}`)} className="font-medium text-primary hover:underline">
                          #{o.order_number}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">{o.customer_name || 'Desconhecido'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(o.total)}</div>
                        <OrderStatusBadge status={o.status} className="scale-75 origin-right" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhum pedido recente.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Atividade Financeira (Gateways)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.timeline.latest_payment_events?.length > 0 ? (
                <div className="space-y-3">
                  {stats.timeline.latest_payment_events.map((e: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-muted/30 rounded-md">
                      <div className="flex justify-between font-medium">
                        <span className="uppercase">{e.provider}</span>
                        <span>{format(new Date(e.created_at), "HH:mm dd/MM")}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        Evento: {e.event_type} | Ref: {e.external_reference}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhum evento registrado.</div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
