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

export default async function HomeEditorPage() {
  const supabase = await createClient()

  const { data: blocks, error } = await supabase
    .from('home_blocks')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Erro ao buscar blocos da home:', error)
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Home Editor (CMS)" 
        description="Gerencie as seções da sua página inicial. Arraste e configure blocos dinâmicos, banners e coleções."
        actions={
          <div className="flex items-center gap-2">
            <Link href={getAdminUrl('/home-editor/novo')}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Bloco
              </Button>
            </Link>
          </div>
        }
      />

      {blocks && blocks.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordem</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Visibilidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.display_order}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase">{b.type}</Badge>
                </TableCell>
                <TableCell className="font-medium">{b.title || '-'}</TableCell>
                <TableCell>{b.visibility_condition}</TableCell>
                <TableCell>
                  {b.active ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                  {b.start_at && <Badge variant="outline" className="ml-2">Agendado</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={getAdminUrl(`/home-editor/${b.id}`)}>
                    <Button variant="ghost" size="sm">Editar</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState 
          title="Nenhum bloco encontrado"
          description="A sua página inicial está vazia. Adicione blocos como Banners, Coleções e Vitrines."
          action={
            <Link href={getAdminUrl('/home-editor/novo')}>
              <Button>Adicionar Bloco</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
