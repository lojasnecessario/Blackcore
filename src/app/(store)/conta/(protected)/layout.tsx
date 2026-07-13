import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Package, User, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/admin/ui/button'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Validar Sessão
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/conta/login')
  }

  // 2. Layout da Conta
  return (
    <div className="container mx-auto px-4 py-12 min-h-[70vh]">
      <div className="flex flex-col md:flex-row gap-10">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-1">Minha Conta</h2>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>

            <nav className="space-y-1">
              <Link href="/conta" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
                <LayoutDashboard className="w-4 h-4" /> Resumo
              </Link>
              <Link href="/conta/pedidos" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
                <Package className="w-4 h-4" /> Meus Pedidos
              </Link>
              <Link href="/conta/perfil" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
                <User className="w-4 h-4" /> Meu Perfil
              </Link>
            </nav>

            <form action="/auth/signout" method="post">
              <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4 mr-3" /> Sair da Conta
              </Button>
            </form>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1">
          {children}
        </main>

      </div>
    </div>
  )
}
