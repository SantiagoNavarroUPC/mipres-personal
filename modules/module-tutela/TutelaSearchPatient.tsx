"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, User, Calendar, IdCard, Loader2 } from "lucide-react"
import { SearchLoadingProgress } from "@/components/SearchLoadingProgress"
import { TIPOS_DOCUMENTO } from "@/models/constants"

interface TutelaSearchPatientProps {
  fecha: string
  fechaFinPac: string
  tipoDoc: string
  numDoc: string
  loading: boolean
  loadingRango: boolean
  rangoProgress: number
  rangoInfo: string | null
  isConfigured: boolean
  onFechaChange: (value: string) => void
  onFechaFinChange: (value: string) => void
  onTipoDocChange: (value: string) => void
  onNumDocChange: (value: string) => void
  onSearch: () => void
}

export function TutelaSearchPatient({
  fecha,
  fechaFinPac,
  tipoDoc,
  numDoc,
  loading,
  loadingRango,
  rangoProgress,
  rangoInfo,
  isConfigured,
  onFechaChange,
  onFechaFinChange,
  onTipoDocChange,
  onNumDocChange,
  onSearch,
}: TutelaSearchPatientProps) {
  const tieneFechas = Boolean(fecha || fechaFinPac)
  const requiereTipoDoc = tieneFechas
  const isSearching = loading || loadingRango

  return (
    <Card className="relative overflow-hidden rounded-xl border border-border/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
      <CardHeader>
        <CardTitle className="leading-none font-semibold flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <User className="size-3.5" />
          </span>
          Consulta por Paciente
        </CardTitle>
        <CardDescription>
          Retorna tutelas de un paciente por fecha especifica o rango de fechas. Si no ingresa fechas, consulta por documento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="group flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <Label htmlFor="fechaPacTut" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                Fecha Inicial (Opcional)
              </Label>
              <Input
                id="fechaPacTut"
                type="date"
                value={fecha}
                onChange={(e) => onFechaChange(e.target.value)}
                className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
                disabled={isSearching}
              />
            </div>
            <div className="group flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <Label htmlFor="fechaFinPacTut" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                Fecha Final (Opcional)
              </Label>
              <Input
                id="fechaFinPacTut"
                type="date"
                value={fechaFinPac}
                onChange={(e) => onFechaFinChange(e.target.value)}
                className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
                placeholder="Opcional"
                disabled={isSearching}
              />
            </div>
            <div className="group flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <Label htmlFor="tipoDocTut" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <IdCard className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                Tipo Documento
              </Label>
              <Select
                value={tipoDoc || "__seleccione__"}
                onValueChange={(value) => onTipoDocChange(value === "__seleccione__" ? "" : value)}
              >
                <SelectTrigger className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm rounded-xl">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__seleccione__">Seleccione...</SelectItem>
                  {Object.entries(TIPOS_DOCUMENTO).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {key} - {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="group flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <Label htmlFor="numDocTut" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <User className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                Número Documento
              </Label>
              <Input
                id="numDocTut"
                placeholder="Ej. 12345678"
                value={numDoc}
                onChange={(e) => onNumDocChange(e.target.value)}
                className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
                disabled={isSearching}
              />
            </div>
            <div className="pb-0.5 flex-1 min-w-[140px]">
              <Button 
                onClick={onSearch} 
                disabled={isSearching || !numDoc || !isConfigured || (requiereTipoDoc && !tipoDoc)} 
                className="relative overflow-hidden group h-9 w-full font-semibold text-sm bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl"
              >
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                  aria-hidden="true"
                />
                {isSearching ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Search className="size-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                )}
                <span>{loadingRango ? "Consultando..." : loading ? "Consultando..." : "Consultar"}</span>
              </Button>
            </div>
          </div>

          <SearchLoadingProgress
            loading={loading}
            loadingRango={loadingRango}
            rangoProgress={rangoProgress}
            rangoInfo={rangoInfo}
          />
        </div>
      </CardContent>
    </Card>
  )
}
