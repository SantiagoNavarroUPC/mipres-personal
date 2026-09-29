"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Search, Loader2 } from "lucide-react"
import { SearchLoadingProgress } from "@/components/SearchLoadingProgress"

interface DireccionamientoSearchDateProps {
  fecha: string
  fechaFin: string
  loading: boolean
  onFechaChange: (date: string) => void
  onFechaFinChange: (date: string) => void
  onSearch: () => void
}

export function DireccionamientoSearchDate({
  fecha,
  fechaFin,
  loading,
  onFechaChange,
  onFechaFinChange,
  onSearch,
}: DireccionamientoSearchDateProps) {
  const hoy = new Date().toISOString().split("T")[0]

  return (
    <Card className="relative overflow-hidden rounded-xl border border-border/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
      <CardHeader>
        <CardTitle className="leading-none font-semibold flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Calendar className="size-3.5" />
          </span>
          Consulta por Fecha
        </CardTitle>
        <CardDescription>Retorna la informacion de lo direccionado por fecha</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="fechaDir" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Fecha inicio
            </Label>
            <Input
              id="fechaDir"
              type="date"
              value={fecha}
              max={hoy}
              onChange={(e) => onFechaChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              disabled={loading}
            />
          </div>
          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="fechaDirFin" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Fecha fin (opcional)
            </Label>
            <Input
              id="fechaDirFin"
              type="date"
              value={fechaFin}
              onChange={(e) => onFechaFinChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              disabled={loading}
            />
          </div>
          <Button
            onClick={onSearch}
            disabled={loading}
            className="relative overflow-hidden group h-9 w-full md:w-auto font-semibold text-sm bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            {loading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Search className="size-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
            )}
            <span>{loading ? "Buscando..." : "Consultar"}</span>
          </Button>
        </div>

        <SearchLoadingProgress loading={loading} />
      </CardContent>
    </Card>
  )
}
