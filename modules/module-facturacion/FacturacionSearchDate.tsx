"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Loader2, Search, Calendar } from "lucide-react"

interface FacturacionSearchDateProps {
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

export function FacturacionSearchDate({
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
}: FacturacionSearchDateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Consulta por Fecha de Facturación
        </CardTitle>
        <CardDescription>
          Ingrese solo la fecha de inicio para buscar un día específico. Si también ingresa la fecha fin, se consultará todo el rango.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="fecha-inicio-fac">Fecha inicio</Label>
            <Input
              id="fecha-inicio-fac"
              type="date"
              value={fechaInicio}
              max={hoy}
              onChange={(e) => onFechaInicioChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fecha-fin-fac">Fecha fin (opcional)</Label>
            <Input
              id="fecha-fin-fac"
              type="date"
              value={fechaFin}
              max={hoy}
              onChange={(e) => onFechaFinChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={onSearch}
            disabled={loading || !isConfigured || !fechaInicio}
            className="w-full md:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loading ? (loadingRango ? "Consultando rango..." : "Buscando...") : "Consultar"}
          </Button>
        </div>

        {loadingRango && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Progreso de consulta</span>
              <span className="text-foreground font-mono text-xs">{Math.round(rangoProgress)}%</span>
            </div>
            <Progress value={rangoProgress} className="h-2" />
            {rangoInfo && <p className="text-xs text-muted-foreground">{rangoInfo}</p>}
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
