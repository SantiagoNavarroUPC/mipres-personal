"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BarChart3, Calendar, Download, FileSpreadsheet, Building2, Loader2 } from "lucide-react"

interface InformesSearchDateProps {
  fechaInicio: string
  fechaFin: string
  hoy: string
  reporte: string
  loading: boolean
  isConfigured: boolean
  onFechaInicioChange: (date: string) => void
  onFechaFinChange: (date: string) => void
  onReporteChange: (reporte: string) => void
  onDescargar: () => void
  onVerDashboard: () => void
  loadingDashboard: boolean
  nitPrestador?: string
  onNitPrestadorChange?: (val: string) => void
}

const requiereNitPrestador = (r: string) => r === "estructura-giro" || r === "reserva-tecnica"

export function InformesSearchDate({
  fechaInicio,
  fechaFin,
  hoy,
  reporte,
  loading,
  isConfigured,
  onFechaInicioChange,
  onFechaFinChange,
  onReporteChange,
  onDescargar,
  onVerDashboard,
  loadingDashboard,
  nitPrestador = "",
  onNitPrestadorChange,
}: InformesSearchDateProps) {
  const showNitPrestador = requiereNitPrestador(reporte)

  return (
    <Card className="relative overflow-hidden rounded-xl border border-border/80 dark:border-border/60 bg-card/85 dark:bg-card/75 backdrop-blur-xl shadow-xs">
      <CardHeader>
        <CardTitle className="leading-none font-semibold flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Calendar className="size-3.5" />
          </span>
          Consulta por Fecha
        </CardTitle>
        <CardDescription>
          Ingrese fecha inicio y fecha fin para consultar un rango y descargar el reporte en una sola accion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`grid grid-cols-1 gap-4 items-end ${
            showNitPrestador
              ? "md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]"
              : "md:grid-cols-[1fr_1fr_1fr_auto_auto]"
          }`}
        >
          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="fechaInicioInforme" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Fecha inicio
            </Label>
            <Input
              id="fechaInicioInforme"
              type="date"
              value={fechaInicio}
              max={hoy}
              onChange={(e) => onFechaInicioChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              disabled={loading || loadingDashboard}
            />
          </div>

          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="fechaFinInforme" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Fecha fin
            </Label>
            <Input
              id="fechaFinInforme"
              type="date"
              value={fechaFin}
              max={hoy}
              onChange={(e) => onFechaFinChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              disabled={loading || loadingDashboard}
            />
          </div>

          <div className="group flex flex-col gap-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <FileSpreadsheet className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Reporte a descargar
            </Label>
            <Select value={reporte} onValueChange={onReporteChange}>
              <SelectTrigger className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm rounded-xl">
                <SelectValue placeholder="Selecciona el reporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Reporte General</SelectItem>
                <SelectItem value="medicamento">Reporte de Medicamentos</SelectItem>
                <SelectItem value="producto-nutricional">Reporte de Productos Nutricionales</SelectItem>
                <SelectItem value="servicio">Reporte de Servicios</SelectItem>
                <SelectItem value="detalle-mipres">Reporte detalles de direccionamiento</SelectItem>
                <SelectItem value="estructura-giro">Reporte Estructura de Giro</SelectItem>
                <SelectItem value="reserva-tecnica">Reporte de Reserva Tecnica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showNitPrestador && (
            <div className="group flex flex-col gap-1.5">
              <Label htmlFor="nitPrestadorInforme" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <Building2 className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                NIT Prestador (opcional)
              </Label>
              <Input
                id="nitPrestadorInforme"
                type="text"
                value={nitPrestador}
                placeholder="Ej: 900123456"
                onChange={(e) => onNitPrestadorChange?.(e.target.value)}
                className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
                disabled={loading || loadingDashboard}
              />
            </div>
          )}

          <Button
            onClick={onDescargar}
            disabled={loading || !isConfigured}
            className="relative overflow-hidden group h-9 w-full md:w-auto font-semibold text-sm bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl whitespace-nowrap"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            {loading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Download className="size-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
            )}
            <span>{loading ? "Descargando..." : "Descargar reporte"}</span>
          </Button>

          <Button
            onClick={onVerDashboard}
            disabled={loadingDashboard || !isConfigured || showNitPrestador}
            variant="outline"
            className="group h-9 w-full md:w-auto font-semibold text-sm rounded-xl border-border/80 hover:bg-accent hover:border-primary/40 active:translate-y-0 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap shadow-xs"
          >
            {loadingDashboard ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="size-4 mr-2 transition-transform duration-200 group-hover:scale-110 text-primary" />
            )}
            <span>{loadingDashboard ? "Cargando..." : "Ver dashboard"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}