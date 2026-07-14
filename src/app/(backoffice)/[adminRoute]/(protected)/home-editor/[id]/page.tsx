import { createClient } from '@/lib/supabase/server'
import { BlockForm } from '@/components/admin/home-editor/block-form'
import { notFound } from 'next/navigation'

export default async function EditarBlocoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const { data: block } = await supabase
    .from('home_blocks')
    .select('*')
    .eq('id', id)
    .single()

  if (!block) {
    notFound()
  }

  // Tratamentos para datas para o input datetime-local
  if (block.start_at) {
    block.start_at = new Date(block.start_at).toISOString().slice(0, 16)
  }
  if (block.end_at) {
    block.end_at = new Date(block.end_at).toISOString().slice(0, 16)
  }

  return (
    <div className="space-y-6">
      <BlockForm initialData={block} isEdit={true} />
    </div>
  )
}
