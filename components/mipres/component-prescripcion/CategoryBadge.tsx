import type { LucideIcon } from "lucide-react"

interface CategoryBadgeProps {
  icon: LucideIcon
  label: string
  count: number
  colorClass: string
  hideIfZeroOnResponsive?: boolean
}

export function CategoryBadge({
  icon: Icon,
  label,
  count,
  colorClass,
  hideIfZeroOnResponsive = true,
}: CategoryBadgeProps) {
  return (
    <div
      title={`${label}: ${count}`}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[11px] font-medium transition-colors shrink-0 ${
        count > 0
          ? colorClass
          : `bg-muted/40 text-muted-foreground/60 ${hideIfZeroOnResponsive ? "hidden xl:inline-flex" : ""}`
      }`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="hidden 2xl:inline">{label}</span>
      {count > 0 && (
        <span className="ml-0.5 rounded-full bg-white/60 dark:bg-black/25 px-1 text-[10px] font-bold tabular-nums">
          {count}
        </span>
      )}
    </div>
  )
}
