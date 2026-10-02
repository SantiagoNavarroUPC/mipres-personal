"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  AlertTriangle,
  User,
  Calendar,
  Hash,
  ArrowLeft,
  CalendarClock,
  Building2,
  Package,
  Layers,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react"
import type { Programacion } from "@/models/mipres-sispro/programacion/programacion"
import { TIPOS_TECNOLOGIAS } from "@/models/constants"

interface ProgramacionLecturaModalProps {
  programaciones: Programacion[]
  open: boolean
  onClose: () => void
  noPrescripcion: string
  onFormVisibilityChange?: (open: boolean) => void
}

const ESTADOS_PROGRAMACION: Record<number, string> = {
  0: "Anulado",
  1: "Activo",
  2: "Procesado / Programado",
}

export function getEstadoProgramacionLabel(estado?: number | null): string {
  if (estado === undefined || estado === null) return "N/A"
  return ESTADOS_PROGRAMACION[Number(estado)] ?? `Estado ${estado}`
}

export function getEstadoProgramacionClass(estado?: number | null): string {
  if (estado === undefined || estado === null) return "bg-muted text-muted-foreground border-border"
  if (Number(estado) === 0) return "bg-destructive/10 text-destructive border-destructive/20"
  if (Number(estado) === 2) return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
  return "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300"
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  return value.includes("T") ? value.replace("T", " ") : value
}

export function ProgramacionLecturaModal({
  programaciones,
  open,
  onClose,
  noPrescripcion,
  onFormVisibilityChange,
}: ProgramacionLecturaModalProps) {
  const [page, setPage] = useState(1)

  const sortedProgramaciones = useMemo(() => {
    const toNum = (v?: unknown) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
    }

    return [...(programaciones || [])].sort((a, b) => {
      const ac = toNum(a.ConTec)
      const bc = toNum(b.ConTec)
      if (ac !== bc) return ac - bc
      return toNum(a.NoEntrega) - toNum(b.NoEntrega)
    })
  }, [programaciones])

  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  useEffect(() => {
    setPage(1)
  }, [open, noPrescripcion])

  const current = sortedProgramaciones[page - 1]

  if (!open || !programaciones || programaciones.length === 0) return null

  const techNombre = current?.TipoTec
    ? (TIPOS_TECNOLOGIAS as Record<string, string>)[current.TipoTec] || current.TipoTec
    : "Tecnología"

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Header */}
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
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold leading-none text-foreground">
              Detalle de Programación Registrada
            </h2>
            <Badge
              variant="outline"
              className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="size-3 mr-1" />
              Programación Vigente
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
            <span>Prescripción</span>
            <span className="font-mono font-semibold text-primary">{noPrescripcion}</span>
            {sortedProgramaciones.length > 1 && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span>
                  Registro <strong className="text-foreground">{page}</strong> de{" "}
                  <strong className="text-foreground">{sortedProgramaciones.length}</strong>
                </span>
              </>
            )}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs rounded-lg hidden sm:flex">
          Volver a la tabla
        </Button>
      </div>

      {/* Stepper / pestañas cuando hay múltiples entregas programadas */}
      {sortedProgramaciones.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span className="font-medium flex items-center gap-1">
              <Layers className="size-3.5 text-primary" />
              Entregas programadas ({sortedProgramaciones.length})
            </span>
            <span>Ítem {page} de {sortedProgramaciones.length}</span>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/70 overflow-x-auto">
            {sortedProgramaciones.map((item, idx) => {
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
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
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
              Fecha de Programación
            </span>
            <div className="font-semibold text-sm font-mono text-foreground mt-0.5">
              {formatDateTime(current?.FecProgramacion)}
            </div>
            <div className="mt-1">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getEstadoProgramacionClass(current?.EstProgramacion)}`}>
                {getEstadoProgramacionLabel(current?.EstProgramacion)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tarjeta principal con la grilla completa de campos de la programación */}
      <Card className="p-5 rounded-xl border border-border/80 bg-card shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Datos Registrados en MIPRES
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-mono">
              ID MIPRES: {current?.ID ?? "—"}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              ID Prog: {current?.IDProgramacion ?? "—"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              ID Direccionamiento
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block">
              {current?.ID ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              ID Programación
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block">
              {current?.IDProgramacion ?? "—"}
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
              Fecha Máxima de Entrega
            </span>
            <span className="text-xs font-mono font-semibold text-foreground mt-1 block">
              {formatDateTime(current?.FecMaxEnt)}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Sede Proveedor (Tipo e ID)
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block">
              {current?.TipoIDSedeProv && current?.NoIDSedeProv
                ? `${current.TipoIDSedeProv}: ${current.NoIDSedeProv}`
                : "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-primary/30 bg-primary/[0.04]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block flex items-center gap-1">
              <Building2 className="size-3" />
              Código Sede Proveedor
            </span>
            <span className="text-xs font-mono font-bold text-foreground mt-1 block">
              {current?.CodSedeProv ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Código Servicio / Tecnología
            </span>
            <span className="text-xs font-mono font-medium text-foreground mt-1 block truncate" title={current?.CodSerTecAEntregar}>
              {current?.CodSerTecAEntregar ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Cantidad Total a Entregar
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">
              {current?.CantTotAEntregar ?? "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Estado de Programación
            </span>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getEstadoProgramacionClass(current?.EstProgramacion)}`}>
                {getEstadoProgramacionLabel(current?.EstProgramacion)}
              </span>
            </div>
          </div>
        </div>

        {/* Alerta de Anulación si aplica */}
        {current?.FecAnulacion && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
            <ShieldAlert className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs">Programación Anulada</p>
              <p className="text-[11px] mt-0.5">
                Esta programación fue anulada en fecha: <span className="font-mono font-semibold">{formatDateTime(current.FecAnulacion)}</span>
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Pager en el footer cuando hay múltiples entregas */}
      {sortedProgramaciones.length > 1 && (
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
            <span className="text-foreground font-semibold">{sortedProgramaciones.length}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(sortedProgramaciones.length, p + 1))}
            disabled={page >= sortedProgramaciones.length}
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
