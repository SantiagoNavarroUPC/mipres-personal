"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Search } from "lucide-react"

interface NoDireccionamientoSearchPrescriptionProps {
  noPresc: string
  loading: boolean
  onNoPrescChange: (value: string) => void
  onSearch: () => void
}

export function NoDireccionamientoSearchPrescription({
  noPresc,
  loading,
  onNoPrescChange,
  onSearch,
}: NoDireccionamientoSearchPrescriptionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Consulta por Prescripcion
        </CardTitle>
        <CardDescription>Retorna la informacion de no direccionamiento por numero de prescripcion</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="noPrescNoDir">Numero de Prescripcion</Label>
            <Input
              id="noPrescNoDir"
              type="text"
              value={noPresc}
              onChange={(e) => onNoPrescChange(e.target.value)}
              placeholder="Digite el numero de prescripcion o tutela"
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
