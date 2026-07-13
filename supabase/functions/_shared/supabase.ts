import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Client authenticated with the user's JWT (RLS is enforced)
export function getSupabaseClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
}

// Client authenticated with Service Role Key (Bypasses RLS - use ONLY for secure backend operations)
export function getServiceRoleClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}
