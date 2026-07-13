import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/card'
import { Badge } from '@/components/admin/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { InventoryAdjustForm } from '@/components/admin/estoque/inventory-adjust-form'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function InventoryVariantPage({
  params,
}: {
  params: Promise<{ variant_id: string }>
}) {
  const supabase = await createClient()
  const { variant_id } = await params

  const { data: variant, error } = await supabase
    .from('product_variants')
    .select('*, product:products(*), inventory_levels(*)')
    .eq('id', variant_id)
    .single()

  if (error || !variant) notFound()

  // Fetch movements with user info if possible (depends on profiles join)
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('*, user:profiles(full_name)')
    .eq('variant_id', variant_id)
    .order('created_at', { ascending: false })

  const available = variant.inventory_levels?.[0]?.available || 0
  const reserved = variant.inventory_levels?.[0]?.reserved || 0

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Ajuste de Estoque: ${variant.sku}`} 
        description={`Produto: ${variant.product?.name}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário de Ajuste */}
        <div className="col-span-1 lg:col-span-1">
          <InventoryAdjustForm 
            variantId={variant.id} 
            currentAvailable={available} 
            productName={variant.product?.name}
            sku={variant.sku}
          />
        </div>

        {/* Histórico e Detalhes */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saldo Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted rounded-md p-4">
                  <div className="text-sm text-muted-foreground mb-1">Disponível</div>
                  <div className={`text-3xl font-bold ${available <= 5 ? 'text-destructive' : 'text-success'}`}>{available}</div>
                </div>
                <div className="bg-muted rounded-md p-4">
                  <div className="text-sm text-muted-foreground mb-1">Reservado</div>
                  <div className="text-3xl font-bold">{reserved}</div>
                </div>
                <div className="bg-muted rounded-md p-4 border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-1">Total Físico</div>
                  <div className="text-3xl font-bold">{available + reserved}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico Imutável de Movimentações</CardTitle>
              <CardDescription>O histórico não pode ser alterado ou deletado por razões de auditoria.</CardDescription>
            </CardHeader>
            <CardContent>
              {movements && movements.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Usuário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {mov.type === 'IN' ? (
                              <Badge variant="success">ENTRADA</Badge>
                            ) : (
                              <Badge variant="destructive">SAÍDA</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-bold">
                            {mov.type === 'IN' ? '+' : '-'}{mov.quantity}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{mov.reason || 'N/A'}</div>
                            {mov.notes && <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={mov.notes}>{mov.notes}</div>}
                          </TableCell>
                          <TableCell className="text-sm">
                            {mov.user?.full_name || 'Sistema'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhuma movimentação registrada.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
