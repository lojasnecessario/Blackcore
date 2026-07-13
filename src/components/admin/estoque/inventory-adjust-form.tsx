'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/card'

interface InventoryAdjustFormProps {
  variantId: string
  currentAvailable: number
  productName?: string
  sku: string
}

export function InventoryAdjustForm({ variantId, currentAvailable, productName, sku }: InventoryAdjustFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const [type, setType] = useState<'IN' | 'OUT'>('IN')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [reason, setReason] = useState('Compra de Fornecedor')
  const [notes, setNotes] = useState('')

  const handleTypeChange = (newType: 'IN' | 'OUT') => {
    setType(newType)
    if (newType === 'IN') {
      setReason('Compra de Fornecedor')
    } else {
      setReason('Venda Física')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!quantity || quantity <= 0) {
      toast.error('A quantidade deve ser maior que zero.')
      return
    }

    if (type === 'OUT' && quantity > currentAvailable) {
      toast.error(`Quantidade de saída (${quantity}) maior que o disponível (${currentAvailable}).`)
      return
    }

    if (!reason.trim()) {
      toast.error('Motivo é obrigatório.')
      return
    }

    if (type === 'OUT') {
      if (!window.confirm(`Tem certeza que deseja dar saída de ${quantity} itens do SKU ${sku}?`)) {
        return
      }
    }

    setLoading(true)
    const toastId = toast.loading('Processando ajuste...')

    try {
      const qtyChange = type === 'IN' ? quantity : -quantity

      // Chamada da RPC segura
      const { data, error } = await supabase.rpc('adjust_inventory', {
        p_variant_id: variantId,
        p_quantity_change: qtyChange,
        p_reason: reason,
        p_notes: notes || null
      })

      if (error) throw error

      toast.success(`Estoque ajustado! Novo saldo: ${data.new_available}`, { id: toastId })
      
      // Reset form
      setQuantity('')
      setNotes('')
      
      router.refresh()

    } catch (error: any) {
      toast.error(error.message || 'Falha ao ajustar estoque.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-primary/50 shadow-md">
      <CardHeader className="bg-muted/30">
        <CardTitle>Nova Movimentação</CardTitle>
        <CardDescription>Ajuste manual com registro de auditoria.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex rounded-md border p-1 bg-muted">
            <button
              type="button"
              onClick={() => handleTypeChange('IN')}
              className={`flex-1 rounded py-2 text-sm font-medium transition-colors ${type === 'IN' ? 'bg-success text-success-foreground shadow' : 'hover:bg-background/50'}`}
            >
              Entrada (+)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('OUT')}
              className={`flex-1 rounded py-2 text-sm font-medium transition-colors ${type === 'OUT' ? 'bg-destructive text-destructive-foreground shadow' : 'hover:bg-background/50'}`}
            >
              Saída (-)
            </button>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Quantidade</label>
            <Input 
              type="number" 
              min="1"
              value={quantity} 
              onChange={(e) => setQuantity(parseInt(e.target.value) || '')} 
              placeholder="Ex: 10" 
              required 
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Motivo Obrigatório</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              {type === 'IN' ? (
                <>
                  <option value="Compra de Fornecedor" className="bg-background">Compra de Fornecedor</option>
                  <option value="Devolução de Cliente" className="bg-background">Devolução de Cliente</option>
                  <option value="Ajuste de Inventário" className="bg-background">Ajuste de Inventário (+)</option>
                  <option value="Outros" className="bg-background">Outros</option>
                </>
              ) : (
                <>
                  <option value="Venda Física" className="bg-background">Venda Física</option>
                  <option value="Produto Danificado" className="bg-background">Produto Danificado / Avaria</option>
                  <option value="Perda/Roubo" className="bg-background">Perda / Roubo</option>
                  <option value="Ajuste de Inventário" className="bg-background">Ajuste de Inventário (-)</option>
                  <option value="Brinde/Promoção" className="bg-background">Brinde / Promoção</option>
                  <option value="Outros" className="bg-background">Outros</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Observação (Opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: NF-e 1234, Devolução do pedido #899..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button type="submit" className="w-full" variant={type === 'IN' ? 'default' : 'destructive'} disabled={loading}>
            {loading ? 'Registrando...' : `Confirmar ${type === 'IN' ? 'Entrada' : 'Saída'}`}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}
