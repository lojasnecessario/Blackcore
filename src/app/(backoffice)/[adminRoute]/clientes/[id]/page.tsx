import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { OrderStatusBadge } from '@/components/admin/pedidos/order-status-badge'
import { CustomerNotes } from '@/components/admin/clientes/customer-notes'
import Link from 'next/link'
import { Button } from '@/components/admin/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getAdminUrl } from '@/lib/admin-url'
import { User, Mail, Phone, Calendar, ShoppingBag, MapPin, DollarSign, Clock, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Fetch Customer + Orders + Internal Notes
  const { data: customer, error } = await supabase
    .from('profiles')
    .select('*, orders(*), customer_internal_notes(*)')
    .eq('id', id)
    .single()

  if (error || !customer) notFound()

  // Extract notes and sort by newest first
  const internalNotes = (customer.customer_internal_notes || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // 2. Process Metrics (No views allowed)
  const validOrders = (customer.orders || []).filter((o: any) => o.status !== 'CANCELED' && o.status !== 'REFUNDED')
  const orderCount = validOrders.length
  const totalSpent = validOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
  const avgTicket = orderCount > 0 ? totalSpent / orderCount : 0
  
  const sortedOrders = [...customer.orders || []].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  // Extrair endereços únicos dos pedidos
  const addressHistory = new Map()
  sortedOrders.forEach((o: any) => {
    if (o.shipping_address && o.shipping_address.street) {
      const key = `${o.shipping_address.street}, ${o.shipping_address.number} - ${o.shipping_address.zipcode}`
      if (!addressHistory.has(key)) {
        addressHistory.set(key, o.shipping_address)
      }
    }
  })
  const addresses = Array.from(addressHistory.values())
  const currentAddress = addresses.length > 0 ? addresses[0] : null

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={getAdminUrl('/clientes')}>
          <Button variant="outline" size="sm">Voltar</Button>
        </Link>
        <PageHeader 
          title={customer.full_name || 'Cliente Desconhecido'}
          description="Visão 360 do cliente."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna Esquerda: Dados e Endereços */}
        <div className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5"/> Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">{customer.email || '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm font-medium">Telefone</div>
                  <div className="text-sm text-muted-foreground">{customer.phone || '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm font-medium">Cliente desde</div>
                  <div className="text-sm text-muted-foreground">{format(new Date(customer.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5"/> Endereços</CardTitle>
              <CardDescription>Extraídos dos pedidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.length > 0 ? (
                addresses.map((addr: any, idx) => (
                  <div key={idx} className={`p-3 rounded-md text-sm border ${idx === 0 ? 'bg-muted/30 border-primary/20' : 'bg-transparent border-border'}`}>
                    {idx === 0 && <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Último Utilizado</div>}
                    <div className="font-medium">{addr.street}, {addr.number}</div>
                    <div className="text-muted-foreground">{addr.neighborhood}</div>
                    <div className="text-muted-foreground">{addr.city} - {addr.state}</div>
                    <div className="text-muted-foreground">CEP: {addr.zipcode}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhum endereço registrado.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Notas Internas</CardTitle>
              <CardDescription>Apenas staff pode visualizar</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerNotes customerId={customer.id} initialNotes={internalNotes} />
            </CardContent>
          </Card>

        </div>

        {/* Coluna Direita: Métricas e Histórico */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-muted/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><ShoppingBag className="w-4 h-4"/> Pedidos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderCount}</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-500/10 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-emerald-600"><DollarSign className="w-4 h-4"/> Total Gasto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSpent)}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">Ticket Médio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(avgTicket)}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><Clock className="w-4 h-4"/> Último Pedido</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {validOrders.length > 0 
                    ? format(new Date(validOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at), "dd/MM/yyyy") 
                    : '-'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedOrders.length > 0 ? (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedOrders.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium text-primary">#{o.order_number}</TableCell>
                          <TableCell className="text-sm">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
                          <TableCell className="text-right">
                            <Link href={getAdminUrl(`/pedidos/${o.id}`)}>
                              <Button variant="outline" size="sm">Ver</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                  Nenhum pedido encontrado.
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}
