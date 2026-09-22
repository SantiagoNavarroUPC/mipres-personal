"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, User } from "lucide-react"
import { TIPOS_DOCUMENTO } from "@/models/constants"

interface NoDireccionamientoSearchPatientProps {
  fechaPac: string
  tipoDoc: string
  numDoc: string
  loading: boolean
  onFechaPacChange: (value: string) => void
  onTipoDocChange: (value: string) => void
  onNumDocChange: (value: string) => void
  onSearch: () => void
}

export function NoDireccionamientoSearchPatient({
  fechaPac,
  tipoDoc,
  numDoc,
  loading,
  onFechaPacChange,
  onTipoDocChange,
  onNumDocChange,
  onSearch,
}: NoDireccionamientoSearchPatientProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Consulta por Paciente
        </CardTitle>
        <CardDescription>Retorna la informacion de no direccionamiento por paciente y fecha</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="fechaPacNoDir">Fecha</Label>
            <Input
              id="fechaPacNoDir"
              type="date"
              value={fechaPac}
              onChange={(e) => onFechaPacChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tipoDocNoDir">Tipo de Documento</Label>
            <Select value={tipoDoc} onValueChange={onTipoDocChange}>
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
            <Label htmlFor="numDocNoDir">Numero de Documento</Label>
            <Input
              id="numDocNoDir"
              value={numDoc}
              onChange={(e) => onNumDocChange(e.target.value)}
              placeholder="Digite el numero de documento"
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onSearch} disabled={loading} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Buscando..." : "Consultar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
