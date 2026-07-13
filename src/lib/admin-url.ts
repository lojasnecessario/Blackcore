export const getAdminRoute = () => {
  // Para uso em client components, usamos o NEXT_PUBLIC.
  // Server components idealmente devem usar process.env.BACKOFFICE_ROUTE, mas como isso pode ser misturado,
  // pegamos o que estiver disponível (no server o process.env tem ambos, no client só NEXT_PUBLIC).
  const route = process.env.NEXT_PUBLIC_BACKOFFICE_ROUTE || process.env.BACKOFFICE_ROUTE || '/blackcore-control'
  return route.startsWith('/') ? route : `/${route}`
}

export const getAdminUrl = (path: string) => {
  const base = getAdminRoute()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  // Evitar barras duplas
  if (base === '/' && cleanPath === '/') return '/'
  if (cleanPath === '/') return base
  return `${base}${cleanPath}`
}
