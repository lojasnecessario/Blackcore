import { Badge } from '@/components/admin/ui/badge'

export function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="secondary">Pendente</Badge>
    case 'PAID':
      return <Badge variant="success">Pago</Badge>
    case 'PROCESSING':
      return <Badge className="bg-orange-500 hover:bg-orange-600">Em Separação</Badge>
    case 'SHIPPED':
      return <Badge className="bg-blue-500 hover:bg-blue-600">Enviado</Badge>
    case 'DELIVERED':
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">Entregue</Badge>
    case 'CANCELED':
      return <Badge variant="destructive">Cancelado</Badge>
    case 'REFUNDED':
      return <Badge variant="destructive">Reembolsado</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="secondary">Aguardando Pagamento</Badge>
    case 'APPROVED':
      return <Badge variant="success">Aprovado</Badge>
    case 'REJECTED':
      return <Badge variant="destructive">Recusado</Badge>
    case 'REFUNDED':
      return <Badge variant="destructive">Reembolsado</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
