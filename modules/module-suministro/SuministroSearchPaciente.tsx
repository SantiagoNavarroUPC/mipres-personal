"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Search, User, Calendar, IdCard, Loader2 } from "lucide-react"
import { TIPOS_DOCUMENTO } from "@/models/constants"
import { SearchLoadingProgress } from "@/components/SearchLoadingProgress"

interface SuministroSearchPacienteProps {
  fecha: string
  tipoDocumento: string
  numeroDocumento: string
  loading: boolean
  isConfigured: boolean
  onFechaChange: (f: string) => void
  onTipoDocumentoChange: (t: string) => void
  onNumeroDocumentoChange: (n: string) => void
  onSearch: () => void
}

export function SuministroSearchPaciente({
  fecha,
  tipoDocumento,
  numeroDocumento,
  loading,
  isConfigured,
  onFechaChange,
  onTipoDocumentoChange,
  onNumeroDocumentoChange,
  onSearch,
}: SuministroSearchPacienteProps) {
  return (
    <Card className="relative overflow-hidden rounded-xl border border-border/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
      <CardHeader>
        <CardTitle className="leading-none font-semibold flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <User className="size-3.5" />
          </span>
          Consulta por Paciente y Fecha
        </CardTitle>
        <CardDescription>
          Busca los suministros asociados a un paciente en una fecha específica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="fecha" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Fecha
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => onFechaChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              disabled={loading}
            />
          </div>

          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="tipoDocumento" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <IdCard className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Tipo Documento
            </Label>
            <Select value={tipoDocumento} onValueChange={onTipoDocumentoChange}>
              <SelectTrigger className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm rounded-xl">
                <SelectValue placeholder="Seleccione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_DOCUMENTO).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {key} - {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="group flex flex-col gap-1.5">
            <Label htmlFor="numeroDocumento" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <User className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              Número de documento
            </Label>
            <Input
              id="numeroDocumento"
              placeholder="Número de documento"
              value={numeroDocumento}
              onChange={(e) => onNumeroDocumentoChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              disabled={loading}
            />
          </div>

          <div>
            <Button
              onClick={onSearch}
              disabled={loading || !isConfigured}
              className="relative overflow-hidden group h-9 w-full font-semibold text-sm bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl"
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
        </div>

        <SearchLoadingProgress loading={loading} />
      </CardContent>
    </Card>
  )
}
