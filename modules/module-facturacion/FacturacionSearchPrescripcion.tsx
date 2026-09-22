"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search, FileText } from "lucide-react"

interface FacturacionSearchPrescripcionProps {
  noPrescripcion: string
  loading: boolean
  isConfigured: boolean
  onNoPrescripcionChange: (value: string) => void
  onSearch: () => void
}

export function FacturacionSearchPrescripcion({
  noPrescripcion,
  loading,
  isConfigured,
  onNoPrescripcionChange,
  onSearch,
}: FacturacionSearchPrescripcionProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Consulta de Facturación
        </CardTitle>
        <CardDescription>
          Busca los registros de facturación asociados a un número de prescripción específico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="no-prescripcion-fac">Número de Prescripción</Label>
            <Input
              id="no-prescripcion-fac"
              placeholder="Digite el número de prescripción"
              value={noPrescripcion}
              onChange={(e) => onNoPrescripcionChange(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={20}
              className="mt-1 font-mono placeholder:font-sans"
            />
          </div>
          <Button
            onClick={onSearch}
            disabled={loading || !isConfigured || !noPrescripcion.trim()}
            className="w-full md:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loading ? "Buscando..." : "Consultar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
