"use client"

import { Loader2 } from "lucide-react"

export interface SearchLoadingProgressProps {
  loading: boolean
  loadingRango?: boolean
  rangoProgress?: number
  rangoInfo?: string | null
  title?: string
  subtitle?: string
}

export function SearchLoadingProgress({
  loading,
  loadingRango = false,
  rangoProgress = 0,
  rangoInfo = null,
  title,
  subtitle,
}: SearchLoadingProgressProps) {
  const isSearching = loading || loadingRango

  if (!isSearching) return null

  const isThreaded = Boolean(loadingRango)

  const defaultTitle = isThreaded
    ? "Progreso de consulta por hilos"
    : "Consultando información en MIPRES"

  const defaultSubtitle = isThreaded
    ? rangoInfo || "Consultando rango de fechas en hilos paralelos..."
    : subtitle || "Obteniendo datos desde el servicio oficial, por favor espere..."

  return (
    <div className="space-y-2.5 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs p-3.5 transition-all">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
          <span className="font-medium text-foreground">{title || defaultTitle}</span>
        </div>
        <span className="font-semibold text-primary font-mono text-xs">
          {isThreaded ? `${Math.round(rangoProgress)}%` : "Procesando..."}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15 relative">
        {isThreaded ? (
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 relative overflow-hidden"
            style={{ width: `${Math.min(100, Math.max(0, rangoProgress))}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-primary absolute animate-indeterminate" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {isThreaded ? (rangoInfo || defaultSubtitle) : defaultSubtitle}
      </p>
    </div>
  )
}
