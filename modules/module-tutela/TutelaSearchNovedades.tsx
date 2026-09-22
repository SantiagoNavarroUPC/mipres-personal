"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"

interface TutelaSearchNovedadesProps {
  fecha: string
  loading: boolean
  isConfigured: boolean
  onFechaChange: (value: string) => void
  onSearch: () => void
}

export function TutelaSearchNovedades({
  fecha,
  loading,
  isConfigured,
  onFechaChange,
  onSearch,
}: TutelaSearchNovedadesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Novedades de Tutelas
        </CardTitle>
        <CardDescription>
          Retorna las novedades de tutelas para una fecha especifica.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="fechaNovTut">Fecha de novedades</Label>
            <Input
              id="fechaNovTut"
              type="date"
              value={fecha}
              onChange={(e) => onFechaChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={onSearch} disabled={loading || !isConfigured} className="w-full md:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            {loading ? "Buscando..." : "Consultar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
