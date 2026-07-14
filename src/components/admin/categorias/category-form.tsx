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
import { CategoryProducts } from './category-products'

export interface CategoryFormData {
  id?: string
  name: string
  slug: string
  description: string
  thumbnail_url: string
  banner_desktop: string
  banner_mobile: string
  display_order: number
  show_on_home: boolean
  show_in_menu: boolean
  active: boolean
  sort_rule: string
  seo_title: string
  seo_description: string
  seo_canonical_url: string
  og_image: string
  twitter_image: string
}

interface CategoryFormProps {
  initialData?: CategoryFormData
  isEdit?: boolean
}

export function CategoryForm({ initialData, isEdit = false }: CategoryFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<CategoryFormData>({
    id: initialData?.id || '',
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    thumbnail_url: initialData?.thumbnail_url || '',
    banner_desktop: initialData?.banner_desktop || '',
    banner_mobile: initialData?.banner_mobile || '',
    display_order: initialData?.display_order || 0,
    show_on_home: initialData?.show_on_home || false,
    show_in_menu: initialData?.show_in_menu || false,
    active: initialData?.active !== undefined ? initialData.active : true,
    sort_rule: initialData?.sort_rule || 'manual',
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
    seo_canonical_url: initialData?.seo_canonical_url || '',
    og_image: initialData?.og_image || '',
    twitter_image: initialData?.twitter_image || '',
  })

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error('O nome da categoria é obrigatório.')
      return
    }

    if (!formData.slug) {
      toast.error('O slug da categoria é obrigatório.')
      return
    }

    setLoading(true)
    
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        thumbnail_url: formData.thumbnail_url,
        banner_desktop: formData.banner_desktop,
        banner_mobile: formData.banner_mobile,
        display_order: Number(formData.display_order),
        show_on_home: formData.show_on_home,
        show_in_menu: formData.show_in_menu,
        active: formData.active,
        sort_rule: formData.sort_rule,
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_canonical_url: formData.seo_canonical_url,
        og_image: formData.og_image,
        twitter_image: formData.twitter_image,
      }

      let error;
      if (isEdit) {
        const { error: updateError } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', formData.id)
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('categories')
          .insert([payload])
        error = insertError;
      }

      if (error) {
        throw new Error(error.message || 'Falha ao salvar categoria')
      }

      toast.success(`Categoria ${isEdit ? 'atualizada' : 'criada'} com sucesso!`)
      router.push(getAdminUrl('/categorias'))
      router.refresh()

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{isEdit ? 'Editar Categoria' : 'Nova Categoria'}</h2>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Categoria'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 lg:col-span-2 space-y-8">
          <Card>
            <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Vestuário" required />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Mídia</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Thumbnail URL</label>
                <Input name="thumbnail_url" value={formData.thumbnail_url} onChange={handleChange} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Banner Desktop URL</label>
                <Input name="banner_desktop" value={formData.banner_desktop} onChange={handleChange} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Banner Mobile URL</label>
                <Input name="banner_mobile" value={formData.banner_mobile} onChange={handleChange} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Organização e SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="active" 
                  checked={formData.active} 
                  onChange={(e) => handleCheckboxChange('active', e.target.checked)}
                />
                <label htmlFor="active" className="text-sm font-medium cursor-pointer">Ativo</label>
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input name="slug" value={formData.slug} onChange={handleChange} placeholder="ex: vestuario" required />
              </div>
              <div>
                <label className="text-sm font-medium">Ordem de Exibição (display_order)</label>
                <Input name="display_order" type="number" value={formData.display_order} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Regra de Ordenação Automática</label>
                <select
                  name="sort_rule"
                  value={formData.sort_rule}
                  onChange={handleSelectChange}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="manual" className="bg-background text-foreground">Manual (Drag & Drop)</option>
                  <option value="best_selling" className="bg-background text-foreground">Mais Vendidos</option>
                  <option value="newest" className="bg-background text-foreground">Mais Recentes</option>
                  <option value="price_asc" className="bg-background text-foreground">Menor Preço</option>
                  <option value="price_desc" className="bg-background text-foreground">Maior Preço</option>
                  <option value="name_asc" className="bg-background text-foreground">Nome (A-Z)</option>
                  <option value="name_desc" className="bg-background text-foreground">Nome (Z-A)</option>
                </select>
              </div>
              <div className="flex flex-col space-y-2 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show_on_home" 
                    checked={formData.show_on_home} 
                    onChange={(e) => handleCheckboxChange('show_on_home', e.target.checked)}
                  />
                  <label htmlFor="show_on_home" className="text-sm font-medium cursor-pointer">Mostrar na Home</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show_in_menu" 
                    checked={formData.show_in_menu} 
                    onChange={(e) => handleCheckboxChange('show_in_menu', e.target.checked)}
                  />
                  <label htmlFor="show_in_menu" className="text-sm font-medium cursor-pointer">Mostrar no Menu</label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>SEO Avançado</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Meta Title</label>
                <Input name="seo_title" value={formData.seo_title} onChange={handleChange} placeholder="Deixe em branco para usar o nome da categoria" />
              </div>
              <div>
                <label className="text-sm font-medium">Meta Description</label>
                <textarea
                  name="seo_description"
                  value={formData.seo_description}
                  onChange={handleChange}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Canonical URL</label>
                <Input name="seo_canonical_url" value={formData.seo_canonical_url} onChange={handleChange} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Open Graph Image (OG)</label>
                <Input name="og_image" value={formData.og_image} onChange={handleChange} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Twitter Image</label>
                <Input name="twitter_image" value={formData.twitter_image} onChange={handleChange} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {isEdit && formData.id && (
        <div className="pt-8">
          <CategoryProducts categoryId={formData.id} categoryName={formData.name} sortRule={formData.sort_rule} />
        </div>
      )}
    </form>
  )
}
