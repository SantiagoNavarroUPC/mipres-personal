"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CheckCircle2, FileCheck2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Entrega } from "@/models/mipres-sispro/entrega/entrega"
import type { MipresCredentials } from "@/models/credentials.model"

interface ReporteEntregaPopoverProps {
  entregas: Entrega[]
  credentials: MipresCredentials
  reportados: Set<string>
  onReportado: (entregaKey: string) => void
  onOpen?: () => void
}

export function getEntregaKey(entrega: Entrega): string {
  return String(entrega.ID ?? entrega.IDEntrega)
}

function isVigente(entrega: Entrega): boolean {
  return !entrega.FecAnulacion && Number(entrega.EstEntrega) !== 0
}

function resolveToken(entrega: Entrega, credentials: MipresCredentials): string | undefined {
  if (entrega.tipoRegimen === "Subsidiado") return credentials.tokenAccesoSubsidiado
  if (entrega.tipoRegimen === "Contributivo") return credentials.tokenAccesoContributivo
  return credentials.tokenAcceso
}

// ReporteEntrega toma todo de la entrega excepto ValorEntregado, que no viene en ella.
function buildReportePayload(entrega: Entrega, valorEntregado: string) {
  const cantidad = Number(String(entrega.CantTotEntregada ?? "").replace(",", "."))
  const seEntrego = Number.isFinite(cantidad) && cantidad > 0
  return {
    ID: entrega.ID,
    EstadoEntrega: seEntrego ? 1 : 0,
    CausaNoEntrega: seEntrego ? 0 : Number(entrega.CausaNoEntrega ?? 0),
    ValorEntregado: valorEntregado,
  }
}

function getMipresErrorMessage(result: any, fallback: string): string {
  if (result?.details?.Errors && Array.isArray(result.details.Errors)) return result.details.Errors[0]
  if (result?.Errors && Array.isArray(result.Errors)) return result.Errors[0]
  return result?.error || fallback
}

export function ReporteEntregaPopover({ entregas, credentials, reportados, onReportado, onOpen }: ReporteEntregaPopoverProps) {
  const vigentes = entregas.filter(isVigente)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [enviandoKey, setEnviandoKey] = useState<string | null>(null)

  const pendientes = vigentes.filter((e) => !reportados.has(getEntregaKey(e))).length

  const handleReportar = async (entrega: Entrega) => {
    const key = getEntregaKey(entrega)
    const valor = String(valores[key] ?? "").trim()

    if (!valor || !Number.isFinite(Number(valor)) || Number(valor) < 0) {
      toast.error("Ingrese un valor entregado válido")
      return
    }

    const token = resolveToken(entrega, credentials)
    if (!credentials.nit || !token) {
      toast.error(`NIT o token ${entrega.tipoRegimen || "Principal"} no configurado`)
      return
    }

    setEnviandoKey(key)
    try {
      const response = await fetch("/api/mipres/reporte-entrega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit: credentials.nit,
          tokenAcceso: token,
          payload: buildReportePayload(entrega, valor),
        }),
      })
      const result = await response.json()

      if (response.ok && result.success) {
        onReportado(key)
        toast.success(`Reporte de entrega registrado: ${entrega.TipoTec ?? ""}${entrega.ConTec ?? ""}`)
      } else {
        toast.error(getMipresErrorMessage(result, "Error al registrar reporte de entrega"))
      }
    } catch {
      toast.error("Error de conexión con el servidor")
    } finally {
      setEnviandoKey(null)
    }
  }

  if (vigentes.length === 0) return null

  return (
    <Popover onOpenChange={(open) => { if (open) onOpen?.() }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`group relative h-7 w-7 ${pendientes === 0 ? "text-emerald-600 hover:text-emerald-600" : "text-primary hover:text-primary"} hover:bg-primary/10`}
          title="Realizar reporte de entrega"
        >
          <FileCheck2 className="h-3.5 w-3.5" />
          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
            Realizar reporte de entrega
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reporte de entrega</p>
            <p className="text-[11px] text-muted-foreground">
              {pendientes} de {vigentes.length} pendiente(s) por reportar
            </p>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {vigentes.map((entrega) => {
              const key = getEntregaKey(entrega)
              const reportado = reportados.has(key)
              const enviando = enviandoKey === key
              return (
                <div key={key} className="rounded-md border p-2.5 space-y-2 bg-background/60">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium">
                      {entrega.TipoTec}{entrega.ConTec} · Entrega {entrega.NoEntrega ?? "-"}
                    </span>
                    <span className="text-muted-foreground">Cant. {entrega.CantTotEntregada || "0"}</span>
                  </div>
                  {reportado ? (
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-3.5" />
                      Reporte registrado
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Valor entregado"
                        value={valores[key] ?? ""}
                        onChange={(e) => setValores((prev) => ({ ...prev, [key]: e.target.value }))}
                        disabled={enviando}
                        className="h-8 text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs shrink-0"
                        onClick={() => void handleReportar(entrega)}
                        disabled={enviando || enviandoKey !== null}
                      >
                        {enviando ? <Loader2 className="size-3.5 animate-spin" /> : "Reportar"}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
