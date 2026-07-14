'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/card'
import { ProductImages } from './product-images'
import { ProductVariants } from './product-variants'
import { getAdminUrl } from '@/lib/admin-url'
import { Checkbox } from '@/components/admin/ui/checkbox'

export interface ProductFormData {
  id?: string
  name: string
  description: string
  status: string
  category: string
  seo_title: string
  seo_description: string
  seo_canonical_url: string
  og_image: string
  twitter_image: string
  images: string[]
  featured: boolean
  best_seller: boolean
  new_arrival: boolean
  promotion: boolean
  published: boolean
  show_in_store: boolean
  show_in_search: boolean
  priority: number
  display_order: number
  is_category_featured: boolean
  pinned: boolean
  pin_order: number
}

interface ProductFormProps {
  initialData?: ProductFormData
  initialVariants?: any[]
  isEdit?: boolean
}

export function ProductForm({ initialData, initialVariants = [], isEdit = false }: ProductFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<ProductFormData>({
    id: initialData?.id || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'DRAFT',
    category: initialData?.category || '',
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
    seo_canonical_url: initialData?.seo_canonical_url || '',
    og_image: initialData?.og_image || '',
    twitter_image: initialData?.twitter_image || '',
    images: initialData?.images || [],
    featured: initialData?.featured || false,
    best_seller: initialData?.best_seller || false,
    new_arrival: initialData?.new_arrival || false,
    promotion: initialData?.promotion || false,
    published: initialData?.published !== undefined ? initialData.published : true,
    show_in_store: initialData?.show_in_store !== undefined ? initialData.show_in_store : true,
    show_in_search: initialData?.show_in_search !== undefined ? initialData.show_in_search : true,
    priority: initialData?.priority || 0,
    display_order: initialData?.display_order || 0,
    is_category_featured: initialData?.is_category_featured || false,
    pinned: initialData?.pinned || false,
    pin_order: initialData?.pin_order || 0
  })

  const handleCheckboxChange = (name: keyof ProductFormData, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const [variants, setVariants] = useState<any[]>(initialVariants)
  const [variantsToDelete, setVariantsToDelete] = useState<string[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error('O nome do produto é obrigatório.')
      return
    }

    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Não autenticado')

      const payload = {
        action: isEdit ? 'UPDATE' : 'CREATE',
        product_id: isEdit ? formData.id : undefined,
        variantsToDelete: variantsToDelete,
        product: {
          name: formData.name,
          description: formData.description,
          status: formData.status,
          category: formData.category,
          seo_title: formData.seo_title,
          seo_description: formData.seo_description,
          seo_canonical_url: formData.seo_canonical_url,
          og_image: formData.og_image,
          twitter_image: formData.twitter_image,
          images: formData.images,
          featured: formData.featured,
          best_seller: formData.best_seller,
          new_arrival: formData.new_arrival,
          promotion: formData.promotion,
          published: formData.published,
          show_in_store: formData.show_in_store,
          show_in_search: formData.show_in_search,
          priority: Number(formData.priority),
          display_order: Number(formData.display_order),
          is_category_featured: formData.is_category_featured,
          pinned: formData.pinned,
          pin_order: Number(formData.pin_order)
        },
        variants: variants
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-products-crud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Falha ao salvar produto')
      }

      toast.success(`Produto ${isEdit ? 'atualizado' : 'criado'} com sucesso!`)
      router.push(getAdminUrl('/produtos'))
      router.refresh()

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Tem certeza que deseja arquivar este produto?')) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-products-crud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ action: 'ARCHIVE', product_id: formData.id })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error?.message)
      
      toast.success('Produto arquivado.')
      router.push(getAdminUrl('/produtos'))
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{isEdit ? 'Editar Produto' : 'Novo Produto'}</h2>
        <div className="flex gap-2">
          {isEdit && (
            <Button type="button" variant="destructive" onClick={handleArchive} disabled={loading}>
              Arquivar
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Produto'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 lg:col-span-2 space-y-8">
          {/* Informações Básicas */}
          <Card>
            <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Produto</label>
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Camiseta BlackCore" required />
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

          {/* Variações */}
          <Card>
            <CardHeader><CardTitle>Preços, Estoque e Variações</CardTitle></CardHeader>
            <CardContent>
              <ProductVariants variants={variants} setVariants={setVariants} isEdit={isEdit} variantsToDelete={variantsToDelete} setVariantsToDelete={setVariantsToDelete} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Status e Categoria */}
          <Card>
            <CardHeader><CardTitle>Organização</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="DRAFT" className="bg-background text-foreground">Rascunho</option>
                  <option value="ACTIVE" className="bg-background text-foreground">Ativo</option>
                  <option value="ARCHIVED" className="bg-background text-foreground">Arquivado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Input name="category" value={formData.category} onChange={handleChange} placeholder="Ex: Vestuário" />
              </div>
            </CardContent>
          </Card>

          {/* Imagens */}
          <Card>
            <CardHeader><CardTitle>Imagens</CardTitle></CardHeader>
            <CardContent>
              <ProductImages 
                images={formData.images} 
                onChange={(images) => setFormData({ ...formData, images })} 
              />
            </CardContent>
          </Card>
          
          {/* SEO */}
          <Card>
            <CardHeader><CardTitle>SEO (Opcional)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título da Página</label>
                <Input name="seo_title" value={formData.seo_title} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Meta Description</label>
                <textarea
                  name="seo_description"
                  value={formData.seo_description}
                  onChange={handleChange}
                  className="flex h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

          {/* Merchandising */}
          <Card>
            <CardHeader><CardTitle>Merchandising e Visibilidade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 pb-2 border-b">
                <div className="flex items-center space-x-2">
                  <Checkbox id="published" checked={formData.published} onChange={(e) => handleCheckboxChange('published', e.target.checked)} />
                  <label htmlFor="published" className="text-sm font-medium cursor-pointer">Publicado</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="show_in_store" checked={formData.show_in_store} onChange={(e) => handleCheckboxChange('show_in_store', e.target.checked)} />
                  <label htmlFor="show_in_store" className="text-sm font-medium cursor-pointer">Mostrar na Loja (Storefront)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="show_in_search" checked={formData.show_in_search} onChange={(e) => handleCheckboxChange('show_in_search', e.target.checked)} />
                  <label htmlFor="show_in_search" className="text-sm font-medium cursor-pointer">Aparecer nas Buscas</label>
                </div>
              </div>
              <div className="space-y-2 pb-2 border-b">
                <div className="flex items-center space-x-2">
                  <Checkbox id="featured" checked={formData.featured} onChange={(e) => handleCheckboxChange('featured', e.target.checked)} />
                  <label htmlFor="featured" className="text-sm font-medium cursor-pointer">Destaque na Home</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="best_seller" checked={formData.best_seller} onChange={(e) => handleCheckboxChange('best_seller', e.target.checked)} />
                  <label htmlFor="best_seller" className="text-sm font-medium cursor-pointer">Mais Vendido</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="new_arrival" checked={formData.new_arrival} onChange={(e) => handleCheckboxChange('new_arrival', e.target.checked)} />
                  <label htmlFor="new_arrival" className="text-sm font-medium cursor-pointer">Lançamento (Novidade)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="promotion" checked={formData.promotion} onChange={(e) => handleCheckboxChange('promotion', e.target.checked)} />
                  <label htmlFor="promotion" className="text-sm font-medium cursor-pointer">Em Promoção</label>
                </div>
              </div>
              <div className="space-y-2 pb-2 border-b">
                <div className="flex items-center space-x-2">
                  <Checkbox id="is_category_featured" checked={formData.is_category_featured} onChange={(e) => handleCheckboxChange('is_category_featured', e.target.checked)} />
                  <label htmlFor="is_category_featured" className="text-sm font-medium cursor-pointer">Destaque na Categoria</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="pinned" checked={formData.pinned} onChange={(e) => handleCheckboxChange('pinned', e.target.checked)} />
                  <label htmlFor="pinned" className="text-sm font-medium cursor-pointer">Fixar no Topo da Categoria (Pinned)</label>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium">Ordem de Exibição Global</label>
                  <Input name="display_order" type="number" value={formData.display_order} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-sm font-medium">Ordem do Pinned (pin_order)</label>
                  <Input name="pin_order" type="number" value={formData.pin_order} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-sm font-medium">Prioridade de Busca</label>
                  <Input name="priority" type="number" value={formData.priority} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
