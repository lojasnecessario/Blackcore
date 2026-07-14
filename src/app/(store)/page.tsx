import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/store/product-card'
import Link from 'next/link'
import { Button } from '@/components/admin/ui/button'

export const dynamic = 'force-static' // Will be ISR via revalidate
export const revalidate = 30 // ISR de 30 segundos para a Home

export default async function HomePage() {
  const supabase = await createClient()

  // 1. Buscar blocos da home configurados no CMS via RPC de otimização global
  const { data: globalData } = await supabase.rpc('get_storefront_data')
  const blocks = globalData?.homeBlocks || []

  // 2. Se houver blocos, renderiza de forma 100% dinâmica (Backoffice = Única Fonte da Verdade)
  if (blocks && blocks.length > 0) {
    return (
      <div className="flex flex-col min-h-screen">
        {blocks.map((block) => {
          if (block.type === 'hero') {
            return (
              <section key={block.id} className="relative bg-zinc-950 text-white overflow-hidden h-[70vh] flex items-center">
                <div className="absolute inset-0 z-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('${block.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070'}')` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
                <div className="container relative z-20 px-4">
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 max-w-2xl">
                    {block.title}
                  </h1>
                  <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-xl">
                    {block.subtitle}
                  </p>
                  {block.button_text && block.button_link && (
                    <div className="flex gap-4">
                      <Link href={block.button_link}>
                        <Button size="lg" className="h-12 px-8 text-md">{block.button_text}</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )
          }

          if (block.type === 'announcement') {
            return (
              <div key={block.id} className="bg-primary text-primary-foreground py-2 text-center text-sm font-medium">
                {block.title}
              </div>
            )
          }

          if (block.type === 'banner') {
            return (
              <section key={block.id} className="py-8 container px-4 mx-auto">
                 <Link href={block.button_link || '#'}>
                   <img src={block.image} alt={block.title} className="w-full rounded-2xl object-cover h-[200px] md:h-[300px]" />
                 </Link>
              </section>
            )
          }

          if (block.type === 'categories_showcase') {
            // Utilizamos a query nativa do Supabase para pegar as categorias do showcase (legado ou novo comportamento se quiser refinar)
            return (
              <section key={block.id} className="py-16 bg-muted/30">
                <div className="container px-4 mx-auto text-center mb-8">
                  <h2 className="text-3xl font-bold">{block.title || 'Nossas Categorias'}</h2>
                  {block.subtitle && <p className="text-muted-foreground mt-2">{block.subtitle}</p>}
                </div>
                {/* Aqui poderíamos buscar as categorias dinamicamente de volta do banco usando a "query" ou flag. Como estamos renderizando SSR, podemos invocar o Supabase de novo. */}
                <CategoriesShowcase limit={block.limit_products} />
              </section>
            )
          }

          return null // Futuras implementações de collections
        })}
      </div>
    )
  }

  // 3. FALLBACK LEGADO: Se não houver blocos, mantemos o comportamento antigo para não quebrar a loja
  const { data: homeCategories } = await supabase
    .from('categories')
    .select('id, name, slug, thumbnail_url, banner_desktop')
    .eq('active', true)
    .eq('show_on_home', true)
    .order('display_order', { ascending: true })

  const { data: products } = await supabase
    .from('products')
    .select(`
      id, name, slug, images, category, 
      featured, best_seller, new_arrival, promotion,
      variants:product_variants (
        id, price, promotional_price,
        inventory_levels (available)
      )
    `)
    .eq('status', 'ACTIVE')
    .eq('published', true)
    .eq('show_in_store', true)
    .order('priority', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(16)

  const newArrivals = products?.filter(p => p.new_arrival) || []
  const displayNewArrivals = newArrivals.length > 0 ? newArrivals : (products || [])

  return (
    <div className="flex flex-col min-h-screen">
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

      {homeCategories && homeCategories.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {homeCategories.map(cat => (
                <Link key={cat.id} href={`/categoria/${cat.slug}`} className="group relative h-[400px] overflow-hidden rounded-2xl bg-zinc-900 flex items-center justify-center">
                  <div 
                    className="absolute inset-0 opacity-50 group-hover:opacity-60 transition-opacity bg-cover bg-center" 
                    style={{ backgroundImage: `url('${cat.banner_desktop || cat.thumbnail_url || 'https://via.placeholder.com/600x800?text='+cat.name}')` }}
                  />
                  <h3 className="relative z-10 text-4xl font-bold text-white tracking-wider uppercase">{cat.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-24 container px-4 mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Novidades</h2>
            <p className="text-muted-foreground mt-2">Os últimos lançamentos da loja.</p>
          </div>
        </div>
        {displayNewArrivals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {displayNewArrivals.map((p) => (
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

async function CategoriesShowcase({ limit }: { limit: number | null }) {
  const supabase = await createClient()
  let query = supabase
    .from('categories')
    .select('id, name, slug, thumbnail_url, banner_desktop')
    .eq('active', true)
    .eq('show_on_home', true)
    .order('display_order', { ascending: true })
    
  if (limit) {
    query = query.limit(limit)
  }

  const { data: homeCategories } = await query

  if (!homeCategories || homeCategories.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {homeCategories.map(cat => (
        <Link key={cat.id} href={`/categoria/${cat.slug}`} className="group relative h-[400px] overflow-hidden rounded-2xl bg-zinc-900 flex items-center justify-center">
          <div 
            className="absolute inset-0 opacity-50 group-hover:opacity-60 transition-opacity bg-cover bg-center" 
            style={{ backgroundImage: `url('${cat.banner_desktop || cat.thumbnail_url || 'https://via.placeholder.com/600x800?text='+cat.name}')` }}
          />
          <h3 className="relative z-10 text-4xl font-bold text-white tracking-wider uppercase">{cat.name}</h3>
        </Link>
      ))}
    </div>
  )
}
