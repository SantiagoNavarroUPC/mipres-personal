"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { NovedadPrescripcion } from "@/models/mipres-sispro/prescripcion"
import { TIPOS_NOVEDAD } from "@/models/mipres-sispro/prescripcion"
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Hash,
  FileText,
} from "lucide-react"

interface NovedadesTableProps {
  novedades: NovedadPrescripcion[]
}

// Mapa de colores por tipo de novedad
const COLORS_NOVEDAD: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",    // Modificación
  2: "bg-red-100 text-red-700",      // Anulación
  3: "bg-amber-100 text-amber-700",  // Transcripción
}

export function NovedadesTable({ novedades }: NovedadesTableProps) {
  // Paginación
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const total = novedades.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const displayed = useMemo(() => {
    const start = (page - 1) * pageSize
    return novedades.slice(start, start + pageSize)
  }, [novedades, page, pageSize])

  function formatDateTime(value?: string | null) {
    if (!value) return "-"

    const raw = String(value).trim()
    if (!raw) return "-"

    const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw)
    if (hasTimezone) {
      const dt = new Date(raw)
      if (!Number.isNaN(dt.getTime())) {
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, "0")
        const d = String(dt.getDate()).padStart(2, "0")
        const hh = String(dt.getHours()).padStart(2, "0")
        const mm = String(dt.getMinutes()).padStart(2, "0")
        return `${y}-${m}-${d} ${hh}:${mm}`
      }
    }

    const normalized = raw.replace("T", " ")
    const [datePart = "", timePart = ""] = normalized.split(" ")
    if (!datePart) return "-"

    const hhmm = timePart ? timePart.split(":").slice(0, 2).join(":") : "00:00"
    return `${datePart} ${hhmm || "00:00"}`
  }

  if (!novedades || novedades.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-3">
            <RefreshCw className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">No se encontraron novedades</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Intenta con otros criterios de búsqueda</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg">Novedades</h2>
        <Badge variant="secondary" className="text-xs">
          {novedades.length}
        </Badge>
      </div>

      {/* Tabla compacta */}
      <Card className="overflow-hidden gap-0 py-0 rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-xs">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-primary/20 bg-primary text-white whitespace-nowrap">
                <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <RefreshCw className="h-3.5 w-3.5 text-white shrink-0" />
                    <span>Tipo Novedad</span>
                  </div>
                </th>
                <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <Hash className="h-3.5 w-3.5 text-white shrink-0" />
                    <span>No. Prescripción</span>
                  </div>
                </th>
                <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <FileText className="h-3.5 w-3.5 text-white shrink-0" />
                    <span>No. Prescripción Final</span>
                  </div>
                </th>
                <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <Calendar className="h-3.5 w-3.5 text-white shrink-0" />
                    <span>Fecha Novedad</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 dark:divide-border/40 bg-card">
              {displayed.map((novedad: any, idx) => {
                const tipoLabel = TIPOS_NOVEDAD[novedad.TipoNov as keyof typeof TIPOS_NOVEDAD] || "Desconocido"
                const tipoColor = COLORS_NOVEDAD[novedad.TipoNov] || "bg-gray-100 text-gray-700"

                return (
                  <tr
                    key={`${novedad.NoPrescripcion}_${idx}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[10px] h-5 ${tipoColor}`}>
                        {novedad.TipoNov}: {tipoLabel}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-mono text-xs font-medium text-primary">
                        {novedad.NoPrescripcion ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">
                        {novedad.NoPrescripcionF && novedad.NoPrescripcionF !== novedad.NoPrescripcion
                          ? novedad.NoPrescripcionF
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                      <span className="font-mono text-xs font-medium text-primary">
                        {formatDateTime(novedad.FNov)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border/80 dark:border-border/60 bg-white/70 dark:bg-card/75 backdrop-blur-xl shadow-2xs">
        {/* Info summary */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Mostrando</span>
          <span className="font-semibold text-foreground">
            {total === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)}
          </span>
          <span>de</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-[11px] tabular-nums">
            {total}
          </span>
          <span>registros</span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Filas:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[68px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              title="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="px-2.5 h-8 flex items-center justify-center rounded-lg border border-border/80 bg-white dark:bg-card text-xs font-semibold tabular-nums text-foreground shadow-2xs">
              <span className="text-primary">{page}</span>
              <span className="mx-1 text-muted-foreground/60">/</span>
              <span className="text-muted-foreground">{pageCount}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              title="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
              disabled={page >= pageCount}
              onClick={() => setPage(pageCount)}
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
