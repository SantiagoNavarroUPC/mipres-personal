"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Search } from "lucide-react"

interface NoDireccionamientoSearchDateProps {
  fecha: string
  fechaFin: string
  loading: boolean
  onFechaChange: (value: string) => void
  onFechaFinChange: (value: string) => void
  onSearch: () => void
}

export function NoDireccionamientoSearchDate({
  fecha,
  fechaFin,
  loading,
  onFechaChange,
  onFechaFinChange,
  onSearch,
}: NoDireccionamientoSearchDateProps) {
  const hoy = new Date().toISOString().split("T")[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Consulta por Fecha
        </CardTitle>
        <CardDescription>Retorna la informacion de no direccionamiento por fecha</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="fechaNoDir">Fecha inicio</Label>
            <Input
              id="fechaNoDir"
              type="date"
              value={fecha}
              max={hoy}
              onChange={(e) => onFechaChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fechaFinNoDir">Fecha fin (opcional)</Label>
            <Input
              id="fechaFinNoDir"
              type="date"
              value={fechaFin}
              onChange={(e) => onFechaFinChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={onSearch} disabled={loading} className="w-full md:w-auto">
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Buscando..." : "Consultar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
