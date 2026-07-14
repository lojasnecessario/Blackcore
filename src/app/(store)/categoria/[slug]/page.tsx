import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/store/product-card'
import { notFound } from 'next/navigation'
import type { Metadata, ResolvingMetadata } from 'next'

export const dynamic = 'force-static' // Will be ISR via revalidate
export const revalidate = 60 // ISR de 60 segundos para Categorias

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const supabase = await createClient()
  const { slug } = await params
  
  const { data: category } = await supabase
    .from('categories')
    .select('name, seo_title, seo_description, seo_canonical_url, og_image, twitter_image, banner_desktop')
    .ilike('slug', slug)
    .single()

  if (!category) return { title: 'Categoria não encontrada' }

  return {
    title: category.seo_title || `${category.name} | BlackCore`,
    description: category.seo_description || `Compre produtos da categoria ${category.name} na BlackCore.`,
    alternates: {
      canonical: category.seo_canonical_url || undefined,
    },
    openGraph: {
      title: category.seo_title || `${category.name} | BlackCore`,
      description: category.seo_description || `Compre produtos da categoria ${category.name} na BlackCore.`,
      images: [category.og_image || category.banner_desktop || ''],
    },
    twitter: {
      card: 'summary_large_image',
      title: category.seo_title || `${category.name} | BlackCore`,
      description: category.seo_description || `Compre produtos da categoria ${category.name} na BlackCore.`,
      images: [category.twitter_image || category.og_image || category.banner_desktop || ''],
    }
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug).toLowerCase()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .ilike('slug', slug)
    .eq('active', true)
    .single()

  if (!category) {
    // A categoria não existe ou está inativa
    // Mas se quiser apenas mostrar vazio, podemos continuar, mas idealmente é notFound.
    // O usuário preferiu "Pode exibir vazio, mas não 404, porque a categoria pode só estar sem produtos temporariamente", mas isso era quando checava produtos. 
    // Se a categoria em si não existe no banco, deveríamos dar 404. Mas manteremos a string do decodedSlug para fallback.
  }

  const categoryName = category?.name || decodedSlug

  const { data: products, error } = await supabase
    .rpc('get_category_products', { p_category_slug: decodedSlug })

  if (error) {
    console.error('Erro ao buscar produtos da categoria:', error)
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
