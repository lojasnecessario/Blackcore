import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { SearchBar } from '@/components/admin/data/search-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { Badge } from '@/components/admin/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/admin/ui/button'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { getAdminUrl } from '@/lib/admin-url'

export const dynamic = 'force-dynamic'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; low_stock?: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await searchParams
  const search = resolvedParams?.search || ''
  const lowStockOnly = resolvedParams?.low_stock === 'true'

  // Fetch variants + product details + inventory
  let query = supabase
    .from('product_variants')
    .select('*, product:products(*), inventory_levels(*)')
  
  if (search) {
    // Para busca simples, o ideal seria buscar no produto. Como a API do Supabase tem limitações com ilike em tabelas joinadas quando não é 1-1, vamos trazer e filtrar no JS se for muito complexo, ou filtrar pelo SKU direto
    query = query.ilike('sku', `%${search}%`)
  }

  const { data: variants, error } = await query

  let filteredVariants = variants || []

  // Filtro adicional em memória para o nome do produto (já que a busca via SDK no join pode ser tricky)
  if (search && variants) {
    filteredVariants = variants.filter(v => 
      v.sku.toLowerCase().includes(search.toLowerCase()) || 
      (v.product && v.product.name.toLowerCase().includes(search.toLowerCase()))
    )
  }

  if (lowStockOnly) {
    filteredVariants = filteredVariants.filter(v => 
      (v.inventory_levels?.[0]?.available || 0) <= 5
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Controle de Estoque" 
        description="Gerencie as quantidades disponíveis e registre movimentações de entrada ou saída."
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchBar />
        <Link href={getAdminUrl(`/estoque${lowStockOnly ? '' : '?low_stock=true'}`)}>
          <Button variant={lowStockOnly ? 'default' : 'outline'}>
            Apenas Estoque Baixo (≤ 5)
          </Button>
        </Link>
      </div>

      {filteredVariants.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU / Variação</TableHead>
              <TableHead className="text-right">Estoque Disponível</TableHead>
              <TableHead className="text-right">Reservado (Pedidos)</TableHead>
              <TableHead className="text-right">Total Físico</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVariants.map((v) => {
              const available = v.inventory_levels?.[0]?.available || 0
              const reserved = v.inventory_levels?.[0]?.reserved || 0
              const total = available + reserved
              const isLowStock = available <= 5

              return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {v.product?.images?.[0] ? (
                        <img src={v.product.images[0]} alt="" className="h-10 w-10 rounded object-cover bg-muted" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs">Sem img</div>
                      )}
                      <div>
                        <div>{v.product?.name}</div>
                        {v.product?.status === 'ARCHIVED' && <Badge variant="destructive" className="mt-1">Arquivado</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">{v.sku}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(' | ')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${isLowStock ? 'text-destructive' : 'text-success'}`}>
                      {available}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{reserved}</TableCell>
                  <TableCell className="text-right">{total}</TableCell>
                  <TableCell className="text-right">
                    <Link href={getAdminUrl(`/estoque/${v.id}`)}>
                      <Button variant="ghost" size="sm">Ajustar / Histórico</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState 
          title="Nenhuma variação encontrada"
          description="Ajuste seus filtros ou adicione produtos novos ao catálogo."
        />
      )}
    </div>
  )
}
