"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  User,
  Calendar,
  Hash,
  ArrowLeft,
  Truck,
  Building2,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Boxes,
} from "lucide-react"
import type { Entrega } from "@/models/mipres-sispro/entrega/entrega"
import { CAUSAS_NO_ENTREGAS, ESTADOS_REPORTE_ENTREGA, TIPOS_TECNOLOGIAS } from "@/models/constants"

interface EntregaLecturaModalProps {
  entregas: Entrega[]
  open: boolean
  onClose: () => void
  noPrescripcion: string
  onFormVisibilityChange?: (open: boolean) => void
}

const ESTADOS_ENTREGA: Record<number, string> = {
  0: "Anulado",
  1: "Activo / Registrado",
  2: "Procesado / Entregado",
}

export function getEstadoEntregaLabel(estado?: number | null): string {
  if (estado === undefined || estado === null) return "N/A"
  return (
    ESTADOS_ENTREGA[Number(estado)] ??
    (ESTADOS_REPORTE_ENTREGA as Record<number, string>)[Number(estado)] ??
    `Estado ${estado}`
  )
}

export function getEstadoEntregaClass(estado?: number | null): string {
  if (estado === undefined || estado === null) return "bg-muted text-muted-foreground border-border"
  if (Number(estado) === 0) return "bg-destructive/10 text-destructive border-destructive/20"
  if (Number(estado) === 2) return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
  return "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300"
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  return value.includes("T") ? value.replace("T", " ") : value
}

