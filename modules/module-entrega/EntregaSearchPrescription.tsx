"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, FileText } from "lucide-react"

interface EntregaSearchPrescriptionProps {
  noPresc: string
  loading: boolean
  isConfigured: boolean
  onNoPrescChange: (num: string) => void
  onSearch: () => void
}

export function EntregaSearchPrescription({
  noPresc,
  loading,
  isConfigured,
  onNoPrescChange,
  onSearch,
}: EntregaSearchPrescriptionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Consulta por Número de Prescripción
        </CardTitle>
        <CardDescription>
          Busca las entregas asociadas a un número de prescripción
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="noPresc">Número de Prescripción</Label>
            <Input
              id="noPresc"
              placeholder="Digite el número de prescripción"
              value={noPresc}
              onChange={(e) => onNoPrescChange(e.target.value)}
              maxLength={20}
              className="mt-1 font-mono placeholder:font-sans"
            />
          </div>
          <Button onClick={onSearch} disabled={loading || !isConfigured} className="w-full md:w-auto">
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Buscando..." : "Consultar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
