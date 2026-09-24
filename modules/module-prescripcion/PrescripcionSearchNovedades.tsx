"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface PrescripcionSearchNovedadesProps {
  fechaNov: string
  loading: boolean
  isConfigured: boolean
  onFechaNovChange: (date: string) => void
  onSearch: () => void
}

export function PrescripcionSearchNovedades({
  fechaNov,
  loading,
  isConfigured,
  onFechaNovChange,
  onSearch,
}: PrescripcionSearchNovedadesProps) {
  const { esIPS } = useEmpresaActual()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Novedades de Prescripciones
        </CardTitle>
        <CardDescription>
          Retorna todas las novedades de prescripciones para una {esIPS ? "IPS" : "EPS"} en la fecha indicada
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="fechaNov">Fecha de novedades</Label>
            <Input
              id="fechaNov"
              type="date"
              value={fechaNov}
              onChange={(e) => onFechaNovChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={onSearch} disabled={loading || !isConfigured} className="w-full md:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            {loading ? "Buscando..." : "Consultar Novedades"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