export function EntregaLecturaModal({
  entregas,
  open,
  onClose,
  noPrescripcion,
  onFormVisibilityChange,
}: EntregaLecturaModalProps) {
  const [page, setPage] = useState(1)

  const sortedEntregas = useMemo(() => {
    const toNum = (v?: unknown) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
    }

    return [...(entregas || [])].sort((a, b) => {
      const ac = toNum(a.ConTec)
      const bc = toNum(b.ConTec)
      if (ac !== bc) return ac - bc
      return toNum(a.NoEntrega) - toNum(b.NoEntrega)
    })
  }, [entregas])

  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  useEffect(() => {
    setPage(1)
  }, [open, noPrescripcion])

  const current = sortedEntregas[page - 1]

  if (!open || !entregas || entregas.length === 0) return null

  const techNombre = current?.TipoTec
    ? (TIPOS_TECNOLOGIAS as Record<string, string>)[current.TipoTec] || current.TipoTec
    : "Tecnología"

  const esEntregaTotal = Number(current?.EntTotal) === 1
  const causaNoEntrega = Number(current?.CausaNoEntrega ?? 0)
  const causaLabel = causaNoEntrega > 0 ? (CAUSAS_NO_ENTREGAS as Record<number, string>)[causaNoEntrega] || `Causa ${causaNoEntrega}` : null

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Header tipo DireccionamientoViewForm */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0 h-9 w-9 rounded-lg hover:bg-muted"
          title="Volver a la tabla"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Truck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold leading-none text-foreground">
              Detalle de Entrega Registrada
            </h2>
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold ${
                esEntregaTotal
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
            >
              {esEntregaTotal ? (
                <>
                  <CheckCircle2 className="size-3 mr-1" />
                  Entrega Total
                </>
              ) : (
                <>
                  <AlertCircle className="size-3 mr-1" />
                  Entrega Parcial
                </>
              )}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
            <span>Prescripción</span>
            <span className="font-mono font-semibold text-primary">{noPrescripcion}</span>
            {sortedEntregas.length > 1 && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span>
                  Registro <strong className="text-foreground">{page}</strong> de{" "}
                  <strong className="text-foreground">{sortedEntregas.length}</strong>
                </span>
              </>
            )}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs rounded-lg hidden sm:flex">
          Volver a la tabla
        </Button>
      </div>

      {/* Stepper / pestañas cuando hay múltiples entregas registradas */}
      {sortedEntregas.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span className="font-medium flex items-center gap-1">
              <Layers className="size-3.5 text-primary" />
              Entregas registradas ({sortedEntregas.length})
            </span>
            <span>Ítem {page} de {sortedEntregas.length}</span>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/70 overflow-x-auto">
            {sortedEntregas.map((item, idx) => {
              const active = page === idx + 1
              return (
                <button
                  key={`${item.ID || idx}-${item.NoEntrega}`}
                  type="button"
                  onClick={() => setPage(idx + 1)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    active
                      ? "bg-white dark:bg-card text-foreground shadow-2xs border border-border/90 font-semibold ring-1 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <span className={`size-2 rounded-full ${Number(item.EntTotal) === 1 ? "bg-emerald-500" : "bg-amber-500"} shrink-0`} />
                  <span>
                    {item.TipoTec}
                    {item.ConTec} · Entrega {item.NoEntrega}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tarjetas superiores de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Card className="p-4 rounded-xl border border-border/80 bg-card shadow-2xs flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground block uppercase tracking-wider">
              Paciente
            </span>
            <div className="font-semibold text-sm font-mono mt-0.5 text-foreground truncate">
              {current?.TipoIDPaciente && current?.NoIDPaciente
                ? `${current.TipoIDPaciente} - ${current.NoIDPaciente}`
                : "No disponible"}
            </div>
            {current?.tipoRegimen && (
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Régimen: {current.tipoRegimen}
              </span>
            )}
          </div>
        </Card>

        <Card className="p-4 rounded-xl border border-border/80 bg-card shadow-2xs flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
            <Hash className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground block uppercase tracking-wider">
              Tecnología y Entrega
            </span>
            <div className="font-semibold text-sm text-foreground mt-0.5 truncate" title={`${techNombre} #${current?.ConTec ?? ""}`}>
              {techNombre} <span className="font-mono text-muted-foreground">#{current?.ConTec ?? "—"}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Entrega No. {current?.NoEntrega ?? "1"}
            </span>
          </div>
        </Card>

        <Card className="p-4 rounded-xl border border-border/80 bg-card shadow-2xs flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground block uppercase tracking-wider">
              Fecha de Entrega
            </span>
            <div className="font-semibold text-sm font-mono text-foreground mt-0.5">
              {formatDateTime(current?.FecEntrega)}
            </div>
            <div className="mt-1">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getEstadoEntregaClass(current?.EstEntrega)}`}>
                {getEstadoEntregaLabel(current?.EstEntrega)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tarjeta principal con la grilla completa de campos de la entrega */}
      <Card className="p-5 rounded-xl border border-border/80 bg-card shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Datos Registrados en MIPRES
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-mono">
              ID: {current?.ID ?? "—"}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              ID Entrega: {current?.IDEntrega ?? "—"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              ID Registro
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block">
              {current?.ID ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              ID Entrega
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block">
              {current?.IDEntrega ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Número de Entrega
            </span>
            <span className="text-xs font-semibold text-foreground mt-1 block">
              Entrega {current?.NoEntrega ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Código Servicio / Tecnología Entregado
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block truncate" title={current?.CodSerTecEntregado}>
              {current?.CodSerTecEntregado ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Cantidad Total Entregada
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">
              {current?.CantTotEntregada ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Modalidad de Entrega
            </span>
            <div className="mt-1">
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  esEntregaTotal
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                {esEntregaTotal ? "Entrega Total (100%)" : "Entrega Parcial"}
              </Badge>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Número de Lote
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block">
              {current?.NoLote || "Sin lote registrado"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Persona que Recibe
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block">
              {current?.TipoIDRecibe && current?.NoIDRecibe
                ? `${current.TipoIDRecibe} ${current.NoIDRecibe}`
                : "No especificado"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Estado de Entrega
            </span>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getEstadoEntregaClass(current?.EstEntrega)}`}>
                {getEstadoEntregaLabel(current?.EstEntrega)}
              </span>
            </div>
          </div>

          {causaLabel && (
            <div className="p-3 rounded-lg border border-amber-300/70 bg-amber-50/50 dark:bg-amber-950/20 sm:col-span-2 lg:col-span-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                Causa de No Entrega Total
              </span>
              <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mt-1">
                {causaLabel}
              </p>
            </div>
          )}
        </div>

        {/* Alerta de Anulación si aplica */}
        {current?.FecAnulacion && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
            <ShieldAlert className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs">Entrega Anulada</p>
              <p className="text-[11px] mt-0.5">
                Esta entrega fue anulada en fecha: <span className="font-mono font-semibold">{formatDateTime(current.FecAnulacion)}</span>
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Pager en el footer cuando hay múltiples entregas */}
      {sortedEntregas.length > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-8.5 text-xs rounded-lg gap-1.5"
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <p className="text-xs text-muted-foreground font-medium">
            Entrega <span className="text-foreground font-semibold">{page}</span> de{" "}
            <span className="text-foreground font-semibold">{sortedEntregas.length}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(sortedEntregas.length, p + 1))}
            disabled={page >= sortedEntregas.length}
            className="h-8.5 text-xs rounded-lg gap-1.5"
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Alias de conveniencia
export const EntregaLecturaView = EntregaLecturaModal
