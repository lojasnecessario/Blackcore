import { notFound } from 'next/navigation'

export default async function BaseAdminLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ adminRoute: string }>
}) {
  const resolvedParams = await params
  const currentRoute = '/' + resolvedParams.adminRoute
  const expectedRoute = process.env.BACKOFFICE_ROUTE || '/blackcore-control'
  
  if (currentRoute !== expectedRoute) {
    notFound()
  }

  return <>{children}</>
}
