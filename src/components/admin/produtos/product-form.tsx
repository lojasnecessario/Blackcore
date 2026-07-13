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

export interface ProductFormData {
  id?: string
  name: string
  description: string
  status: string
  category: string
  seo_title: string
  seo_description: string
  images: string[]
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
    images: initialData?.images || []
  })

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
          images: formData.images
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
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
