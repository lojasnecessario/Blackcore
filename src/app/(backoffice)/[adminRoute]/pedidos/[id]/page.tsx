import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/card'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/pedidos/order-status-badge'
import { OrderItemsTable } from '@/components/admin/pedidos/order-items-table'
import { OrderActions } from '@/components/admin/pedidos/order-actions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Activity } from 'lucide-react'
import Link from 'next/link'
import { getAdminUrl } from '@/lib/admin-url'
export const dynamic = 'force-dynamic'

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Fetch Order + Profile + Items + Payments
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, profile:profiles(*), items:order_items(*), payments(*)')
    .eq('id', id)
    .single()

  if (error || !order) notFound()

  // 2. Fetch Events (Timeline & Financeiro)
  const [
    { data: orderEvents },
    { data: paymentEvents }
  ] = await Promise.all([
    supabase
      .from('order_events')
      .select('*, user:profiles(full_name)')
      .eq('order_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payment_events')
      .select('*')
      .eq('external_reference', id)
      .order('created_at', { ascending: false })
  ])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const shippingAddr = order.shipping_address as any || {}
  const shippingDetails = order.shipping_details as any || {}
  const pay = order.payments?.[0]

  // Resolve tracking fields (fallback para colunas legadas se existirem)
  const trackingCode = shippingDetails.tracking_code || order.tracking_code || ''
  const trackingUrl = shippingDetails.tracking_url || order.tracking_url || ''
  const carrier = shippingDetails.carrier || order.carrier || ''
  const phone = order.profile?.phone || shippingAddr.phone || '-'

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Pedido #${order.order_number}`} 
        description={`Realizado em ${format(new Date(order.created_at), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna Esquerda: Detalhes, Itens e Timelines */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          
          <div className="flex gap-4">
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardDescription>Status do Pedido</CardDescription>
              </CardHeader>
              <CardContent><OrderStatusBadge status={order.status} /></CardContent>
            </Card>
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardDescription>Pagamento</CardDescription>
              </CardHeader>
              <CardContent><PaymentStatusBadge status={order.payment_status} /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Itens Comprados</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderItemsTable items={order.items || []} />
              
              <div className="mt-6 space-y-2 border-t pt-4 w-72 ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal dos itens</span>
                  <span>{formatCurrency(order.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-success">-{formatCurrency(order.discount_total || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete {shippingDetails.name ? `(${shippingDetails.name})` : ''}</span>
                  <span>{formatCurrency(shippingDetails.cost || order.shipping_total || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total Final</span>
                  <span>{formatCurrency(order.total || 0)}</span>
                </div>
                
                {/* Metadados Financeiros */}
                <div className="pt-4 mt-4 border-t space-y-1">
                   <div className="flex justify-between text-xs">
                     <span className="text-muted-foreground">Método:</span>
                     <span className="font-mono uppercase">{pay?.method || 'N/A'}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                     <span className="text-muted-foreground">Vega Token:</span>
                     <span className="font-mono">{pay?.external_id || 'N/A'}</span>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md flex items-center gap-2"><Activity className="h-4 w-4"/> Auditoria de Webhooks (Payment Events)</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentEvents && paymentEvents.length > 0 ? (
                <div className="overflow-x-auto text-xs border rounded">
                  <table className="w-full text-left">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2">Data</th>
                        <th className="p-2">Provider</th>
                        <th className="p-2">Evento</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentEvents.map((pe: any) => (
                        <tr key={pe.id} className="border-t">
                          <td className="p-2">{format(new Date(pe.created_at), "dd/MM/yyyy HH:mm:ss")}</td>
                          <td className="p-2 font-medium">{pe.provider}</td>
                          <td className="p-2">{pe.event_type}</td>
                          <td className="p-2">{pe.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded">
                  Nenhum webhook ou evento financeiro recebido ainda.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2"><FileText className="h-4 w-4"/> Timeline Operacional</CardTitle>
            </CardHeader>
            <CardContent>
              {orderEvents && orderEvents.length > 0 ? (
                <div className="space-y-6">
                  {orderEvents.map((ev: any, i: number) => (
                    <div key={ev.id} className="relative pl-6">
                      {i !== orderEvents.length - 1 && (
                        <div className="absolute left-2 top-6 bottom-[-24px] w-px bg-border" />
                      )}
                      <div className="absolute left-[3px] top-[6px] w-[10px] h-[10px] rounded-full bg-primary ring-4 ring-background" />
                      
                      <div className="text-sm font-medium">
                        {ev.action === 'UPDATE_INFO' ? 'Atualização de Informações' : `Status alterado para ${ev.new_status}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(ev.created_at), "dd/MM/yyyy HH:mm")} por {ev.user?.full_name || 'Sistema'}
                      </div>
                      {ev.notes && (
                        <div className="mt-2 text-sm bg-muted/50 p-2 rounded-md border border-border">
                          {ev.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="relative pl-6">
                     <div className="absolute left-[3px] top-[6px] w-[10px] h-[10px] rounded-full bg-muted-foreground ring-4 ring-background" />
                     <div className="text-sm font-medium">Pedido Realizado</div>
                     <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                     </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado.</div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Coluna Direita: Cliente, Endereço e Ações */}
        <div className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                {order.profile?.id ? (
                  <Link href={getAdminUrl(`/clientes/${order.profile.id}`)} className="font-medium text-primary hover:underline block">
                    {order.profile.full_name || 'Não informado'}
                  </Link>
                ) : (
                  <div className="font-medium">Não informado</div>
                )}
                <div className="text-sm text-muted-foreground">{order.profile?.email}</div>
                <div className="text-sm text-muted-foreground">{phone}</div>
              </div>
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-1">Endereço de Entrega</div>
                <div className="text-sm text-muted-foreground">
                  {shippingAddr.street ? (
                    <>
                      {shippingAddr.street}, {shippingAddr.number}<br/>
                      {shippingAddr.neighborhood} - {shippingAddr.city}/{shippingAddr.state}<br/>
                      CEP: {shippingAddr.zipcode}
                    </>
                  ) : (
                    'Endereço não disponível'
                  )}
                </div>
              </div>
              {shippingDetails && shippingDetails.name && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-1">Serviço de Frete</div>
                  <div className="text-sm text-muted-foreground">
                    {shippingDetails.name} ({shippingDetails.estimated_days} dias úteis)<br/>
                    Valor: {formatCurrency(shippingDetails.cost || 0)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <OrderActions 
            orderId={order.id} 
            currentStatus={order.status} 
            trackingCode={trackingCode}
            trackingUrl={trackingUrl}
            carrier={carrier}
            internalNotes={order.internal_notes || ''}
          />

        </div>

      </div>
    </div>
  )
}
