import Link from 'next/link'

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    images: string[]
    category: string
    variants: any[]
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Pegar o menor preço dentre as variações
  const lowestPrice = product.variants?.length > 0 
    ? Math.min(...product.variants.map((v: any) => v.promotional_price || v.price))
    : 0

  // Verificar se há estoque em qualquer variação
  const inStock = product.variants?.some((v: any) => 
    v.inventory_levels?.some((il: any) => il.available > 0)
  )

  const image = product.images?.[0] || 'https://via.placeholder.com/400x500?text=Sem+Imagem'

  return (
    <Link href={`/produto/${product.id}`} className="group flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
        <img 
          src={image} 
          alt={product.name} 
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {!inStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
            <span className="bg-background text-foreground font-bold px-4 py-2 rounded-full text-sm">ESGOTADO</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{product.category}</div>
        <h3 className="font-medium text-foreground line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2">
          {lowestPrice > 0 ? (
            <span className="font-bold text-lg">{formatCurrency(lowestPrice)}</span>
          ) : (
            <span className="font-bold text-lg text-muted-foreground">Indisponível</span>
          )}
        </div>
      </div>
    </Link>
  )
}
