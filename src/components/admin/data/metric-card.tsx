import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: "up" | "down" | "neutral"
}

export function MetricCard({ title, value, icon: Icon, description, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend === 'up' && <span className="text-success font-medium mr-1">↑</span>}
            {trend === 'down' && <span className="text-destructive font-medium mr-1">↓</span>}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
