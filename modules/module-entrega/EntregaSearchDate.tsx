"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Calendar, Loader2 } from "lucide-react"

interface EntregaSearchDateProps {
  fechaInicio: string
  fechaFin: string
  hoy: string
  loading: boolean
  loadingRango: boolean
  rangoProgress: number
  rangoInfo: string | null
  isConfigured: boolean
  onFechaInicioChange: (date: string) => void
  onFechaFinChange: (date: string) => void
  onSearch: () => void
}

export function EntregaSearchDate({
  fechaInicio,
  fechaFin,
  hoy,
  loading,
  loadingRango,
  rangoProgress,
  rangoInfo,
  isConfigured,
  onFechaInicioChange,
  onFechaFinChange,
  onSearch,
}: EntregaSearchDateProps) {
  const isSearching = loading || loadingRango

  return (
    <Card className="relative overflow-hidden rounded-xl border border-border/80 dark:border-border/60 bg-card/85 dark:bg-card/75 backdrop-blur-xl shadow-xs">
      <CardHeader>
        <CardTitle className="leading-none font-semibold flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Calendar className="size-3.5" />
          </span>
          Consulta por Fecha de Entrega
        </CardTitle>
        <CardDescription>
          Ingrese solo la fecha de inicio para buscar un dia especifico. Si tambien ingresa la fecha fin, se consultara todo el rango.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="fechaInicio" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Fecha inicio
            </Label>
            <Input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              max={hoy}
              onChange={(e) => onFechaInicioChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              disabled={isSearching}
            />
          </div>
          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="fechaFin" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Fecha fin (opcional)
            </Label>
            <Input
              id="fechaFin"
              type="date"
              value={fechaFin}
              max={hoy}
              onChange={(e) => onFechaFinChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              disabled={isSearching}
            />
          </div>
          <Button
            onClick={onSearch}
            disabled={isSearching || !isConfigured}
            className="relative overflow-hidden group h-9 w-full md:w-auto font-semibold text-sm bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            {isSearching ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Search className="size-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
            )}
            <span>{loadingRango ? "Consultando rango..." : loading ? "Buscando..." : "Consultar"}</span>
          </Button>
        </div>

        {loadingRango && (
          <div className="space-y-2.5 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs p-3.5 transition-all">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span className="font-medium text-foreground">Progreso de consulta</span>
              </div>
              <span className="font-semibold text-primary font-mono">{Math.round(rangoProgress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 relative overflow-hidden"
                style={{ width: `${Math.min(100, Math.max(0, rangoProgress))}%` }}
              />
            </div>
            {rangoInfo && (
              <p className="text-xs text-muted-foreground">{rangoInfo}</p>
            )}
          </div>
        )}

        {!loadingRango && rangoProgress === 100 && rangoInfo && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm text-primary font-medium">{rangoInfo}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
