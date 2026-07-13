import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAdminUrl } from '@/lib/admin-url'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(getAdminUrl('/login'))
}
