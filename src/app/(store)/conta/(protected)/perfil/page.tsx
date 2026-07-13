'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/data/page-header'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Label } from '@/components/admin/ui/label'
import { toast } from 'sonner'
import { User as UserIcon } from 'lucide-react'

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    document: ''
  })

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            document: data.document || ''
          })
        }
      }
      setLoading(false)
    }
    loadData()
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const toastId = toast.loading('Salvando...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sem sessão ativa')

      const { error } = await supabase.from('profiles').update({
        full_name: profile.full_name,
        phone: profile.phone,
        document: profile.document
      }).eq('id', user.id)

      if (error) throw error

      toast.success('Perfil atualizado com sucesso!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader 
        title="Meu Perfil" 
        description="Atualize seus dados pessoais e informações de contato." 
      />

      <form onSubmit={handleSave} className="border bg-card rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold">Dados Principais</h3>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input 
              id="full_name" 
              value={profile.full_name} 
              onChange={e => setProfile({...profile, full_name: e.target.value})} 
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document">CPF/CNPJ</Label>
            <Input 
              id="document" 
              value={profile.document} 
              onChange={e => setProfile({...profile, document: e.target.value})} 
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input 
              id="phone" 
              value={profile.phone} 
              onChange={e => setProfile({...profile, phone: e.target.value})} 
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail (Login)</Label>
            <Input 
              id="email" 
              value={userEmail} 
              disabled 
              className="bg-muted"
            />
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
