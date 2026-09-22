"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download, Search } from "lucide-react"
import { ESTADOS_FACTURACION, TIPOS_TEC_FACTURACION } from "@/models/constants"

interface FacturacionTableHeaderProps {
  search: string
  tipoTecFilter: string
  estadoFilter: string
  onSearchChange: (value: string) => void
  onTipoTecChange: (value: string) => void
  onEstadoChange: (value: string) => void
  onExport: () => void
  total: number
  filtered: number
}

export function FacturacionTableHeader({
  search,
  tipoTecFilter,
  estadoFilter,
  onSearchChange,
  onTipoTecChange,
  onEstadoChange,
  onExport,
  total,
  filtered,
}: FacturacionTableHeaderProps) {
  return (
    <div className="flex flex-col gap-3 p-4 border-b">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered} de {total} registro{total !== 1 ? "s" : ""}
        </p>
        <Button variant="outline" size="sm" onClick={onExport} disabled={filtered === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por prescripción o factura..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={tipoTecFilter} onValueChange={onTipoTecChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo tecnología" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(TIPOS_TEC_FACTURACION).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={onEstadoChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(ESTADOS_FACTURACION).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
