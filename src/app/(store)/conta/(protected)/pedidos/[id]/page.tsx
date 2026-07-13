import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/admin/data/page-header'
import { Button } from '@/components/admin/ui/button'
import { Package, MapPin, CreditCard, Clock, Truck } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Buscar Order + Itens + Payment
  // Protegemos com profile_id = user.id
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*),
      payments(*)
    `)
    .eq('id', id)
    .eq('profile_id', user.id)
    .single()

  if (error || !order) {
    notFound()
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const translateStatus = (status: string) => {
    const map: any = {
      PENDING: 'Pendente',
      PAID: 'Pago',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregue',
      CANCELED: 'Cancelado'
    }
    return map[status] || status
  }

  const payment = order.payments?.[0]
  const shippingAddress = order.shipping_address as any

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/conta/pedidos">
          <Button variant="outline" size="sm">← Voltar</Button>
        </Link>
        <PageHeader 
          title={`Pedido #${order.order_number}`} 
          description={`Realizado em ${new Date(order.created_at).toLocaleDateString('pt-BR')}`} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna Principal: Itens e Progresso */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="border bg-card rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Itens Comprados
            </h2>
            <div className="space-y-4 divide-y">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="pt-4 first:pt-0 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku} | Qtd: {item.quantity}</p>
                  </div>
                  <div className="font-medium text-right">
                    {formatCurrency(Number(item.total))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-6 border-t space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(order.subtotal))}</span>
              </div>
              {Number(order.discount_total) > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Desconto</span>
                  <span>-{formatCurrency(Number(order.discount_total))}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>{formatCurrency(Number(order.shipping_total))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t text-foreground">
                <span>Total</span>
                <span>{formatCurrency(Number(order.total))}</span>
              </div>
            </div>
          </div>

          <div className="border bg-card rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" /> Entrega e Rastreio
            </h2>
            <div className="text-sm">
              <p className="text-muted-foreground">
                Status de Envio: <strong className="text-foreground">{translateStatus(order.status)}</strong>
              </p>
              {order.tracking_code ? (
                <div className="mt-4 p-4 bg-muted rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Código de Rastreio</p>
                  <p className="font-mono font-bold text-lg">{order.tracking_code}</p>
                  {order.tracking_url && (
                    <Link href={order.tracking_url} target="_blank">
                      <Button size="sm" className="mt-3">Acompanhar Entrega</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-muted-foreground">O código de rastreio será disponibilizado após o envio.</p>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Infos */}
        <div className="space-y-8">
          <div className="border bg-card rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Pagamento
            </h2>
            <div className="text-sm space-y-2">
              <p>Status: <strong>{payment ? translateStatus(payment.status) : 'Pendente'}</strong></p>
              {payment && (
                <p className="text-muted-foreground">Gateway: {payment.provider}</p>
              )}
              
              {payment?.status === 'PENDING' && (
                <Link href={payment.provider === 'mercadopago' ? payment.external_id : '#'} target="_blank" className="block mt-4">
                  <Button className="w-full">Realizar Pagamento</Button>
                </Link>
              )}
            </div>
          </div>

          <div className="border bg-card rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Endereço de Entrega
            </h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">{shippingAddress?.buyer_name}</strong></p>
              <p>{shippingAddress?.street}, {shippingAddress?.number} {shippingAddress?.complement ? `- ${shippingAddress.complement}` : ''}</p>
              <p>{shippingAddress?.neighborhood}</p>
              <p>{shippingAddress?.city} - {shippingAddress?.state}</p>
              <p>CEP: {shippingAddress?.zip}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
