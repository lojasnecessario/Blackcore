import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/store/product-card'
import Link from 'next/link'
import { Button } from '@/components/admin/ui/button'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // ISR de 1 minuto para a Home

export default async function HomePage() {
  const supabase = await createClient()

  // Buscar produtos ATIVOS com suas variações e níveis de estoque
  const { data: products } = await supabase
    .from('products')
    .select(`
      id, name, slug, images, category, 
      variants:product_variants (
        id, price, promotional_price,
        inventory_levels (available)
      )
    `)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(12)

  // Opcional: Separar por Destaques e Novidades no JS para não fazer 2 queries
  const featured = products?.slice(0, 4) || []
  const newArrivals = products?.slice(4, 12) || []

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Hero Banner */}
      <section className="relative bg-zinc-950 text-white overflow-hidden h-[70vh] flex items-center">
        <div className="absolute inset-0 z-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
        
        <div className="container relative z-20 px-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 max-w-2xl">
            A NOVA COLEÇÃO <span className="text-primary">BLACKCORE</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-xl">
            Design premium, materiais exclusivos e durabilidade extrema. Feito para quem não aceita o comum.
          </p>
          <div className="flex gap-4">
            <Link href="/categoria/vestuario">
              <Button size="lg" className="h-12 px-8 text-md">Ver Coleção</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="py-24 container px-4 mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Destaques</h2>
            <p className="text-muted-foreground mt-2">Os mais desejados do momento.</p>
          </div>
        </div>
        
        {featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum produto em destaque.
          </div>
        )}
      </section>

      {/* Categoria Showcase */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/categoria/vestuario" className="group relative h-[400px] overflow-hidden rounded-2xl bg-zinc-900 flex items-center justify-center">
               <div className="absolute inset-0 opacity-50 group-hover:opacity-60 transition-opacity bg-[url('https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=2070')] bg-cover bg-center" />
               <h3 className="relative z-10 text-4xl font-bold text-white tracking-wider">VESTUÁRIO</h3>
            </Link>
            <Link href="/categoria/acessorios" className="group relative h-[400px] overflow-hidden rounded-2xl bg-zinc-900 flex items-center justify-center">
               <div className="absolute inset-0 opacity-50 group-hover:opacity-60 transition-opacity bg-[url('https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=2080')] bg-cover bg-center" />
               <h3 className="relative z-10 text-4xl font-bold text-white tracking-wider">ACESSÓRIOS</h3>
            </Link>
          </div>
        </div>
      </section>

      {/* Novidades */}
      <section className="py-24 container px-4 mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Novidades</h2>
            <p className="text-muted-foreground mt-2">Os últimos lançamentos da loja.</p>
          </div>
        </div>
        
        {newArrivals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Aguardando novos lançamentos...
          </div>
        )}
      </section>

    </div>
  )
}
