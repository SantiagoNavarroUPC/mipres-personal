"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Search } from "lucide-react"

interface DireccionamientoSearchPrescriptionProps {
  noPresc: string
  loading: boolean
  onNoPrescChange: (num: string) => void
  onSearch: () => void
}

export function DireccionamientoSearchPrescription({
  noPresc,
  loading,
  onNoPrescChange,
  onSearch,
}: DireccionamientoSearchPrescriptionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Consulta por Prescripcion
        </CardTitle>
        <CardDescription>Retorna la informacion de direccionamiento por numero de prescripcion</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="noPrescDir">Numero de Prescripcion</Label>
            <Input
              id="noPrescDir"
              placeholder="Digite el numero de prescripcion o tutela"
              value={noPresc}
              onChange={(e) => onNoPrescChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={onSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Buscando..." : "Consultar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
