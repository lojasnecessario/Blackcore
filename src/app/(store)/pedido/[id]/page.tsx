import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/admin/data/page-header'
import { Button } from '@/components/admin/ui/button'
import { CheckCircle2, Clock, MapPin, Package, CreditCard, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // Buscar Order + Itens + Payment
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*),
      payments(*)
    `)
    .eq('id', id)
    .single()

  if (error || !order) {
    notFound()
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const payment = order.payments?.[0]
  const shippingAddress = order.shipping_address as any

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header de Sucesso */}
        <div className="bg-muted/30 border rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Pedido Recebido!</h1>
          <p className="text-lg text-muted-foreground">
            Obrigado pela sua compra. Seu pedido <strong className="text-foreground">#{order.order_number}</strong> foi gerado com sucesso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Esquerda: Info e Endereço */}
          <div className="space-y-8">
            <section className="border rounded-xl p-6 bg-card space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Status do Pedido
              </h2>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Aguardando Pagamento
                </div>
                <span className="text-muted-foreground">
                  Data: {new Date(order.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </section>

            <section className="border rounded-xl p-6 bg-card space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Pagamento
              </h2>
              {payment?.status === 'PENDING' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Para concluir sua compra, por favor finalize o pagamento na plataforma do nosso parceiro.
                  </p>
                  <Link href={payment.provider === 'mercadopago' ? payment.external_id : '#'} target="_blank">
                    <Button className="w-full">
                      Pagar Agora (Mock {payment.provider})
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-success font-medium">
                  Pagamento Confirmado
                </div>
              )}
            </section>

            <section className="border rounded-xl p-6 bg-card space-y-4">
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
            </section>
          </div>

          {/* Direita: Itens */}
          <div className="space-y-4 border rounded-xl p-6 bg-card">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Package className="w-5 h-5 text-primary" /> Itens do Pedido
            </h2>

            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex gap-4 items-center border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex-1 text-sm">
                    <div className="font-medium line-clamp-1">{item.product_name}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">SKU: {item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(item.price)}</div>
                    <div className="text-xs text-muted-foreground">Qtd: {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm border-t pt-4">
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
            </div>

            <div className="flex justify-between font-bold text-xl pt-4 border-t mt-4">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total))}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
