import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { getAdminUrl } from '@/lib/admin-url'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const resolvedParams = await searchParams;

  // Se já logado e admin, vai pro dashboard
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile && (profile.role === 'ADMIN' || profile.role === 'EMPLOYEE')) {
      redirect(getAdminUrl('/dashboard'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">BLACKCORE</h1>
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">Admin Control Panel</p>
        </div>
        
        {resolvedParams?.error === 'unauthorized' && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
            Acesso negado. Sua conta não tem permissões administrativas.
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  )
}
