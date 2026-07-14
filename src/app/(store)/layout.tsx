import Link from 'next/link'
import { Search, ShoppingBag, User } from 'lucide-react'
import { CartProvider } from '@/contexts/cart-context'
import { CartDrawer } from '@/components/store/cart-drawer'

import { createClient } from '@/lib/supabase/server'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: globalData } = await supabase.rpc('get_storefront_data')
  const menuCategories = globalData?.menuCategories || []
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
      {/* Header Público */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-xl tracking-tight">
              BLACK<span className="text-primary">CORE</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {menuCategories?.map((cat: any) => (
                <Link key={cat.id} href={`/categoria/${cat.slug}`} className="transition-colors hover:text-primary uppercase">
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <form action="/busca" className="hidden md:block relative">
              <input 
                type="search" 
                name="q"
                placeholder="Buscar produtos..." 
                className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-8"
              />
              <button type="submit" className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                <Search className="h-4 w-4" />
              </button>
            </form>
            
            <Link href="/conta" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <User className="h-5 w-5" />
            </Link>
            <Link href="/carrinho" className="p-2 text-muted-foreground hover:text-foreground transition-colors relative">
              <ShoppingBag className="h-5 w-5" />
              {/* <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">2</span> */}
            </Link>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer Público */}
      <footer className="border-t bg-muted/40 py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="font-bold text-xl tracking-tight mb-4">
              BLACK<span className="text-primary">CORE</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Elevando o padrão de qualidade no e-commerce brasileiro. Produtos premium, entrega rápida e atendimento de excelência.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Departamentos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {menuCategories?.map(cat => (
                <li key={`footer-${cat.id}`}>
                  <Link href={`/categoria/${cat.slug}`} className="hover:text-primary uppercase">{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Institucional</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">Sobre Nós</Link></li>
              <li><Link href="#" className="hover:text-primary">Política de Privacidade</Link></li>
              <li><Link href="#" className="hover:text-primary">Termos de Serviço</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Atendimento</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/conta/pedidos" className="hover:text-primary">Meus Pedidos</Link></li>
              <li><Link href="#" className="hover:text-primary">Trocas e Devoluções</Link></li>
              <li><Link href="#" className="hover:text-primary">Fale Conosco</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BlackCore System. Todos os direitos reservados.
        </div>
      </footer>
      <CartDrawer />
      </div>
    </CartProvider>
  )
}
