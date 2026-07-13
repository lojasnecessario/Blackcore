import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/store/product-card'

export const dynamic = 'force-dynamic'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''

  // Busca por nome do produto
  let query = supabase
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

  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  const { data: products } = await query

  return (
    <div className="container mx-auto px-4 py-16 min-h-screen">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Resultados da Busca</h1>
        <p className="text-muted-foreground mt-2">
          {q ? `Mostrando resultados para "${q}"` : 'Mostrando todos os produtos'}
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            Nenhum produto encontrado para o termo pesquisado.<br/>
            Tente buscar com palavras-chave diferentes.
          </div>
        )}
      </div>
    </div>
  )
}

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
