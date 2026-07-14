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

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await searchParams;
  const search = resolvedParams?.search || ''
  const status = resolvedParams?.status || ''

  let query = supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (status === 'active') {
    query = query.eq('active', true)
  } else if (status === 'inactive') {
    query = query.eq('active', false)
  }

  const { data: categories, error } = await query
  
  if (error) {
    console.error('Erro ao buscar categorias:', error)
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Categorias" 
        description="Gerencie as categorias, imagens e a ordem de exibição na loja."
        actions={
          <div className="flex items-center gap-2">
            <Link href={getAdminUrl('/categorias/novo')}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Categoria
              </Button>
            </Link>
          </div>
        }
      />

      {categories && categories.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.name} className="h-10 w-10 rounded-md object-cover bg-muted" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">Sem img</div>
                    )}
                    <span>{c.name}</span>
                  </div>
                </TableCell>
                <TableCell>{c.slug}</TableCell>
                <TableCell>
                  {c.active ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell>{c.display_order}</TableCell>
                <TableCell className="text-right">
                  <Link href={getAdminUrl(`/categorias/${c.id}`)}>
                    <Button variant="ghost" size="sm">Editar</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState 
          title="Nenhuma categoria encontrada"
          description={search ? "Tente buscar com outros termos." : "Seu catálogo está vazio. Adicione sua primeira categoria."}
          action={
            <Link href={getAdminUrl('/categorias/novo')}>
              <Button>Adicionar Categoria</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
