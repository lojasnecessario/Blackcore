import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import Link from 'next/link'
import { Package, User } from 'lucide-react'
import { Button } from '@/components/admin/ui/button'

export const dynamic = 'force-dynamic'

export default async function AccountDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch recent data
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const totalOrders = orders?.length || 0
  const lastOrder = orders?.[0]

  return (
    <div className="space-y-8">
      <PageHeader 
        title={`Olá, ${profile?.full_name?.split(' ')[0] || 'Cliente'}!`} 
        description="Gerencie seus pedidos, dados pessoais e endereços." 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Widget Pedidos */}
        <div className="border bg-card rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-primary font-bold">
              <Package className="w-5 h-5" /> Seus Pedidos
            </div>
            <p className="text-muted-foreground text-sm">
              Você tem {totalOrders} pedido(s) recentes.
            </p>
            {lastOrder && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm">
                <strong>Último Pedido:</strong> #{lastOrder.order_number} <br/>
                <span className="text-muted-foreground">Status: {lastOrder.status}</span>
              </div>
            )}
          </div>
          <Link href="/conta/pedidos" className="mt-6">
            <Button variant="outline" className="w-full">Ver todos os pedidos</Button>
          </Link>
        </div>

        {/* Widget Perfil */}
        <div className="border bg-card rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-primary font-bold">
              <User className="w-5 h-5" /> Seus Dados
            </div>
            <div className="space-y-2 mt-4 text-sm text-muted-foreground">
              <p><strong>Nome:</strong> {profile?.full_name || 'Não informado'}</p>
              <p><strong>E-mail:</strong> {user.email}</p>
              <p><strong>Telefone:</strong> {profile?.phone || 'Não informado'}</p>
            </div>
          </div>
          <Link href="/conta/perfil" className="mt-6">
            <Button variant="outline" className="w-full">Editar Perfil</Button>
          </Link>
        </div>

      </div>
    </div>
  )
}
