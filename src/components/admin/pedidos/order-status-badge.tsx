import { Badge } from '@/components/admin/ui/badge'
import { cn } from '@/lib/utils'

export function OrderStatusBadge({ status, className }: { status: string, className?: string }) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="secondary" className={className}>Pendente</Badge>
    case 'PAID':
      return <Badge variant="success" className={className}>Pago</Badge>
    case 'PROCESSING':
      return <Badge className={cn("bg-orange-500 hover:bg-orange-600", className)}>Em Separação</Badge>
    case 'SHIPPED':
      return <Badge className={cn("bg-blue-500 hover:bg-blue-600", className)}>Enviado</Badge>
    case 'DELIVERED':
      return <Badge className={cn("bg-emerald-500 hover:bg-emerald-600", className)}>Entregue</Badge>
    case 'CANCELED':
      return <Badge variant="destructive" className={className}>Cancelado</Badge>
    case 'REFUNDED':
      return <Badge variant="destructive" className={className}>Reembolsado</Badge>
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>
  }
}

export function PaymentStatusBadge({ status, className }: { status: string, className?: string }) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="secondary" className={className}>Aguardando Pagamento</Badge>
    case 'APPROVED':
      return <Badge variant="success" className={className}>Aprovado</Badge>
    case 'REJECTED':
      return <Badge variant="destructive" className={className}>Recusado</Badge>
    case 'REFUNDED':
      return <Badge variant="destructive" className={className}>Reembolsado</Badge>
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>
  }
}
