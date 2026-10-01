"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FileText, Calendar } from "lucide-react"

interface TutelaNovedadesTableProps {
  novedades: any[]
}

function pickField(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key]
  }
  return undefined
}

export function TutelaNovedadesTable({ novedades }: TutelaNovedadesTableProps) {
  if (!novedades.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">No se encontraron novedades</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Intenta con otra fecha</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden gap-0 py-0 rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-xs">
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-primary/20 bg-primary text-white whitespace-nowrap">
              <th className="text-left text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <FileText className="h-3.5 w-3.5 text-white shrink-0" />
                  <span>Tutela</span>
                </div>
              </th>
              <th className="text-left text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="h-3.5 w-3.5 text-white shrink-0" />
                  <span>Fecha</span>
                </div>
              </th>
              <th className="text-left text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                <span>Detalle</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 dark:divide-border/40">
            {novedades.map((item, idx) => {
              const noTutela = pickField(item, ["NoTutela", "NroTutela", "noTutela", "NoPrescripcion"]) ?? "-"
              const fecha = pickField(item, ["FTutela", "Fecha", "FNov", "FecNov"]) ?? "-"
              const detalle = pickField(item, ["Detalle", "descripcion", "Descripcion", "Obs"]) ?? "Novedad"

              return (
                <tr key={`${noTutela}-${idx}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-sm font-medium">{String(noTutela)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{String(fecha).split("T")[0]}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{String(detalle)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
