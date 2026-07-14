import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/store/product-card'
import { notFound } from 'next/navigation'

export const dynamic = 'force-static' // Will be ISR via revalidate
export const revalidate = 60 // ISR de 60 segundos para Categorias

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { slug } = await params

  // Decodifica o slug (ex: vestuario) e faz o match case-insensitive
  const decodedSlug = decodeURIComponent(slug).toLowerCase()

  const { data: allProducts } = await supabase
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

  // Temporário para o Sprint 1: Filtrar ignorando acentos até termos a tabela de categorias com slug
  const products = allProducts?.filter(p => {
    if (!p.category) return false
    const catNormalized = p.category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const slugNormalized = decodedSlug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    return catNormalized === slugNormalized
  }) || []

  if (!products || products.length === 0) {
    // Pode exibir vazio, mas não 404, porque a categoria pode só estar sem produtos temporariamente
  }

  return (
    <div className="container mx-auto px-4 py-16 min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight uppercase">{decodedSlug}</h1>
        <p className="text-muted-foreground mt-2">
          {products?.length || 0} produto(s) encontrado(s)
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Filtros Side (Desktop) */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div>
            <h3 className="font-semibold mb-4">Filtrar por</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                <input type="checkbox" className="rounded" />
                Em Estoque
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                <input type="checkbox" className="rounded" />
                Em Promoção
              </label>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Ordenar</h3>
            <select className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none">
              <option value="newest" className="bg-background">Mais Recentes</option>
              <option value="price_asc" className="bg-background">Menor Preço</option>
              <option value="price_desc" className="bg-background">Maior Preço</option>
            </select>
          </div>
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1">
          {products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-muted-foreground border border-dashed rounded-lg">
              Nenhum produto disponível nesta categoria no momento.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
