"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  PackageCheck,
  Truck,
  Calendar,
  Building2,
  Lock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
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
import { CAUSAS_NO_ENTREGAS, TIPOS_TECNOLOGIAS } from "@/models/constants"
import type { Programacion } from "@/models/mipres-sispro/programacion/programacion"
import type { MipresCredentials } from "@/models/credentials.model"

export interface EntregaViewFormProps {
  open?: boolean
  items: Programacion[]
  credentials: MipresCredentials
  onClose: () => void
  onSuccess?: (programacionId: string) => void
  onFormVisibilityChange?: (open: boolean) => void
}

interface EntregaForm {
  CodSerTecEntregado: string
  CantTotEntregada: string
  CausaNoEntrega: string
  FecEntrega: string
  NoLote: string
  TipoIDRecibe: string
  NoIDRecibe: string
}

// Body PUT /api/EntregaCodigos/{nit}/{token} (sin IDEntrega, que se resuelve aparte).
interface EntregaCodigosForm {
  CodSerTecEntregado: string
  CantTotEntregada: string
  FecEntrega: string
}

// El PUT de Entrega responde [{ Id, IdEntrega }]; la consulta de entregas trae IDEntrega.
function extractIdEntrega(data: unknown): string | null {
  const first = Array.isArray(data) ? data[0] : data
  if (!first || typeof first !== "object") return null
  const record = first as Record<string, unknown>
  const id = record.IdEntrega ?? record.IDEntrega
  return hasValue(id) ? String(id) : null
}

function resolveToken(item: Programacion, credentials: MipresCredentials): string | undefined {
  if (item.tipoRegimen === "Subsidiado") return credentials.tokenAccesoSubsidiado
  if (item.tipoRegimen === "Contributivo") return credentials.tokenAccesoContributivo
  return credentials.tokenAcceso
}

function getMipresErrorMessage(result: any, fallback: string): string {
  if (result?.details?.Errors && Array.isArray(result.details.Errors)) return result.details.Errors[0]
  if (result?.Errors && Array.isArray(result.Errors)) return result.Errors[0]
  return result?.error || fallback
}

export type EstadoEntrega = "anulado" | "pendiente" | "entregado"

export function getEstadoEntrega(item: Programacion): EstadoEntrega {
  if (item.FecAnulacion || Number(item.EstProgramacion) === 0) return "anulado"
  if (Number(item.EstProgramacion) === 2) return "entregado"
  return "pendiente"
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== ""
}

