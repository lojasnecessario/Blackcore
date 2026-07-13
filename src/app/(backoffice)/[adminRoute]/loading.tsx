export default function AdminLoading() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando painel...</p>
      </div>
    </div>
  )
}
