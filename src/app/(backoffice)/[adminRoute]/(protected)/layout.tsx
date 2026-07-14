import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag, Users, FolderTree, Ticket, Settings, LogOut, LayoutTemplate } from 'lucide-react'
import { Toaster } from 'sonner'
import { getAdminUrl } from '@/lib/admin-url'

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ adminRoute: string }>
}) {
  const resolvedParams = await params
  const currentRoute = '/' + resolvedParams.adminRoute
  const expectedRoute = process.env.BACKOFFICE_ROUTE || '/blackcore-control'
  
  if (currentRoute !== expectedRoute) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(getAdminUrl('/login'))
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const navItems = [
    { name: 'Dashboard', href: getAdminUrl('/dashboard'), icon: LayoutDashboard },
    { name: 'Editor da Home', href: getAdminUrl('/home-editor'), icon: LayoutTemplate },
    { name: 'Produtos', href: getAdminUrl('/produtos'), icon: Package },
    { name: 'Pedidos', href: getAdminUrl('/pedidos'), icon: ShoppingBag },
    { name: 'Clientes', href: getAdminUrl('/clientes'), icon: Users },
    { name: 'Categorias', href: getAdminUrl('/categorias'), icon: FolderTree },
    { name: 'Cupons', href: getAdminUrl('/cupons'), icon: Ticket },
    { name: 'Configurações', href: getAdminUrl('/configuracoes'), icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-primary font-bold tracking-widest uppercase">BLACKCORE</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
           <form action="/auth/signout" method="post">
              <button className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-destructive transition-colors">
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card/50 backdrop-blur border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {/* Simple Breadcrumb placeholder */}
            <span>Admin</span>
            <span>/</span>
            <span className="text-foreground">Painel</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{user.email}</span>
              <span className="text-xs text-primary font-semibold">{profile?.role}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-primary font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </div>
      </main>
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  )
}