function todayInputValue(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${mm}-${dd}`
}

function buildInitialForm(item: Programacion): EntregaForm {
  return {
    CodSerTecEntregado: item.CodSerTecAEntregar || "",
    CantTotEntregada: item.CantTotAEntregar || "",
    CausaNoEntrega: "",
    FecEntrega: todayInputValue(),
    NoLote: "",
    TipoIDRecibe: item.TipoIDPaciente || "",
    NoIDRecibe: item.NoIDPaciente || "",
  }
}

function toNumber(value: string | undefined): number {
  const parsed = Number(String(value ?? "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : 0
}

function getItemKey(item: Programacion): string {
  return String(item.ID ?? item.IDProgramacion)
}

function getItemLabel(item: Programacion): string {
  return `${item.TipoTec ?? ""}${item.ConTec ?? ""} · Entrega ${item.NoEntrega ?? "-"}`
}

function getTechName(tipoTec?: string): string {
  if (!tipoTec) return "Tecnología"
  return (TIPOS_TECNOLOGIAS as Record<string, string>)[tipoTec] || tipoTec
}

export function EntregaViewForm({
  open = true,
  items,
  credentials,
  onClose,
  onSuccess,
  onFormVisibilityChange,
}: EntregaViewFormProps) {
  const [entregadosLocal, setEntregadosLocal] = useState<Set<string>>(new Set())
  const [forms, setForms] = useState<Record<string, EntregaForm>>({})
  const [page, setPage] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Entrega códigos: se envía después de la entrega, sobre el IDEntrega que esta genera.
  const [idEntregaByKey, setIdEntregaByKey] = useState<Record<string, string>>({})
  const [codigosForms, setCodigosForms] = useState<Record<string, EntregaCodigosForm>>({})
  const [codigosEnviados, setCodigosEnviados] = useState<Set<string>>(new Set())
  const [enviandoCodigos, setEnviandoCodigos] = useState(false)
  const [buscandoEntregas, setBuscandoEntregas] = useState(false)

  useEffect(() => {
    const isVisible = Boolean(open && items && items.length > 0)
    onFormVisibilityChange?.(isVisible)
    return () => {
      onFormVisibilityChange?.(false)
    }
  }, [open, items, onFormVisibilityChange])

  const vigentes = useMemo(
    () => items.filter((item) => getEstadoEntrega(item) !== "anulado"),
    [items]
  )

  useEffect(() => {
    setEntregadosLocal(new Set())
    setForms(Object.fromEntries(vigentes.map((item) => [getItemKey(item), buildInitialForm(item)])))
    const primerPendiente = vigentes.findIndex((item) => getEstadoEntrega(item) === "pendiente")
    setPage(primerPendiente >= 0 ? primerPendiente + 1 : 1)
    setFormError(null)
    setFormSuccess(null)
    setIdEntregaByKey({})
    setCodigosForms({})
    setCodigosEnviados(new Set())
  }, [vigentes])

  // Para programaciones entregadas antes de abrir el form, busca su IDEntrega en MIPRES.
  useEffect(() => {
    const yaEntregadas = vigentes.filter((item) => getEstadoEntrega(item) === "entregado")
    const noPrescripcion = items[0]?.NoPrescripcion
    if (yaEntregadas.length === 0 || !noPrescripcion || !credentials.nit) return

    let cancelled = false
    const regimenes = Array.from(new Set(yaEntregadas.map((item) => item.tipoRegimen)))

    const cargarEntregas = async () => {
      setBuscandoEntregas(true)
      const nextIds: Record<string, string> = {}
      const nextForms: Record<string, EntregaCodigosForm> = {}

      await Promise.all(
        regimenes.map(async (regimen) => {
          const token = resolveToken(yaEntregadas.find((item) => item.tipoRegimen === regimen)!, credentials)
          if (!token) return
          try {
            const params = new URLSearchParams({ nit: credentials.nit, tokenAcceso: token, tipo: "prescripcion", noPrescripcion })
            const response = await fetch(`/api/mipres/entrega?${params.toString()}`)
            const result = await response.json()
            const entregas: any[] = Array.isArray(result?.data) ? result.data : []

            for (const item of yaEntregadas.filter((p) => p.tipoRegimen === regimen)) {
              const entrega = entregas.find((e) => String(e?.ID) === String(item.ID) && !e?.FecAnulacion)
              const idEntrega = entrega ? extractIdEntrega(entrega) : null
              if (!idEntrega) continue
              const key = getItemKey(item)
              nextIds[key] = idEntrega
              nextForms[key] = {
                CodSerTecEntregado: entrega.CodSerTecEntregado || item.CodSerTecAEntregar || "",
                CantTotEntregada: String(entrega.CantTotEntregada ?? ""),
                FecEntrega: String(entrega.FecEntrega || "").split("T")[0],
              }
            }
          } catch {
            // Sin IDEntrega la sección de códigos queda deshabilitada con su aviso.
          }
        })
      )

      if (cancelled) return
      setIdEntregaByKey((prev) => ({ ...nextIds, ...prev }))
      setCodigosForms((prev) => ({ ...nextForms, ...prev }))
      setBuscandoEntregas(false)
    }

    void cargarEntregas()
    return () => { cancelled = true }
  }, [vigentes, items, credentials])

  const isEntregado = (item: Programacion) =>
    entregadosLocal.has(getItemKey(item)) || getEstadoEntrega(item) === "entregado"

  const currentItem = vigentes[page - 1] || null
  const currentKey = currentItem ? getItemKey(currentItem) : ""
  const currentForm = forms[currentKey]
  const currentEntregado = currentItem ? isEntregado(currentItem) : false
  const pendientes = vigentes.filter((item) => !isEntregado(item)).length

  const cantProgramada = toNumber(currentItem?.CantTotAEntregar)
  const cantEntregada = toNumber(currentForm?.CantTotEntregada)
  const cantPendiente = Math.max(0, cantProgramada - cantEntregada)
  const entTotal = cantPendiente === 0 ? 1 : 0

  function setField(key: keyof EntregaForm, value: string) {
    setForms((prev) => ({ ...prev, [currentKey]: { ...prev[currentKey], [key]: value } }))
  }

  function goToPage(next: number) {
    setPage(Math.min(vigentes.length, Math.max(1, next)))
    setFormError(null)
  }

  const siguientePendienteIndex = useMemo(() => {
    return vigentes.findIndex((item, idx) => idx !== page - 1 && !isEntregado(item))
  }, [vigentes, page, entregadosLocal])

  const handleSubmit = async () => {
    if (!currentItem || !currentForm) return
    setFormError(null)
    setFormSuccess(null)

    if (!credentials.nit) {
      setFormError("Configure el NIT en Configuración antes de continuar.")
      return
    }

    const token = resolveToken(currentItem, credentials)

    if (!token) {
      setFormError(`Token ${currentItem.tipoRegimen || "Principal"} no configurado.`)
      return
    }

    const requeridos: Array<keyof EntregaForm> = ["CodSerTecEntregado", "CantTotEntregada", "FecEntrega", "TipoIDRecibe", "NoIDRecibe"]
    if (currentItem.TipoTec === "M") requeridos.push("NoLote")
    if (entTotal === 0) requeridos.push("CausaNoEntrega")

    if (requeridos.some((key) => !hasValue(currentForm[key]))) {
      setFormError(
        entTotal === 0 && !hasValue(currentForm.CausaNoEntrega)
          ? "La entrega es parcial: debe seleccionar la causa de no entrega total."
          : "Complete todos los campos obligatorios."
      )
      return
    }

    if (cantEntregada > cantProgramada) {
      setFormError(`La cantidad entregada no puede superar la programada (${cantProgramada}).`)
      return
    }

    setEnviando(true)
    try {
      const response = await fetch("/api/mipres/entrega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit: credentials.nit,
          tokenAcceso: token,
          payload: {
            ID: currentItem.ID,
            CodSerTecEntregado: currentForm.CodSerTecEntregado,
            CantTotEntregada: currentForm.CantTotEntregada,
            EntTotal: entTotal,
            CausaNoEntrega: entTotal === 0 ? Number(currentForm.CausaNoEntrega) : 0,
            FecEntrega: currentForm.FecEntrega,
            NoLote: currentForm.NoLote,
            TipoIDRecibe: currentForm.TipoIDRecibe,
            NoIDRecibe: currentForm.NoIDRecibe,
            CantPenEntregar: String(cantPendiente),
          },
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const nextEntregados = new Set(entregadosLocal).add(currentKey)
        setEntregadosLocal(nextEntregados)
        const idEntrega = extractIdEntrega(result.data)
        if (idEntrega) setIdEntregaByKey((prev) => ({ ...prev, [currentKey]: idEntrega }))
        setCodigosForms((prev) => ({
          ...prev,
          [currentKey]: {
            CodSerTecEntregado: currentForm.CodSerTecEntregado,
            CantTotEntregada: currentForm.CantTotEntregada,
            FecEntrega: currentForm.FecEntrega,
          },
        }))
        setFormSuccess(`Entrega registrada exitosamente: ${getItemLabel(currentItem)}. Ahora reporte la entrega códigos.`)
        toast.success("Entrega registrada exitosamente")
        onSuccess?.(currentKey)
        // Se queda en esta tecnología para enviar Entrega códigos a continuación.
      } else {
        const errorMsg = getMipresErrorMessage(result, "Error al registrar entrega")
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

  const currentIdEntrega = idEntregaByKey[currentKey] || ""
  const currentCodigos = codigosForms[currentKey]
  const currentCodigosEnviado = codigosEnviados.has(currentKey)

  function setCodigosField(key: keyof EntregaCodigosForm, value: string) {
    setCodigosForms((prev) => ({ ...prev, [currentKey]: { ...prev[currentKey], [key]: value } }))
  }

  const handleSubmitCodigos = async () => {
    if (!currentItem || !currentCodigos) return
    setFormError(null)
    setFormSuccess(null)

    if (!currentIdEntrega) {
      setFormError("No se encontró el IDEntrega de esta entrega en MIPRES.")
      return
    }

    const token = resolveToken(currentItem, credentials)
    if (!credentials.nit || !token) {
      setFormError(`NIT o token ${currentItem.tipoRegimen || "Principal"} no configurado.`)
      return
    }

    if (!hasValue(currentCodigos.CodSerTecEntregado) || !hasValue(currentCodigos.CantTotEntregada) || !hasValue(currentCodigos.FecEntrega)) {
      setFormError("Complete los datos de entrega códigos.")
      return
    }

    setEnviandoCodigos(true)
    try {
      const response = await fetch("/api/mipres/entrega-codigos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit: credentials.nit,
          tokenAcceso: token,
          payload: {
            IDEntrega: Number(currentIdEntrega),
            CodSerTecEntregado: currentCodigos.CodSerTecEntregado,
            CantTotEntregada: currentCodigos.CantTotEntregada,
            FecEntrega: currentCodigos.FecEntrega,
          },
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setCodigosEnviados((prev) => new Set(prev).add(currentKey))
        setFormSuccess(`Entrega códigos registrada: ${getItemLabel(currentItem)}`)
        toast.success("Entrega códigos registrada")

        const siguiente = vigentes.findIndex((item) => !isEntregado(item))
        if (siguiente >= 0) setPage(siguiente + 1)
      } else {
        const errorMsg = getMipresErrorMessage(result, "Error al registrar entrega códigos")
        setFormError(errorMsg)
        toast.error(errorMsg)
      }
    } catch {
      setFormError("Error de conexión con el servidor")
      toast.error("Error de conexión con el servidor")
    } finally {
      setEnviandoCodigos(false)
    }
  }

  if (open === false || !items || items.length === 0) return null

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
          <Truck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-none text-foreground">
            Formulario de registro de entrega
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
              {pendientes === 0 ? "Todas las entregas registradas" : `${pendientes} de ${vigentes.length} sin entregar`}
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
              No hay programaciones vigentes para registrar entregas en esta prescripción.
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
                      const entregado = isEntregado(item)
                      const active = page === idx + 1
                      return (
                        <button
                          key={getItemKey(item)}
                          type="button"
                          onClick={() => goToPage(idx + 1)}
                          disabled={enviando}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                            active
                              ? "bg-white dark:bg-card text-foreground shadow-2xs border border-border/90 font-semibold ring-1 ring-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }`}
                        >
                          <span
                            className={`size-2 rounded-full shrink-0 ${
                              entregado ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          <span>{getItemLabel(item)}</span>
                          {entregado && (
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Formulario de la entrega seleccionada */}
              <Card className="p-5 rounded-xl border border-border/80 bg-card shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="size-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">
                      Datos de la Entrega: {getItemLabel(currentItem)}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-semibold ${
                      currentEntregado
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                    }`}
                  >
                    {currentEntregado ? "Entrega Registrada" : "Pendiente por Entregar"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* CodSerTecEntregado (Heredado y bloqueado) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Lock className="size-3 text-muted-foreground" />
                      Código servicio / tecnología
                    </label>
                    <Input
                      value={currentForm.CodSerTecEntregado}
                      readOnly
                      disabled
                      className="bg-muted/60 font-mono text-xs text-muted-foreground cursor-not-allowed h-9"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Heredado de la programación
                    </span>
                  </div>

                  {/* CantTotEntregada */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Cantidad a entregar <span className="text-destructive">*</span>
                      </label>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Programada: <strong>{cantProgramada}</strong>
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={cantProgramada}
                      value={currentForm.CantTotEntregada}
                      onChange={(e) => setField("CantTotEntregada", e.target.value)}
                      disabled={enviando || currentEntregado}
                      className="font-mono text-xs h-9"
                    />
                    {cantPendiente > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Quedarán pendientes: {cantPendiente} unidades
                      </span>
                    )}
                  </div>

                  {/* FecEntrega */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Fecha de entrega <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      value={currentForm.FecEntrega}
                      onChange={(e) => setField("FecEntrega", e.target.value)}
                      disabled={enviando || currentEntregado}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* NoLote */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Número de lote {currentItem?.TipoTec === "M" && <span className="text-destructive">*</span>}
                    </label>
                    <Input
                      placeholder={currentItem?.TipoTec === "M" ? "Obligatorio para medicamentos" : "Opcional"}
                      value={currentForm.NoLote}
                      onChange={(e) => setField("NoLote", e.target.value)}
                      disabled={enviando || currentEntregado}
                      className="font-mono text-xs h-9"
                    />
                  </div>

                  {/* TipoIDRecibe */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Tipo ID quien recibe <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={currentForm.TipoIDRecibe}
                      onChange={(e) => setField("TipoIDRecibe", e.target.value.toUpperCase())}
                      disabled={enviando || currentEntregado}
                      className="font-mono text-xs uppercase h-9"
                    />
                  </div>

                  {/* NoIDRecibe */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      No. ID quien recibe <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={currentForm.NoIDRecibe}
                      onChange={(e) => setField("NoIDRecibe", e.target.value)}
                      disabled={enviando || currentEntregado}
                      className="font-mono text-xs h-9"
                    />
                  </div>

                  {/* CausaNoEntrega (si es entrega parcial) */}
                  {entTotal === 0 && (
                    <div className="space-y-1.5 sm:col-span-2 p-3 rounded-lg border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20">
                      <label className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                        Causa de entrega parcial / no entrega total <span className="text-destructive">*</span>
                      </label>
                      <Select
                        value={currentForm.CausaNoEntrega}
                        onValueChange={(value) => setField("CausaNoEntrega", value)}
                        disabled={enviando || currentEntregado}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white dark:bg-card border-input">
                          <SelectValue placeholder="Seleccione el motivo de entrega parcial..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {Object.entries(CAUSAS_NO_ENTREGAS).map(([codigo, descripcion]) => (
                            <SelectItem key={codigo} value={codigo} className="text-xs">
                              {codigo} - {descripcion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 block">
                        Requerido por SISPRO cuando la cantidad entregada es inferior a la programada.
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Entrega códigos: solo después de registrar la entrega */}
              {currentEntregado && (
                <Card className="p-5 rounded-xl border border-border/80 bg-card shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Hash className="size-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">Entrega códigos</h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold ${
                        currentCodigosEnviado
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {currentCodigosEnviado ? "Códigos Registrados" : "Pendiente por Reportar"}
                    </Badge>
                  </div>

                  {buscandoEntregas && !currentIdEntrega ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Buscando la entrega en MIPRES...
                    </div>
                  ) : !currentIdEntrega || !currentCodigos ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200">
                      <Info className="size-4 shrink-0 mt-0.5" />
                      No se encontró el IDEntrega de esta entrega; no es posible reportar los códigos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Lock className="size-3 text-muted-foreground" />
                          ID entrega
                        </label>
                        <Input
                          value={currentIdEntrega}
                          readOnly
                          disabled
                          className="bg-muted/60 font-mono text-xs text-muted-foreground cursor-not-allowed h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Código servicio / tecnología entregado <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={currentCodigos.CodSerTecEntregado}
                          onChange={(e) => setCodigosField("CodSerTecEntregado", e.target.value)}
                          disabled={enviandoCodigos || currentCodigosEnviado}
                          className="font-mono text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Lock className="size-3 text-muted-foreground" />
                          Cantidad total entregada
                        </label>
                        <Input
                          value={currentCodigos.CantTotEntregada}
                          readOnly
                          disabled
                          className="bg-muted/60 font-mono text-xs text-muted-foreground cursor-not-allowed h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Lock className="size-3 text-muted-foreground" />
                          Fecha de entrega
                        </label>
                        <Input
                          type="date"
                          value={currentCodigos.FecEntrega}
                          readOnly
                          disabled
                          className="bg-muted/60 text-xs text-muted-foreground cursor-not-allowed h-9"
                        />
                      </div>

                      <div className="sm:col-span-2 flex justify-end">
                        <Button
                          onClick={() => void handleSubmitCodigos()}
                          disabled={enviandoCodigos || currentCodigosEnviado}
                          className="h-9 text-xs font-semibold"
                        >
                          {enviandoCodigos ? (
                            <>
                              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                              Registrando en MIPRES...
                            </>
                          ) : currentCodigosEnviado ? (
                            <>
                              <CheckCircle2 className="size-3.5 mr-1.5" />
                              Códigos Registrados
                            </>
                          ) : (
                            "Guardar entrega códigos"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: Resumen contextual y acciones */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          <Card className="p-4 rounded-xl border border-border/80 bg-card shadow-2xs space-y-3 sticky top-4">
            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              Resumen de Entrega
            </h4>

            <div className="space-y-2 text-xs divide-y divide-border/60">
              <div className="pt-1 flex items-center justify-between">
                <span className="text-muted-foreground">ID Programación:</span>
                <span className="font-mono font-medium">{currentItem?.ID ?? "—"}</span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Cantidad Programada:</span>
                <span className="font-mono font-semibold">{cantProgramada}</span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Cantidad a Entregar:</span>
                <span className="font-mono font-semibold text-primary">{cantEntregada}</span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Cantidad Pendiente:</span>
                <span className={`font-mono font-semibold ${cantPendiente > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {cantPendiente}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Modalidad:</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold ${
                    entTotal === 1
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}
                >
                  {entTotal === 1 ? "Total (100%)" : "Parcial"}
                </Badge>
              </div>
            </div>

            <div className="pt-2 border-t space-y-2">
              <Button
                onClick={() => void handleSubmit()}
                disabled={enviando || !currentItem || currentEntregado}
                className="w-full h-9 text-xs font-semibold"
              >
                {enviando ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Registrando en MIPRES...
                  </>
                ) : currentEntregado ? (
                  <>
                    <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-400" />
                    Entrega Registrada
                  </>
                ) : (
                  <>
                    <PackageCheck className="size-3.5 mr-1.5" />
                    Guardar Entrega
                  </>
                )}
              </Button>

              {siguientePendienteIndex >= 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(siguientePendienteIndex + 1)}
                  disabled={enviando}
                  className="w-full h-8 text-xs font-normal"
                >
                  Siguiente sin entregar
                  <ArrowRight className="size-3 ml-1" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={enviando}
                className="w-full h-8 text-xs text-muted-foreground"
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
