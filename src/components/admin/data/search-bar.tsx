import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/admin/ui/input"

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function SearchBar({ className, ...props }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Buscar produtos..."
        className="pl-9"
        {...props}
      />
    </div>
  )
}
