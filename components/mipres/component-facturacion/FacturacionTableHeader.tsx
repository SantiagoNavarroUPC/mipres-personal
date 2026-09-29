"use client"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Boxes, FileSpreadsheet, Receipt, Search, SlidersHorizontal, X } from "lucide-react"
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
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Facturación</h3>
          <Badge variant="secondary" className="text-xs">
            {filtered}
          </Badge>
          {filtered !== total && (
            <span className="text-xs text-muted-foreground">de {total}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 rounded-lg bg-white dark:bg-card text-foreground border-input hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shadow-2xs"
          onClick={onExport}
          disabled={filtered === 0}
        >
          <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Exportar</span>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] group">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            placeholder="Buscar por prescripción o factura..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-white dark:bg-card pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/70 shadow-2xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <Select value={tipoTecFilter} onValueChange={onTipoTecChange}>
          <SelectTrigger className="w-[165px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <Boxes className="size-3.5 text-primary shrink-0" />
              <span className="truncate"><SelectValue placeholder="Tipo tecnología" /></span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tipo: Todos</SelectItem>
            {Object.entries(TIPOS_TEC_FACTURACION).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={onEstadoChange}>
          <SelectTrigger className="w-[145px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado: Todos</SelectItem>
            {Object.entries(ESTADOS_FACTURACION).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
