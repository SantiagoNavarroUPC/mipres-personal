"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Search } from "lucide-react"

interface TutelaSearchNumberProps {
  noTutela: string
  loading: boolean
  isConfigured: boolean
  onNoTutelaChange: (value: string) => void
  onSearch: () => void
}

export function TutelaSearchNumber({
  noTutela,
  loading,
  isConfigured,
  onNoTutelaChange,
  onSearch,
}: TutelaSearchNumberProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Consulta por Numero de Tutela
        </CardTitle>
        <CardDescription>
          Retorna la informacion del anexo tecnico por numero de tutela.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="noTutela">Numero de Tutela</Label>
            <Input
              id="noTutela"
              placeholder="Digite el numero de la tutela"
              value={noTutela}
              onChange={(e) => onNoTutelaChange(e.target.value)}
              className="mt-1"
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
