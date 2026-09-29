"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Receipt, Loader2 } from "lucide-react"
import { SearchLoadingProgress } from "@/components/SearchLoadingProgress"

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
    <Card className="relative overflow-hidden rounded-xl border border-border/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
      <CardHeader>
        <CardTitle className="leading-none font-semibold flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Receipt className="size-3.5" />
          </span>
          Consulta por Numero de Factura
        </CardTitle>
        <CardDescription>
          Busca la prescripcion asociada al numero de factura y retorna toda la informacion del anexo tecnico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 group flex flex-col gap-1.5">
            <Label htmlFor="noFactura" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Receipt className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Numero de Factura
            </Label>
            <Input
              id="noFactura"
              placeholder="Ej: DU5654"
              value={noFactura}
              onChange={(e) => onNoFacturaChange(e.target.value.toUpperCase())}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl font-mono placeholder:font-sans"
              disabled={loading}
            />
          </div>
          <Button
            onClick={onSearch}
            disabled={loading || !isConfigured}
            className="relative overflow-hidden group h-9 w-full md:w-auto font-semibold text-sm bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            {loading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Search className="size-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
            )}
            <span>{loading ? "Buscando..." : "Consultar"}</span>
          </Button>
        </div>

        <SearchLoadingProgress loading={loading} />
      </CardContent>
    </Card>
  )
}
