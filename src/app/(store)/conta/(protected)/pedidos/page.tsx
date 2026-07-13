import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import Link from 'next/link'
import { Button } from '@/components/admin/ui/button'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // A RLS do Supabase garante que o usuário só veja os próprios pedidos,
  // mas reforçamos com eq('profile_id', user.id) por segurança extra.
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

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

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Meus Pedidos" 
        description="Acompanhe o status e histórico de suas compras." 
      />

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        {orders && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Pedido</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-bold">#{order.order_number}</td>
                    <td className="px-6 py-4">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-secondary rounded-full text-xs font-medium">
                        {translateStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatCurrency(Number(order.total))}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/conta/pedidos/${order.id}`}>
                        <Button variant="ghost" size="sm">Ver Detalhes</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            Você ainda não possui nenhum pedido.
          </div>
        )}
      </div>
    </div>
  )
}
