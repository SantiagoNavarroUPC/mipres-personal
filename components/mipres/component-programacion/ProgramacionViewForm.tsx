"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CalendarClock,
  Calendar,
  Building2,
  Lock,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowRight,
  ArrowLeft,
  User,
  Hash,
  Package,
  Info,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento/direccionamiento"
import type { MipresCredentials } from "@/models/credentials.model"
import { TIPOS_TECNOLOGIAS } from "@/models/constants"

interface ProgramacionViewFormProps {
  items: Direccionamiento[]
  credentials: MipresCredentials
  onClose: () => void
  onSuccess?: () => void
  onFormVisibilityChange?: (open: boolean) => void
}

interface ProgramacionForm {
  FecMaxEnt: string
  TipoIDSedeProv: string
  NoIDSedeProv: string
  CodSedeProv: string
  CodSerTecAEntregar: string
  CantTotAEntregar: string
}

export type EstadoProgramacion = "anulado" | "pendiente" | "programado"

export function getEstadoProgramacion(item: Direccionamiento): EstadoProgramacion {
  if (item.FecAnulacion || Number(item.EstDireccionamiento) === 0) return "anulado"
  if (Number(item.EstDireccionamiento) === 2) return "programado"
  return "pendiente"
}

const PROGRAMACION_FIELDS: Array<{
  key: keyof ProgramacionForm
  label: string
  type?: "date"
  source?: keyof Direccionamiento
}> = [
  { key: "FecMaxEnt", label: "Fecha máxima de entrega", type: "date", source: "FecMaxEnt" },
  { key: "TipoIDSedeProv", label: "Tipo ID sede proveedora", source: "TipoIDProv" },
  { key: "NoIDSedeProv", label: "No. ID sede proveedora", source: "NoIDProv" },
  { key: "CodSedeProv", label: "Código sede proveedora" },
  { key: "CodSerTecAEntregar", label: "Código servicio/tecnología", source: "CodSerTecAEntregar" },
  { key: "CantTotAEntregar", label: "Cantidad total a entregar", source: "CantTotAEntregar" },
]

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== ""
}

function isFromDireccionamiento(item: Direccionamiento, source?: keyof Direccionamiento): boolean {
  return Boolean(source) && hasValue(item[source as keyof Direccionamiento])
}

function toDateInputValue(value?: string): string {
  if (!value) return ""
  return String(value).split("T")[0] || ""
}

function formatDateDisplay(value?: string): string {
  if (!value) return "—"
  const dateStr = value.split("T")[0]
  const [y, m, d] = dateStr.split("-")
  if (y && m && d) return `${d}/${m}/${y}`
  return value
}

function buildInitialForm(item: Direccionamiento): ProgramacionForm {
  return {
    FecMaxEnt: toDateInputValue(item.FecMaxEnt),
    TipoIDSedeProv: item.TipoIDProv || "",
    NoIDSedeProv: item.NoIDProv || "",
    CodSedeProv: "",
    CodSerTecAEntregar: item.CodSerTecAEntregar || "",
    CantTotAEntregar: item.CantTotAEntregar || "",
  }
}

function getItemKey(item: Direccionamiento): string {
  return String(item.ID ?? item.IDDireccionamiento)
}

function getItemLabel(item: Direccionamiento): string {
  const sub = Number(item.NoSubEntrega) > 0 ? `.${item.NoSubEntrega}` : ""
  return `${item.TipoTec}${item.ConTec} · Entrega ${item.NoEntrega}${sub}`
}

function getTechName(tipoTec?: string): string {
  if (!tipoTec) return "Tecnología"
  return (TIPOS_TECNOLOGIAS as Record<string, string>)[tipoTec] || tipoTec
}

