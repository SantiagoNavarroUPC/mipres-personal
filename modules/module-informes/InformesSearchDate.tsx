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
import { BarChart3, Calendar, Download } from "lucide-react"

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
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
          <div>
            <Label htmlFor="fechaInicioInforme">Fecha inicio</Label>
            <Input
              id="fechaInicioInforme"
              type="date"
              value={fechaInicio}
              max={hoy}
              onChange={(e) => onFechaInicioChange(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="fechaFinInforme">Fecha fin</Label>
            <Input
              id="fechaFinInforme"
              type="date"
              value={fechaFin}
              max={hoy}
              onChange={(e) => onFechaFinChange(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Reporte a descargar</Label>
            <Select value={reporte} onValueChange={onReporteChange}>
              <SelectTrigger className="h-10 mt-1">
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
            <div>
              <Label htmlFor="nitPrestadorInforme">NIT Prestador (opcional)</Label>
              <Input
                id="nitPrestadorInforme"
                type="text"
                value={nitPrestador}
                placeholder="Ej: 900123456"
                onChange={(e) => onNitPrestadorChange?.(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          <Button
            onClick={onDescargar}
            disabled={loading || !isConfigured}
            className="h-10 w-full md:w-auto whitespace-nowrap mt-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? "Descargando..." : "Descargar reporte"}
          </Button>

          <Button
            onClick={onVerDashboard}
            disabled={loadingDashboard || !isConfigured || showNitPrestador}
            variant="outline"
            className="h-10 w-full md:w-auto whitespace-nowrap mt-1"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {loadingDashboard ? "Cargando..." : "Ver dashboard"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}