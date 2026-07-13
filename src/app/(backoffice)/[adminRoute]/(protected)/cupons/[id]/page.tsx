import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { notFound } from 'next/navigation'
import { CouponForm } from '@/components/admin/cupons/coupon-form'

export const dynamic = 'force-dynamic'

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !coupon) notFound()

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Editar Cupom: ${coupon.code}`} 
        description="Altere as configurações deste cupom promocional."
      />
      <CouponForm initialData={coupon} />
    </div>
  )
}
