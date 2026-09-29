"use client"

import { ClipboardCheck } from "lucide-react"

interface ReporteEntregaHeaderProps {
  isConfigured?: boolean
}

export function ReporteEntregaHeader({ isConfigured }: ReporteEntregaHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          Reporte de Entrega
        </h2>
        <p className="text-muted-foreground">
          Consulta y reporte de entregas de tecnologías MIPRES
        </p>
      </div>
    </div>
  )
}
