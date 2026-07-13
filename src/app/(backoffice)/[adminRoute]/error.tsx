'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/admin/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center space-y-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-bold text-foreground">Algo deu errado!</h2>
      <p className="text-muted-foreground text-sm max-w-md text-center">
        {error.message || 'Ocorreu um erro inesperado ao carregar esta página do painel administrativo.'}
      </p>
      <Button
        onClick={() => reset()}
        variant="outline"
      >
        Tentar novamente
      </Button>
    </div>
  )
}
