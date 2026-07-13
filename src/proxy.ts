import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAdminUrl } from '@/lib/admin-url'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const backofficeRoute = process.env.BACKOFFICE_ROUTE || '/blackcore-control'
  const path = request.nextUrl.pathname

  // Bloquear acessos diretos à pasta legada /admin
  if (path.startsWith('/admin')) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Proteger a rota do backoffice
  if (path.startsWith(backofficeRoute) && !path.startsWith(`${backofficeRoute}/login`)) {
    if (!user) {
      return NextResponse.redirect(new URL(`${backofficeRoute}/login`, request.url))
    }

    // Check Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'EMPLOYEE')) {
      // Redireciona para login de admin ou dá not found
      return NextResponse.redirect(new URL(`${backofficeRoute}/login?error=unauthorized`, request.url))
    }
  }

  // Redirecionar raiz do backoffice para o dashboard
  if (path === backofficeRoute) {
     return NextResponse.redirect(new URL(`${backofficeRoute}/dashboard`, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
