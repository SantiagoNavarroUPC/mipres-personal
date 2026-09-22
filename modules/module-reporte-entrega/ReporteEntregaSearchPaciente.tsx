"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Search, User } from "lucide-react"
import { TIPOS_DOCUMENTO } from "@/models/constants"

interface ReporteEntregaSearchByPacienteProps {
  fecha: string
  tipoDocumento: string
  numeroDocumento: string
  loading: boolean
  isConfigured: boolean
  onFechaChange: (f: string) => void
  onTipoDocumentoChange: (t: string) => void
  onNumeroDocumentoChange: (n: string) => void
  onSearch: () => void
}

export function ReporteEntregaSearchPaciente({
  fecha,
  tipoDocumento,
  numeroDocumento,
  loading,
  isConfigured,
  onFechaChange,
  onTipoDocumentoChange,
  onNumeroDocumentoChange,
  onSearch,
}: ReporteEntregaSearchByPacienteProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Consulta por paciente y fecha
        </CardTitle>
        <CardDescription>
          Busca los reportes de entrega asociados a un paciente en una fecha específica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => onFechaChange(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="tipoDocumento">Tipo Documento</Label>
            <Select value={tipoDocumento} onValueChange={onTipoDocumentoChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_DOCUMENTO).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {key} - {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="numeroDocumento">Número de documento</Label>
            <Input
              id="numeroDocumento"
              placeholder="Número de documento"
              value={numeroDocumento}
              onChange={(e) => onNumeroDocumentoChange(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-end">
            <Button onClick={onSearch} disabled={loading || !isConfigured} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Buscando..." : "Consultar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
