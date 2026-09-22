"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Receipt } from "lucide-react"

interface PrescripcionSearchFacturaProps {
  noFactura: string
  loading: boolean
  isConfigured: boolean
  onNoFacturaChange: (val: string) => void
  onSearch: () => void
}

export function PrescripcionSearchFactura({
  noFactura,
  loading,
  isConfigured,
  onNoFacturaChange,
  onSearch,
}: PrescripcionSearchFacturaProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Consulta por Numero de Factura
        </CardTitle>
        <CardDescription>
          Busca la prescripcion asociada al numero de factura y retorna toda la informacion del anexo tecnico
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="noFactura">Numero de Factura</Label>
            <Input
              id="noFactura"
              placeholder="Ej: DU5654"
              value={noFactura}
              onChange={(e) => onNoFacturaChange(e.target.value.toUpperCase())}
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
