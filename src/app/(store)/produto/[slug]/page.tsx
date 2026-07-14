import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProductAddToCart } from '@/components/store/product-add-to-cart'
import type { Metadata, ResolvingMetadata } from 'next'

export const dynamic = 'force-dynamic'

// SEO Dinâmico
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const supabase = await createClient()
  const { slug } = await params
  
  const { data: product } = await supabase
    .from('products')
    .select('name, seo_title, seo_description, images, seo_canonical_url, og_image, twitter_image')
    .eq('slug', slug)
    .single()

  if (!product) return { title: 'Produto não encontrado' }

  return {
    title: product.seo_title || `${product.name} | BlackCore`,
    description: product.seo_description || `Compre ${product.name} na BlackCore.`,
    alternates: {
      canonical: product.seo_canonical_url || undefined,
    },
    openGraph: {
      title: product.seo_title || `${product.name} | BlackCore`,
      description: product.seo_description || `Compre ${product.name} na BlackCore.`,
      images: [product.og_image || product.images?.[0] || ''],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.seo_title || `${product.name} | BlackCore`,
      description: product.seo_description || `Compre ${product.name} na BlackCore.`,
      images: [product.twitter_image || product.og_image || product.images?.[0] || ''],
    }
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, description, category, images, status,
      variants:product_variants (
        id, sku, price, promotional_price, attributes,
        inventory_levels (available)
      )
    `)
    .eq('slug', slug)
    .single()

  // Se não achar o produto, ou NÃO estiver ativo, 404
  if (!product || product.status !== 'ACTIVE') {
    notFound()
  }

  // Imagem principal fallback
  const mainImage = product.images?.[0] || 'https://via.placeholder.com/600x800?text=Sem+Imagem'

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
        
        {/* Coluna Esquerda: Galeria */}
        <div className="space-y-4">
          <div className="aspect-[4/5] bg-muted rounded-2xl overflow-hidden relative">
            <img 
              src={mainImage} 
              alt={product.name} 
              className="object-cover w-full h-full"
            />
          </div>
          {/* Thumbnails (Se houver mais de 1) */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img: string, i: number) => (
                <div key={i} className="aspect-square bg-muted rounded-md overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary transition-colors">
                  <img src={img} alt="" className="object-cover w-full h-full" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita: Detalhes, Variações e Compra */}
        <div className="flex flex-col pt-4">
          
          <div className="text-sm text-primary uppercase tracking-widest font-semibold mb-3">
            {product.category}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {product.name}
          </h1>

          <div className="mb-10 text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {product.description}
          </div>

          <div className="mt-auto">
            <ProductAddToCart product={product} />
          </div>

        </div>

      </div>
    </div>
  )
}
