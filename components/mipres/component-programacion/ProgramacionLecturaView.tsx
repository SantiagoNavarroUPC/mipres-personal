"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, User, Calendar, Hash, ArrowLeft, CalendarClock } from "lucide-react"
import type { Programacion } from "@/models/mipres-sispro/programacion/programacion"
import { ESTADOS_REPORTE_ENTREGA, TIPOS_TECNOLOGIAS } from "@/models/constants"

interface ProgramacionLecturaModalProps {
  programaciones: Programacion[]
  open: boolean
  onClose: () => void
  noPrescripcion: string
  onFormVisibilityChange?: (open: boolean) => void
}

const ESTADO_BADGE_CLASS: Record<number, string> = {
  0: "bg-destructive/10 text-destructive border-destructive/20",
  1: "bg-emerald-50 text-emerald-700 border-emerald-200",
  2: "bg-sky-50 text-sky-700 border-sky-200",
}

export function getEstadoProgramacionLabel(estado?: number | null): string {
  if (estado === undefined || estado === null) return "N/A"
  return (ESTADOS_REPORTE_ENTREGA as Record<number, string>)[Number(estado)] ?? `Estado ${estado}`
}

export function getEstadoProgramacionClass(estado?: number | null): string {
  if (estado === undefined || estado === null) return "bg-muted text-muted-foreground border-border"
  return ESTADO_BADGE_CLASS[Number(estado)] ?? "bg-muted text-muted-foreground border-border"
}

const FIELD_CLASS = "mt-1 bg-amber-100 border-[#f5e6b5] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A"
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

  const fields: { label: string; value: string | number }[] = [
    { label: "ID", value: current?.ID ?? "N/A" },
    { label: "ID Programación", value: current?.IDProgramacion ?? "N/A" },
    { label: "Número de Entrega", value: current?.NoEntrega ?? "N/A" },
    { label: "Fecha Máxima de Entrega", value: formatDateTime(current?.FecMaxEnt) },
    { label: "Código Servicio/Tecnología a Entregar", value: current?.CodSerTecAEntregar ?? "N/A" },
    { label: "Cantidad Total a Entregar", value: current?.CantTotAEntregar ?? "N/A" },
    {
      label: "Sede Proveedor",
      value: current?.TipoIDSedeProv && current?.NoIDSedeProv
        ? `${current.TipoIDSedeProv} - ${current.NoIDSedeProv}`
        : "N/A",
    },
    { label: "Código Sede Proveedor", value: current?.CodSedeProv ?? "N/A" },
  ]

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-amber-100">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-none">Detalle de Programación</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prescripción <span className="font-mono font-semibold text-primary">{noPrescripcion}</span>
            {sortedProgramaciones.length > 1 && (
              <> · Registro <span className="font-semibold">{page}</span> de <span className="font-semibold">{sortedProgramaciones.length}</span></>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#f5e6b5] bg-amber-100 p-4 flex items-start gap-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="p-2 rounded-md bg-amber-50 text-amber-700 dark:bg-zinc-800 dark:text-amber-300">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Paciente</div>
            <div className="font-semibold text-base">
              {current?.TipoIDPaciente && current?.NoIDPaciente
                ? `${current.TipoIDPaciente} - ${current.NoIDPaciente}`
                : "No disponible"}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#f5e6b5] bg-amber-100 p-4 flex items-start gap-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="p-2 rounded-md bg-amber-50 text-amber-700 dark:bg-zinc-800 dark:text-amber-300">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tecnología</div>
            <div className="font-semibold text-base">
              {current?.TipoTec ? (TIPOS_TECNOLOGIAS[current.TipoTec as keyof typeof TIPOS_TECNOLOGIAS] || current.TipoTec) : "Tecnología"}{" "}
              <span className="text-muted-foreground">#{current?.ConTec ?? "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#f5e6b5] bg-amber-100 p-4 flex items-start gap-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="p-2 rounded-md bg-amber-50 text-amber-700 dark:bg-zinc-800 dark:text-amber-300">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fecha Programación</div>
            <div className="font-semibold text-base">{formatDateTime(current?.FecProgramacion)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.label}>
              <Label>{field.label}</Label>
              <Input value={field.value} readOnly className={FIELD_CLASS} />
            </div>
          ))}

          <div>
            <Label>Estado Programación</Label>
            <div className={`mt-1 h-10 px-3 py-2 rounded-md border text-sm flex items-center ${getEstadoProgramacionClass(current?.EstProgramacion)}`}>
              {getEstadoProgramacionLabel(current?.EstProgramacion)}
            </div>
          </div>

          {current?.FecAnulacion && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <div className="p-2 rounded-md bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <Label className="text-destructive">Fecha Anulación</Label>
                <Input value={formatDateTime(current.FecAnulacion)} readOnly className="mt-1 bg-destructive/10 text-destructive border-destructive/20" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end pt-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <p className="text-xs text-muted-foreground">
            {page} / {sortedProgramaciones.length}
          </p>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(sortedProgramaciones.length, p + 1))}
            disabled={page >= sortedProgramaciones.length}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
