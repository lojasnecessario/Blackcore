'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/card'
import { getAdminUrl } from '@/lib/admin-url'

interface CouponFormProps {
  initialData?: any
}

export function CouponForm({ initialData }: CouponFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  // Default para datas de validade: inicia hoje, termina em 30 dias
  const today = new Date().toISOString().slice(0, 16)
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

  const [code, setCode] = useState(initialData?.code || '')
  const [type, setType] = useState(initialData?.type || 'PERCENTAGE')
  const [value, setValue] = useState<number | ''>(initialData?.value || '')
  const [minOrder, setMinOrder] = useState<number | ''>(initialData?.min_order_value || '')
  const [maxUses, setMaxUses] = useState<number | ''>(initialData?.max_uses || '')
  const [maxUsesUser, setMaxUsesUser] = useState<number | ''>(initialData?.max_uses_per_user || 1)
  const [startsAt, setStartsAt] = useState(initialData?.starts_at ? new Date(initialData.starts_at).toISOString().slice(0, 16) : today)
  const [endsAt, setEndsAt] = useState(initialData?.ends_at ? new Date(initialData.ends_at).toISOString().slice(0, 16) : nextMonth)
  const [active, setActive] = useState(initialData ? initialData.active : true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (code.includes(' ')) {
      toast.error('O código não pode conter espaços.')
      return
    }

    if (!value || Number(value) <= 0) {
      toast.error('Valor deve ser maior que zero.')
      return
    }

    if (new Date(startsAt) > new Date(endsAt)) {
      toast.error('A data de início não pode ser maior que o fim.')
      return
    }

    if (!active && initialData?.active) {
      if (!window.confirm('Tem certeza que deseja inativar este cupom? Clientes não poderão mais usá-lo.')) {
        return
      }
    }

    setLoading(true)
    const toastId = toast.loading('Salvando cupom...')

    try {
      const { data, error } = await supabase.rpc('admin_manage_coupon', {
        p_id: initialData?.id || null,
        p_code: code.trim().toUpperCase(),
        p_type: type,
        p_value: Number(value),
        p_min_order: minOrder ? Number(minOrder) : 0,
        p_max_uses: maxUses ? Number(maxUses) : null,
        p_max_uses_per_user: maxUsesUser ? Number(maxUsesUser) : 1,
        p_starts_at: new Date(startsAt).toISOString(),
        p_ends_at: new Date(endsAt).toISOString(),
        p_active: active
      })

      if (error) throw error

      toast.success('Cupom salvo com sucesso!', { id: toastId })
      router.push(getAdminUrl('/cupons'))
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar cupom', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Cupom' : 'Novo Cupom'}</CardTitle>
        <CardDescription>Defina regras de uso e limites para o código promocional.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código do Cupom</label>
              <Input 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} 
                placeholder="Ex: BLACK10" 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="PERCENTAGE" className="bg-background">Porcentagem (%)</option>
                <option value="FIXED" className="bg-background">Valor Fixo (R$)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor do Desconto</label>
              <Input 
                type="number" 
                step="0.01"
                min="0.1"
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder={type === 'PERCENTAGE' ? "Ex: 10" : "Ex: 50.00"} 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Mínimo do Pedido (R$)</label>
              <Input 
                type="number" 
                step="0.01"
                value={minOrder} 
                onChange={(e) => setMinOrder(e.target.value)} 
                placeholder="Ex: 150.00 (Opcional)" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Limite Total de Usos</label>
              <Input 
                type="number" 
                value={maxUses} 
                onChange={(e) => setMaxUses(e.target.value)} 
                placeholder="Ex: 100 (Opcional)" 
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para uso ilimitado.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Usos por Cliente</label>
              <Input 
                type="number" 
                min="1"
                value={maxUsesUser} 
                onChange={(e) => setMaxUsesUser(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Início</label>
              <Input 
                type="datetime-local" 
                value={startsAt} 
                onChange={(e) => setStartsAt(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fim</label>
              <Input 
                type="datetime-local" 
                value={endsAt} 
                onChange={(e) => setEndsAt(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <input 
              type="checkbox" 
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="active" className="text-sm font-medium">Cupom Ativo</label>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Cupom'}
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  )
}
