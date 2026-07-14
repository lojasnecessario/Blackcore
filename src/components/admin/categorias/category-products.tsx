'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/card'
import { Button } from '@/components/admin/ui/button'
import { GripVertical } from 'lucide-react'

export function CategoryProducts({ categoryId, categoryName, sortRule }: { categoryId: string, categoryName: string, sortRule: string }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, display_order, images')
        .or(`category_id.eq.${categoryId},category.ilike.${categoryName}`)
        .order('display_order', { ascending: true })
      
      if (!error && data) {
        setProducts(data)
      }
      setLoading(false)
    }
    fetchProducts()
  }, [categoryId, categoryName, supabase])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('dragIndex', index.toString())
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndexStr = e.dataTransfer.getData('dragIndex')
    if (!dragIndexStr) return
    const dragIndex = parseInt(dragIndexStr, 10)
    
    if (dragIndex === dropIndex) return

    const newProducts = [...products]
    const [draggedItem] = newProducts.splice(dragIndex, 1)
    newProducts.splice(dropIndex, 0, draggedItem)

    // Atualiza o display_order
    const reordered = newProducts.map((p, idx) => ({
      ...p,
      display_order: idx + 1
    }))

    setProducts(reordered)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const saveOrder = async () => {
    setSaving(true)
    try {
      // Supabase não suporta upsert massivo facilmente sem conflitos se não chavear direito,
      // mas podemos fazer updates individuais ou rpc. Vamos fazer Promise.all.
      const updates = products.map((p) => 
        supabase.from('products').update({ display_order: p.display_order }).eq('id', p.id)
      )
      await Promise.all(updates)
      toast.success('Ordem salva com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar ordem')
    } finally {
      setSaving(false)
    }
  }

  if (sortRule !== 'manual') {
    return (
      <Card>
        <CardHeader><CardTitle>Ordenação de Produtos</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Esta categoria está configurada para ordenação automática ({sortRule}). Para reordenar os produtos manualmente, altere a regra de ordenação para "Manual".</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ordenação de Produtos (Manual)</CardTitle>
        <Button onClick={saveOrder} disabled={saving || loading} variant="outline">
          {saving ? 'Salvando...' : 'Salvar Ordem'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando produtos...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>
        ) : (
          <div className="space-y-2">
            {products.map((p, index) => (
              <div 
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragOver={handleDragOver}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border border-transparent hover:border-border cursor-grab active:cursor-grabbing transition-colors"
              >
                <GripVertical className="text-muted-foreground h-5 w-5" />
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0]} alt={p.name} className="h-10 w-10 object-cover rounded" />
                ) : (
                  <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs">Sem img</div>
                )}
                <span className="font-medium text-sm flex-1">{p.name}</span>
                <span className="text-xs text-muted-foreground">Ordem: {p.display_order}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
