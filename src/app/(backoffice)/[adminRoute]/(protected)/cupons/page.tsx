import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { Badge } from '@/components/admin/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/admin/ui/button'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getAdminUrl } from '@/lib/admin-url'

export const dynamic = 'force-dynamic'

export default async function CouponsPage() {
  const supabase = await createClient()

  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const renderStatus = (coupon: any) => {
    const now = new Date()
    const endsAt = new Date(coupon.ends_at)
    
    if (!coupon.active) return <Badge variant="secondary">Inativo</Badge>
    if (endsAt < now) return <Badge variant="destructive">Expirado</Badge>
    if (coupon.max_uses && coupon.usage_count >= coupon.max_uses) return <Badge variant="destructive">Esgotado</Badge>
    return <Badge variant="success">Ativo</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Cupons de Desconto" 
          description="Crie e gerencie códigos promocionais."
        />
        <Link href={getAdminUrl('/cupons/novo')}>
          <Button>Criar Cupom</Button>
        </Link>
      </div>

      {coupons && coupons.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold text-primary tracking-wider">{c.code}</TableCell>
                  <TableCell>
                    {c.type === 'PERCENTAGE' ? `${c.value}%` : formatCurrency(c.value)}
                  </TableCell>
                  <TableCell>{renderStatus(c)}</TableCell>
                  <TableCell>
                    {c.usage_count} {c.max_uses ? `/ ${c.max_uses}` : ''}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(c.starts_at), "dd/MM/yyyy")} até<br/>
                    {format(new Date(c.ends_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={getAdminUrl(`/cupons/${c.id}`)}>
                      <Button variant="ghost" size="sm">Editar</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState 
          title="Nenhum cupom cadastrado"
          description="Crie promoções e atraia mais vendas."
        />
      )}
    </div>
  )
}
