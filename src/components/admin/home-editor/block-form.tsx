'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/card'
import { getAdminUrl } from '@/lib/admin-url'
import { Checkbox } from '@/components/admin/ui/checkbox'

export interface HomeBlockFormData {
  id?: string
  type: string
  title: string
  subtitle: string
  button_text: string
  button_link: string
  image: string
  limit_products: number | ''
  display_order: number
  active: boolean
  visibility_condition: string
  start_at: string
  end_at: string
  query: string
}

export function BlockForm({ initialData, isEdit = false }: { initialData?: HomeBlockFormData, isEdit?: boolean }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<HomeBlockFormData>({
    id: initialData?.id || '',
    type: initialData?.type || 'hero',
    title: initialData?.title || '',
    subtitle: initialData?.subtitle || '',
    button_text: initialData?.button_text || '',
    button_link: initialData?.button_link || '',
    image: initialData?.image || '',
    limit_products: initialData?.limit_products ?? '',
    display_order: initialData?.display_order || 0,
    active: initialData?.active ?? true,
    visibility_condition: initialData?.visibility_condition || 'both',
    start_at: initialData?.start_at || '',
    end_at: initialData?.end_at || '',
    query: initialData?.query || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const payload = {
        type: formData.type,
        title: formData.title,
        subtitle: formData.subtitle,
        button_text: formData.button_text,
        button_link: formData.button_link,
        image: formData.image,
        limit_products: formData.limit_products === '' ? null : Number(formData.limit_products),
        display_order: Number(formData.display_order),
        active: formData.active,
        visibility_condition: formData.visibility_condition,
        start_at: formData.start_at || null,
        end_at: formData.end_at || null,
        query: formData.query,
      }

      let error;
      if (isEdit) {
        const { error: updateError } = await supabase
          .from('home_blocks')
          .update(payload)
          .eq('id', formData.id)
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('home_blocks')
          .insert([payload])
        error = insertError;
      }

      if (error) throw new Error(error.message)

      toast.success(`Bloco ${isEdit ? 'atualizado' : 'criado'} com sucesso!`)
      router.push(getAdminUrl('/home-editor'))
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Deseja realmente excluir este bloco?')) return
    setLoading(true)
    try {
      const { error } = await supabase.from('home_blocks').delete().eq('id', formData.id)
      if (error) throw error
      toast.success('Bloco excluído.')
      router.push(getAdminUrl('/home-editor'))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{isEdit ? 'Editar Bloco da Home' : 'Novo Bloco da Home'}</h2>
        <div className="flex gap-2">
          {isEdit && (
             <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>Excluir</Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Bloco'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 lg:col-span-2 space-y-8">
          <Card>
            <CardHeader><CardTitle>Conteúdo do Bloco</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tipo do Bloco</label>
                <select name="type" value={formData.type} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none">
                  <option value="hero" className="bg-background">Hero (Banner Principal)</option>
                  <option value="announcement" className="bg-background">Barra de Anúncio</option>
                  <option value="categories_showcase" className="bg-background">Vitrine de Categorias</option>
                  <option value="collections" className="bg-background">Coleção / Produtos</option>
                  <option value="banner" className="bg-background">Banner Promocional</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input name="title" value={formData.title} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Subtítulo</label>
                <Input name="subtitle" value={formData.subtitle} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Texto do Botão</label>
                  <Input name="button_text" value={formData.button_text} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-sm font-medium">Link do Botão</label>
                  <Input name="button_link" value={formData.button_link} onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">URL da Imagem</label>
                <Input name="image" value={formData.image} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Query (Para Smart Collections)</label>
                <Input name="query" value={formData.query} onChange={handleChange} placeholder="Ex: brand = 'Logitech' AND promotion = true" />
                <p className="text-xs text-muted-foreground mt-1">Utilizado apenas para tipos como "collections" para filtrar produtos magicamente.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Configurações e Visibilidade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="active" checked={formData.active} onChange={(e) => handleCheckboxChange('active', e.target.checked)} />
                <label htmlFor="active" className="text-sm font-medium cursor-pointer">Ativo</label>
              </div>
              <div>
                <label className="text-sm font-medium">Dispositivos</label>
                <select name="visibility_condition" value={formData.visibility_condition} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none">
                  <option value="both" className="bg-background">Ambos (Desktop e Mobile)</option>
                  <option value="desktop" className="bg-background">Somente Desktop</option>
                  <option value="mobile" className="bg-background">Somente Mobile</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Ordem de Exibição (display_order)</label>
                <Input name="display_order" type="number" value={formData.display_order} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Limite de Produtos (Para vitrines)</label>
                <Input name="limit_products" type="number" value={formData.limit_products} onChange={handleChange} placeholder="Deixe em branco para o padrão" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Agendamento (Opcional)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Início (Start At)</label>
                <Input name="start_at" type="datetime-local" value={formData.start_at} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Fim (End At)</label>
                <Input name="end_at" type="datetime-local" value={formData.end_at} onChange={handleChange} />
              </div>
              <p className="text-xs text-muted-foreground">O bloco só aparecerá no storefront entre essas datas. Ideal para Black Friday, Natal etc.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