export function ProgramacionViewForm({
  items,
  credentials,
  onClose,
  onSuccess,
  onFormVisibilityChange,
}: ProgramacionViewFormProps) {
  const [programadosLocal, setProgramadosLocal] = useState<Set<string>>(new Set())
  const [forms, setForms] = useState<Record<string, ProgramacionForm>>({})
  const [page, setPage] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  useEffect(() => {
    onFormVisibilityChange?.(true)
    return () => {
      onFormVisibilityChange?.(false)
    }
  }, [onFormVisibilityChange])

  const vigentes = useMemo(
    () => items.filter((item) => getEstadoProgramacion(item) !== "anulado"),
    [items]
  )

  useEffect(() => {
    setProgramadosLocal(new Set())
    setForms(Object.fromEntries(vigentes.map((item) => [getItemKey(item), buildInitialForm(item)])))
    const primerPendiente = vigentes.findIndex((item) => getEstadoProgramacion(item) === "pendiente")
    setPage(primerPendiente >= 0 ? primerPendiente + 1 : 1)
    setFormError(null)
    setFormSuccess(null)
  }, [vigentes])

  const isProgramado = (item: Direccionamiento) =>
    programadosLocal.has(getItemKey(item)) || getEstadoProgramacion(item) === "programado"

  const currentItem = vigentes[page - 1] || null
  const currentKey = currentItem ? getItemKey(currentItem) : ""
  const currentForm = forms[currentKey]
  const currentProgramado = currentItem ? isProgramado(currentItem) : false
  const pendientes = vigentes.filter((item) => !isProgramado(item)).length

  function setField(key: keyof ProgramacionForm, value: string) {
    setForms((prev) => ({ ...prev, [currentKey]: { ...prev[currentKey], [key]: value } }))
  }

  function goToPage(next: number) {
    setPage(Math.min(vigentes.length, Math.max(1, next)))
    setFormError(null)
  }

  const siguientePendienteIndex = useMemo(() => {
    return vigentes.findIndex((item, idx) => idx !== page - 1 && !isProgramado(item))
  }, [vigentes, page, programadosLocal])

  const handleSubmit = async () => {
    if (!currentItem || !currentForm) return
    setFormError(null)
    setFormSuccess(null)

    if (!credentials.nit) {
      setFormError("Configure el NIT en Configuración antes de continuar.")
      return
    }

    const token =
      currentItem.tipoRegimen === "Subsidiado"
        ? credentials.tokenAccesoSubsidiado
        : currentItem.tipoRegimen === "Contributivo"
        ? credentials.tokenAccesoContributivo
        : credentials.tokenAcceso

    if (!token) {
      setFormError(`Token ${currentItem.tipoRegimen || "Principal"} no configurado.`)
      return
    }

    if (PROGRAMACION_FIELDS.some((field) => !hasValue(currentForm[field.key]))) {
      setFormError("Complete todos los campos requeridos, incluyendo el código de sede proveedora.")
      return
    }

    setEnviando(true)
    try {
      const response = await fetch("/api/mipres/programacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit: credentials.nit,
          tokenAcceso: token,
          payload: {
            ID: currentItem.ID,
            ...currentForm,
          },
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const nextProgramados = new Set(programadosLocal).add(currentKey)
        setProgramadosLocal(nextProgramados)
        setFormSuccess(`Programación registrada exitosamente: ${getItemLabel(currentItem)}`)
        toast.success("Programación registrada exitosamente")
        onSuccess?.()

        const siguiente = vigentes.findIndex(
          (item) => !nextProgramados.has(getItemKey(item)) && getEstadoProgramacion(item) === "pendiente"
        )
        if (siguiente >= 0) setPage(siguiente + 1)
      } else {
        let errorMsg = result.error || "Error al registrar programación"
        if (result.details?.Errors && Array.isArray(result.details.Errors)) {
          errorMsg = result.details.Errors[0]
        } else if (result.Errors && Array.isArray(result.Errors)) {
          errorMsg = result.Errors[0]
        }
        setFormError(errorMsg)
        toast.error(errorMsg)
      }
    } catch {
      setFormError("Error de conexión con el servidor")
      toast.error("Error de conexión con el servidor")
    } finally {
      setEnviando(false)
    }
  }

  const noPrescripcion = items[0]?.NoPrescripcion || "—"
  const tipoPaciente = currentItem?.TipoIDPaciente || items[0]?.TipoIDPaciente || "—"
  const numPaciente = currentItem?.NoIDPaciente || items[0]?.NoIDPaciente || "—"

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ── Encabezado tipo DireccionamientoViewForm ── */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={enviando}
          className="shrink-0 h-9 w-9 rounded-lg hover:bg-muted"
          title="Volver a la tabla"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-none text-foreground">
            Formulario de programación de entrega
          </h2>
          <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
            <span>Prescripción</span>
            <span className="font-mono font-semibold text-primary">{noPrescripcion}</span>
            <span className="text-muted-foreground/60">•</span>
            <Badge
              variant="outline"
              className={`text-[11px] font-medium px-2 py-0.5 ${
                pendientes === 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
            >
              {pendientes === 0 ? "Todas las entregas programadas" : `${pendientes} de ${vigentes.length} sin programar`}
            </Badge>
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={onClose} disabled={enviando} className="h-8 text-xs rounded-lg hidden sm:flex">
          Volver a la tabla
        </Button>
      </div>

      {/* ── Contenedor de dos columnas estilo DireccionamientoViewForm ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Columna izquierda: Formulario y entregas */}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          {/* Mensajes de error / éxito */}
          {formError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{formError}</div>
            </div>
          )}

          {formSuccess && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div className="leading-snug">{formSuccess}</div>
            </div>
          )}

          {/* Tarjeta de paciente */}
          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <User className="size-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Identificación del Paciente
                </span>
                <p className="font-semibold text-sm font-mono text-foreground mt-0.5">
                  {tipoPaciente} {numPaciente}
                </p>
              </div>
            </div>
            {currentItem?.tipoRegimen && (
              <Badge
                variant="secondary"
                className={`text-xs font-medium px-2 py-0.5 ${
                  currentItem.tipoRegimen === "Contributivo"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                }`}
              >
                Régimen {currentItem.tipoRegimen}
              </Badge>
            )}
          </div>

          {!currentItem || !currentForm ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No hay direccionamientos vigentes para programar en esta prescripción.
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Stepper de entregas múltiples */}
              {vigentes.length > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                    <span className="font-medium flex items-center gap-1">
                      <Layers className="size-3.5 text-primary" />
                      Entregas disponibles ({vigentes.length})
                    </span>
                    <span>Entrega {page} de {vigentes.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/70 overflow-x-auto">
                    {vigentes.map((item, idx) => {
                      const prog = isProgramado(item)
                      const active = page === idx + 1
                      return (
                        <button
                          key={getItemKey(item)}
                          type="button"
                          onClick={() => goToPage(idx + 1)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                            active
                              ? "bg-white dark:bg-card text-foreground shadow-2xs border border-border/90 font-semibold ring-1 ring-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }`}
                        >
                          <span
                            className={`size-2 rounded-full shrink-0 ${
                              prog ? "bg-emerald-500" : "bg-amber-400"
                            }`}
                          />
                          <span>{getItemLabel(item)}</span>
                          {prog && (
                            <Check className="size-3 text-emerald-600 dark:text-emerald-400 ml-0.5 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tarjeta de la entrega seleccionada */}
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-semibold text-xs bg-primary/10 text-primary border border-primary/20">
                      {getItemLabel(currentItem)}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                      ID: {currentItem.ID ?? currentItem.IDDireccionamiento ?? "—"}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs gap-1.5 font-medium px-2.5 py-0.5 ${
                      currentProgramado
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        currentProgramado ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {currentProgramado ? "Programado" : "Pendiente de programar"}
                  </Badge>
                </div>

                {/* Formulario editable */}
                <div className="space-y-4 pt-1">
                  {/* Campo Destacado: Código sede proveedora */}
                  <div className="rounded-xl border border-primary/30 bg-primary/[0.03] dark:bg-primary/[0.06] p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="prog-CodSedeProv" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-4 text-primary" />
                        <span>Código sede proveedora</span>
                        {!currentProgramado && <span className="text-destructive font-bold">*</span>}
                      </label>
                      {!currentProgramado && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                          Obligatorio
                        </span>
                      )}
                    </div>
                    <Input
                      id="prog-CodSedeProv"
                      value={currentForm.CodSedeProv}
                      onChange={(e) => setField("CodSedeProv", e.target.value)}
                      readOnly={currentProgramado}
                      disabled={enviando}
                      placeholder="Ej. 01, 001, SEDE-PRINCIPAL"
                      className={`h-10 text-xs font-mono bg-background ${
                        currentProgramado
                          ? "bg-muted/50 text-muted-foreground cursor-not-allowed border-border"
                          : "border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
                      }`}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Ingrese el código habilitado de la sede donde se efectuará la entrega de la tecnología.
                    </p>
                  </div>

                  {/* Datos heredados del direccionamiento */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Lock className="size-3.5 text-muted-foreground/70" />
                      <span>Parámetros asignados en el direccionamiento</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Fecha máxima de entrega */}
                      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground/70" />
                            Fecha máxima de entrega
                          </span>
                          <Lock className="size-3 text-muted-foreground/50" />
                        </div>
                        {isFromDireccionamiento(currentItem, "FecMaxEnt") || currentProgramado ? (
                          <span className="text-xs font-semibold text-foreground mt-2 font-mono">
                            {formatDateDisplay(currentForm.FecMaxEnt)}
                          </span>
                        ) : (
                          <Input
                            type="date"
                            value={currentForm.FecMaxEnt}
                            onChange={(e) => setField("FecMaxEnt", e.target.value)}
                            disabled={enviando}
                            className="h-8.5 mt-1.5 text-xs bg-background"
                          />
                        )}
                      </div>

                      {/* Proveedor */}
                      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Proveedor (Tipo e ID)</span>
                          <Lock className="size-3 text-muted-foreground/50" />
                        </div>
                        <span className="text-xs font-semibold text-foreground mt-2 font-mono truncate">
                          {currentForm.TipoIDSedeProv && currentForm.NoIDSedeProv
                            ? `${currentForm.TipoIDSedeProv}: ${currentForm.NoIDSedeProv}`
                            : currentForm.NoIDSedeProv || "—"}
                        </span>
                      </div>

                      {/* Código Tecnología */}
                      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Código de servicio / tecnología</span>
                          <Lock className="size-3 text-muted-foreground/50" />
                        </div>
                        <span className="text-xs font-semibold text-foreground mt-2 font-mono truncate" title={currentForm.CodSerTecAEntregar}>
                          {currentForm.CodSerTecAEntregar || "—"}
                        </span>
                      </div>

                      {/* Cantidad total */}
                      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Cantidad total a entregar</span>
                          <Lock className="size-3 text-muted-foreground/50" />
                        </div>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2 font-mono">
                          {currentForm.CantTotAEntregar || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones del formulario */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={enviando}
                    className="h-9 text-xs rounded-lg"
                  >
                    Cancelar
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentProgramado ? (
                      siguientePendienteIndex >= 0 ? (
                        <Button
                          variant="outline"
                          onClick={() => goToPage(siguientePendienteIndex + 1)}
                          className="h-9 text-xs rounded-lg gap-1.5 text-primary border-primary/40 hover:bg-primary/5"
                        >
                          <span>Siguiente entrega pendiente</span>
                          <ArrowRight className="size-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          disabled
                          className="h-9 text-xs rounded-lg gap-1.5 text-emerald-700 dark:text-emerald-300 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                        >
                          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Entrega ya programada</span>
                        </Button>
                      )
                    ) : (
                      <Button
                        onClick={() => void handleSubmit()}
                        disabled={enviando || !currentItem || currentProgramado}
                        className="h-9 text-xs rounded-lg gap-2 bg-primary hover:bg-primary/90 text-white shadow-xs"
                      >
                        {enviando ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CalendarClock className="size-4" />
                        )}
                        <span>{enviando ? "Registrando programación..." : "Guardar programación"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Columna derecha: Panel de información contextual (estilo DireccionamientoViewForm) ── */}
        <div className="w-full lg:w-80 shrink-0 border rounded-xl overflow-hidden self-start sticky top-4 bg-card shadow-xs">
          <div className="p-3.5 border-b bg-muted/30 flex items-center gap-2 text-xs font-semibold text-foreground">
            <Info className="size-4 text-primary" />
            <span>Detalles del Direccionamiento</span>
          </div>

          <ScrollArea className="max-h-[75vh]">
            <div className="p-4 space-y-4 text-xs">
              {/* Resumen Tecnología */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Tecnología Asignada
                </span>
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-semibold text-foreground">
                      {getTechName(currentItem?.TipoTec)} ({currentItem?.TipoTec})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Consecutivo:</span>
                    <span className="font-mono font-medium">#{currentItem?.ConTec ?? "1"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">No. Entrega:</span>
                    <span className="font-medium">
                      Entrega {currentItem?.NoEntrega ?? "1"}
                      {Number(currentItem?.NoSubEntrega) > 0 ? ` (Sub ${currentItem?.NoSubEntrega})` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumen Entrega */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Cantidades y Fechas
                </span>
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cantidad:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {currentItem?.CantTotAEntregar ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fec. Máx Entrega:</span>
                    <span className="font-mono font-medium">
                      {formatDateDisplay(currentItem?.FecMaxEnt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cod. Tecnología:</span>
                    <span className="font-mono font-medium truncate max-w-[130px]" title={currentItem?.CodSerTecAEntregar}>
                      {currentItem?.CodSerTecAEntregar ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proveedor */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Proveedor Habilitado
                </span>
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo Doc:</span>
                    <span className="font-medium">{currentItem?.TipoIDProv ?? "NI"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">No. ID Proveedor:</span>
                    <span className="font-mono font-medium">{currentItem?.NoIDProv ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cod. Sede Ingresado:</span>
                    <span className="font-mono font-semibold text-primary">
                      {currentForm?.CodSedeProv || "Pendiente"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guía informativa */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground space-y-1">
                <span className="font-semibold text-primary block flex items-center gap-1">
                  <ShieldCheck className="size-3.5" />
                  Pauta MIPRES
                </span>
                <p className="leading-relaxed">
                  La programación confirma ante SISPRO la sede donde se dispensará o suministrará la entrega direccionada.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
