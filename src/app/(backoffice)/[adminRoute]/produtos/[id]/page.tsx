import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/admin/produtos/product-form'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // Buscar Produto
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !product) {
    notFound()
  }

  // Buscar Variantes
  const { data: variantsData } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', id)

  // As variantes prontas para o formulário
  const variants = variantsData ? variantsData.map(v => ({
    id: v.id,
    sku: v.sku,
    price: v.price,
    compare_at_price: v.compare_at_price,
    weight: v.weight,
    attributes: v.attributes,
    add_stock: 0 // Inicia zerado para que o usuário decida se quer somar ou subtrair
  })) : []

  return (
    <div className="space-y-6">
      <ProductForm initialData={product} initialVariants={variants} isEdit={true} />
    </div>
  )
}
