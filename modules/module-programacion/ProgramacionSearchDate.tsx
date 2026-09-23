"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Search, Calendar } from "lucide-react"

interface ProgramacionSearchDateProps {
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

export function ProgramacionSearchDate({
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
}: ProgramacionSearchDateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Consulta por Fecha de Programación
        </CardTitle>
        <CardDescription>
          Ingrese solo la fecha de inicio para buscar un dia especifico. Si tambien ingresa la fecha fin, se consultara todo el rango.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="fechaInicio">Fecha inicio</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              max={hoy}
              onChange={(e) => onFechaInicioChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fechaFin">Fecha fin (opcional)</Label>
            <Input
              id="fechaFin"
              type="date"
              value={fechaFin}
              max={hoy}
              onChange={(e) => onFechaFinChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={onSearch} disabled={loading || !isConfigured} className="w-full md:w-auto">
            <Search className="h-4 w-4 mr-2" />
            {loadingRango ? "Consultando rango..." : loading ? "Buscando..." : "Consultar"}
          </Button>
        </div>

        {loadingRango && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Progreso de consulta</span>
              <span className="text-foreground font-mono text-xs">{Math.round(rangoProgress)}%</span>
            </div>
            <Progress value={rangoProgress} className="h-2" />
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
