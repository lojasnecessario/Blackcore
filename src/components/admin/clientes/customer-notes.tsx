'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { format } from 'date-fns'

interface Note {
  id: string
  note: string
  created_at: string
  updated_at: string
}

interface CustomerNotesProps {
  customerId: string
  initialNotes: Note[]
}

export function CustomerNotes({ customerId, initialNotes }: CustomerNotesProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const handleCreate = async () => {
    if (!newNote.trim()) return
    setLoading(true)
    const toastId = toast.loading('Adicionando nota...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { error } = await supabase
        .from('customer_internal_notes')
        .insert({
          customer_id: customerId,
          note: newNote.trim(),
          created_by: user.id
        })

      if (error) throw error

      toast.success('Nota adicionada!', { id: toastId })
      setNewNote('')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return
    setLoading(true)
    const toastId = toast.loading('Atualizando nota...')

    try {
      const { error } = await supabase
        .from('customer_internal_notes')
        .update({ note: editContent.trim() })
        .eq('id', id)

      if (error) throw error

      toast.success('Nota atualizada!', { id: toastId })
      setEditingId(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta nota?')) return
    setLoading(true)
    const toastId = toast.loading('Deletando...')

    try {
      const { error } = await supabase
        .from('customer_internal_notes')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Nota deletada!', { id: toastId })
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar (apenas ADMIN).', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Listagem de Notas Antigas */}
      {initialNotes.length > 0 ? (
        <div className="space-y-3 mb-6">
          {initialNotes.map((n) => (
            <div key={n.id} className="p-3 bg-muted/30 border rounded-md relative group">
              {editingId === n.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                    <Button size="sm" onClick={() => handleUpdate(n.id)} disabled={loading}>Salvar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm whitespace-pre-wrap">{n.note}</div>
                  <div className="text-xs text-muted-foreground mt-2 flex justify-between items-center">
                    <span>Criada em {format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button 
                        onClick={() => { setEditingId(n.id); setEditContent(n.note); }}
                        className="text-primary hover:underline"
                        disabled={loading}
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(n.id)}
                        className="text-destructive hover:underline"
                        disabled={loading}
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
          Nenhuma nota registrada.
        </div>
      )}

      {/* Formulário Nova Nota */}
      <div className="space-y-2 pt-4 border-t">
        <div className="text-sm font-medium">Adicionar Nova Observação</div>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Ex: Cliente informou mudança de endereço..."
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button onClick={handleCreate} disabled={loading || !newNote.trim()} className="w-full">
          {loading ? 'Adicionando...' : 'Adicionar Observação'}
        </Button>
      </div>
    </div>
  )
}
