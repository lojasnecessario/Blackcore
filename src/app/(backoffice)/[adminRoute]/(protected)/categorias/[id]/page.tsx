import { createClient } from '@/lib/supabase/server'
import { CategoryForm } from '@/components/admin/categorias/category-form'
import { notFound } from 'next/navigation'

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (!category) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <CategoryForm initialData={category} isEdit={true} />
    </div>
  )
}
