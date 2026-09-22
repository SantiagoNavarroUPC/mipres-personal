import type { LucideIcon } from "lucide-react"

interface CategoryBadgeProps {
  icon: LucideIcon
  label: string
  count: number
  colorClass: string
}

export function CategoryBadge({ icon: Icon, label, count, colorClass }: CategoryBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
        count > 0 ? colorClass : "bg-muted/50 text-muted-foreground"
      }`}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {count > 0 && (
        <span className="ml-0.5 rounded-full bg-white/40 px-1.5 text-[10px] font-bold">{count}</span>
      )}
    </div>
  )
}
