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
    <Card className="overflow-hidden gap-0 py-0">
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[680px] text-xs sm:text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  Tutela
                </div>
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Fecha
                </div>
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-4">
                Detalle
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
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
