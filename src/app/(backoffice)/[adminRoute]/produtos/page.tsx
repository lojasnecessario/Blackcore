import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/data/page-header'
import { Button } from '@/components/admin/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { Badge } from '@/components/admin/ui/badge'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { getAdminUrl } from '@/lib/admin-url'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await searchParams;
  const search = resolvedParams?.search || ''
  const status = resolvedParams?.status || ''

  let query = supabase
    .from('products')
    .select('*, product_variants(price, sku), inventory_levels(available)')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data: products, error } = await query

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'ACTIVE': return <Badge variant="success">Ativo</Badge>
      case 'DRAFT': return <Badge variant="secondary">Rascunho</Badge>
      case 'ARCHIVED': return <Badge variant="destructive">Arquivado</Badge>
      default: return <Badge variant="outline">{statusStr}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Produtos" 
        description="Gerencie o catálogo, preços e imagens da sua loja."
        actions={
          <Link href={getAdminUrl('/produtos/novo')}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </Link>
        }
      />

      {/* Placeholder para Filtros futuramente */}

      {products && products.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preço Inicial</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const basePrice = p.product_variants?.[0]?.price || 0;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-md object-cover bg-muted" />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">Sem img</div>
                      )}
                      <span>{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{p.category || '-'}</TableCell>
                  <TableCell>{getStatusBadge(p.status)}</TableCell>
                  <TableCell>{formatCurrency(basePrice)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={getAdminUrl(`/produtos/${p.id}`)}>
                      <Button variant="ghost" size="sm">Editar</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState 
          title="Nenhum produto encontrado"
          description={search ? "Tente buscar com outros termos." : "Seu catálogo está vazio. Adicione o seu primeiro produto para começar a vender."}
          action={
            <Link href={getAdminUrl('/produtos/novo')}>
              <Button>Adicionar Produto</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
