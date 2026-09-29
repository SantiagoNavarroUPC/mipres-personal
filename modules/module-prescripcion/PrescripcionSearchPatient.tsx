"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, User, Calendar, IdCard, Loader2 } from "lucide-react"
import { TIPOS_DOCUMENTO } from "@/models/mipres-sispro/prescripcion"
import { SearchLoadingProgress } from "@/components/SearchLoadingProgress"

interface PrescripcionSearchPatientProps {
  fechaPac: string
  fechaFinPac: string
  tipoDoc: string
  numDoc: string
  loading: boolean
  loadingRango: boolean
  rangoProgress: number
  rangoInfo: string | null
  isConfigured: boolean
  onFechaPacChange: (date: string) => void
  onFechaFinPacChange: (date: string) => void
  onTipoDocChange: (type: string) => void
  onNumDocChange: (num: string) => void
  onSearch: () => void
}

export function PrescripcionSearchPatient({
  fechaPac,
  fechaFinPac,
  tipoDoc,
  numDoc,
  loading,
  loadingRango,
  rangoProgress,
  rangoInfo,
  isConfigured,
  onFechaPacChange,
  onFechaFinPacChange,
  onTipoDocChange,
  onNumDocChange,
  onSearch,
}: PrescripcionSearchPatientProps) {
  const tieneFechas = Boolean(fechaPac || fechaFinPac)
  const requiereTipoDoc = tieneFechas

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
          Busca por documento. Si deja fechas en blanco, se consulta por prescripciones del paciente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="group flex-1 min-w-[140px] flex flex-col gap-1.5">
              <Label htmlFor="fechaPac" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                Fecha Inicial (Opcional)
              </Label>
              <Input
                id="fechaPac"
                type="date"
                value={fechaPac}
                onChange={(e) => onFechaPacChange(e.target.value)}
                className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
              />
            </div>
            <div className="group flex-1 min-w-[140px] flex flex-col gap-1.5">
              <Label htmlFor="fechaFinPac" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <Calendar className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                Fecha Final (Opcional)
              </Label>
              <Input
                id="fechaFinPac"
                type="date"
                value={fechaFinPac}
                onChange={(e) => onFechaFinPacChange(e.target.value)}
                className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
                placeholder="Opcional"
              />
            </div>
            <div className="group flex-1 min-w-[180px] flex flex-col gap-1.5">
              <Label htmlFor="tipoDoc" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
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
            <div className="group flex-1 min-w-[140px] flex flex-col gap-1.5">
              <Label htmlFor="numDoc" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <User className="size-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                Número Documento
              </Label>
              <Input
                id="numDoc"
                type="text"
                value={numDoc}
                onChange={(e) => onNumDocChange(e.target.value)}
                className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
                placeholder="Ej. 12345678"
              />
            </div>
            <div className="pb-0.5 flex-1 min-w-[140px]">
              <Button 
                onClick={onSearch} 
                disabled={loading || !numDoc || !isConfigured || (requiereTipoDoc && !tipoDoc)}
                className="relative overflow-hidden group h-9 w-full font-semibold text-sm bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl"
              >
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                  aria-hidden="true"
                />
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 size-4 transition-transform duration-200 group-hover:scale-110" />
                    Consultar
                  </>
                )}
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
