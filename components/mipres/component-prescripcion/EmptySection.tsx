import { Package } from "lucide-react"

interface EmptySectionProps {
  label: string
}

export function EmptySection({ label }: EmptySectionProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Package className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">No hay {label} registrados</p>
    </div>
  )
}