'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/card'
import { Input } from '@/components/admin/ui/input'

interface OrderActionsProps {
  orderId: string
  currentStatus: string
  trackingCode?: string
  trackingUrl?: string
  carrier?: string
  internalNotes?: string
}

export function OrderActions({ 
  orderId, 
  currentStatus, 
  trackingCode = '', 
  trackingUrl = '', 
  carrier = '',
  internalNotes = ''
}: OrderActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [tCode, setTCode] = useState(trackingCode || '')
  const [tUrl, setTUrl] = useState(trackingUrl || '')
  const [tCarrier, setTCarrier] = useState(carrier || '')
  const [notes, setNotes] = useState(internalNotes || '')

  const callRpc = async (action: string, overrideParams?: any) => {
    const toastId = toast.loading('Processando...')
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('admin_update_order', {
        p_order_id: orderId,
        p_action: action,
        p_tracking_code: tCode || null,
        p_tracking_url: tUrl || null,
        p_carrier: tCarrier || null,
        p_internal_notes: notes || null,
        ...overrideParams
      })

      if (error) throw error

      toast.success('Pedido atualizado com sucesso!', { id: toastId })
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar a ação', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = () => {
    if (!window.confirm('Marcar este pedido como Em Separação?')) return
    callRpc('PROCESSING', { p_event_notes: 'Marcado como em separação.' })
  }

  const handleShip = () => {
    if (!tCode) {
      if (!window.confirm('Você não informou o código de rastreio. Deseja enviar mesmo assim?')) return
    }
    callRpc('SHIP', { p_event_notes: 'Marcado como enviado pelo painel.' })
  }

  const handleDeliver = () => {
    if (!window.confirm('Confirmar que o pacote foi entregue ao cliente?')) return
    callRpc('DELIVER', { p_event_notes: 'Marcado como entregue pelo painel.' })
  }

  const handleCancel = () => {
    if (currentStatus === 'PAID' || currentStatus === 'PROCESSING') {
      if (!window.confirm('ATENÇÃO: Esta ação devolve o estoque localmente, porém NÃO realiza estorno financeiro. O reembolso deve ser realizado diretamente no painel do Vega Checkout. Deseja continuar?')) {
        return
      }
    }
    const reason = window.prompt('Qual o motivo do cancelamento? (obrigatório)')
    if (!reason) {
      toast.info('Cancelamento abortado.')
      return
    }
    callRpc('CANCEL', { p_event_notes: reason })
  }

  const handleUpdateInfo = () => {
    callRpc('UPDATE_INFO', { p_event_notes: 'Informações de rastreio/notas atualizadas.' })
  }

  const isCompleted = currentStatus === 'DELIVERED' || currentStatus === 'CANCELED' || currentStatus === 'REFUNDED'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rastreio & Logística</CardTitle>
          <CardDescription>Insira os dados da transportadora</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Transportadora</label>
            <Input value={tCarrier} onChange={(e) => setTCarrier(e.target.value)} placeholder="Ex: Correios, Jadlog..." disabled={isCompleted} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Código de Rastreio</label>
            <Input value={tCode} onChange={(e) => setTCode(e.target.value)} placeholder="Ex: BR123456789" disabled={isCompleted} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">URL de Rastreio (Opcional)</label>
            <Input value={tUrl} onChange={(e) => setTUrl(e.target.value)} placeholder="https://..." disabled={isCompleted} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações Internas</CardTitle>
          <CardDescription>Visível apenas para a equipe</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ex: Cliente ligou solicitando urgência..."
          />
          <Button variant="outline" className="mt-4 w-full" onClick={handleUpdateInfo} disabled={loading}>
            Salvar Informações
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle>Ações do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentStatus === 'PAID' && (
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={handleProcess} disabled={loading}>
              Marcar como Em Separação
            </Button>
          )}

          {(currentStatus === 'PAID' || currentStatus === 'PROCESSING') && (
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleShip} disabled={loading}>
              Marcar como Enviado
            </Button>
          )}

          {currentStatus === 'SHIPPED' && (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleDeliver} disabled={loading}>
              Marcar como Entregue
            </Button>
          )}

          {!isCompleted && currentStatus !== 'SHIPPED' && (
            <Button variant="destructive" className="w-full" onClick={handleCancel} disabled={loading}>
              Cancelar Pedido
            </Button>
          )}

          {(isCompleted || currentStatus === 'SHIPPED') && (
            <div className="text-sm text-center text-muted-foreground p-2 border border-dashed rounded bg-muted/30">
              {currentStatus === 'SHIPPED' ? 'O pedido já foi enviado e não pode ser cancelado.' : 'O pedido atingiu um estado final.'}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
