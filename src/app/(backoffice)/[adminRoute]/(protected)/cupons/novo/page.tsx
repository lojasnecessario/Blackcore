import { PageHeader } from '@/components/admin/data/page-header'
import { CouponForm } from '@/components/admin/cupons/coupon-form'

export default function NewCouponPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Novo Cupom" 
        description="Crie um novo código de desconto para a loja."
      />
      <CouponForm />
    </div>
  )
}
