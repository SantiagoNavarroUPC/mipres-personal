"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, User } from "lucide-react"
import { TIPOS_DOCUMENTO } from "@/models/constants"

interface TutelaSearchPatientProps {
  fecha: string
  fechaFinPac: string
  tipoDoc: string
  numDoc: string
  loading: boolean
  loadingRango: boolean
  rangoProgress: number
  rangoInfo: string | null
  isConfigured: boolean
  onFechaChange: (value: string) => void
  onFechaFinChange: (value: string) => void
  onTipoDocChange: (value: string) => void
  onNumDocChange: (value: string) => void
  onSearch: () => void
}

export function TutelaSearchPatient({
  fecha,
  fechaFinPac,
  tipoDoc,
  numDoc,
  loading,
  loadingRango,
  rangoProgress,
  rangoInfo,
  isConfigured,
  onFechaChange,
  onFechaFinChange,
  onTipoDocChange,
  onNumDocChange,
  onSearch,
}: TutelaSearchPatientProps) {
  const tieneFechas = Boolean(fecha || fechaFinPac)
  const requiereTipoDoc = tieneFechas

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Consulta por Paciente
        </CardTitle>
        <CardDescription>
          Retorna tutelas de un paciente por fecha especifica o rango de fechas. Si no ingresa fechas, consulta por documento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[140px]">
              <Label htmlFor="fechaPacTut">Fecha Inicial (Opcional)</Label>
              <Input
                id="fechaPacTut"
                type="date"
                value={fecha}
                onChange={(e) => onFechaChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label htmlFor="fechaFinPacTut">Fecha Final (Opcional)</Label>
              <Input
                id="fechaFinPacTut"
                type="date"
                value={fechaFinPac}
                onChange={(e) => onFechaFinChange(e.target.value)}
                className="mt-1"
                placeholder="Opcional"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label htmlFor="tipoDocTut">Tipo Documento</Label>
              <Select
                value={tipoDoc || "__seleccione__"}
                onValueChange={(value) => onTipoDocChange(value === "__seleccione__" ? "" : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__seleccione__">Seleccione...</SelectItem>
                  {Object.entries(TIPOS_DOCUMENTO).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {key} - {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label htmlFor="numDocTut">Número Documento</Label>
              <Input
                id="numDocTut"
                placeholder="Ej. 12345678"
                value={numDoc}
                onChange={(e) => onNumDocChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="pb-0.5 flex-1 min-w-[140px]">
              <Button 
                onClick={onSearch} 
                disabled={loading || !numDoc || !isConfigured || (requiereTipoDoc && !tipoDoc)} 
                className="w-full"
              >
                {loading ? (
                  <>
                    <Search className="mr-2 h-4 w-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Consultar
                  </>
                )}
              </Button>
            </div>
          </div>

          {loadingRango && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{rangoInfo || "Procesando..."}</span>
                <span>{Math.round(rangoProgress)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-in-out"
                  style={{ width: `${rangoProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
