'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Label } from '@/components/admin/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone: formData.phone,
            role: 'CUSTOMER' // Injeta no raw_user_meta_data
          }
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Conta criada com sucesso!')
      router.push('/conta')
      router.refresh()

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-24 flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Criar Conta</h1>
          <p className="text-muted-foreground mt-2">Junte-se à BlackCore System</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input 
              id="name" 
              required 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input 
              id="phone" 
              required 
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              disabled={loading}
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Conta'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground border-t pt-6">
          Já tem uma conta?{' '}
          <Link href="/conta/login" className="text-primary font-medium hover:underline">
            Faça login aqui
          </Link>
        </div>
      </div>
    </div>
  )
}
