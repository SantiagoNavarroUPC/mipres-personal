"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertCircle, CheckCircle2, Package, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ReporteEntrega } from "@/models/mipres-sispro/reporte-entrega/reporte-entrega"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento/direccionamiento"
import { secureStorageGetItem } from "@/lib/secure-storage"
import { reportErrorNotification } from "@/lib/error-notifications"

interface SuministroModalMasivosProps {
  open: boolean
  onClose: () => void
  reportes: ReporteEntrega[]
  noPrescripcion: string
  credentials: {
    nit: string
    token: string
  }
  // onSuccess refresh callback from parent (e.g., rerun last table query)
  onSuccess?: () => Promise<void>
}

interface SuministroResult {
  id: string
  success: boolean
  message?: string
  data?: any
}

function parseDateTime(value?: string | null) {
  if (!value) return 0
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value
  const ts = new Date(normalized).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-"
  const cleaned = String(value).replace(/[^0-9.-]+/g, "")
  const num = Number(cleaned) || 0
  try {
    return `$${new Intl.NumberFormat("es-CO").format(num)}`
  } catch {
    return `$${num}`
  }
}

function formatLocalDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

function extractSuministroId(value: any): string | null {
  const candidates = [
    value,
    value?.data,
    Array.isArray(value?.data) ? value.data[0] : null,
    value?.results?.[0],
    value?.results?.[0]?.response,
    value?.results?.[0]?.data,
    value?.data?.results?.[0],
    value?.data?.results?.[0]?.response,
  ]

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const id =
      candidate.IDSuministro ??
      candidate.IdSuministro ??
      candidate.idSuministro ??
      candidate.id_suministro ??
      candidate.ID ??
      candidate.Id ??
      candidate.id

    if (id !== undefined && id !== null && String(id).trim()) {
      return String(id).trim()
    }
  }

  return null
}

const MODAL_PAGE_SIZE = 10

export function SuministroModalMasivos({
  open,
  onClose,
  reportes,
  noPrescripcion,
  credentials,
  onSuccess,
}: SuministroModalMasivosProps) {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<SuministroResult[]>([])
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([])
  const [modalPage, setModalPage] = useState(1)

  // Obtener credenciales robustamente (igual que en la tabla)
  const getRobustCredentials = () => {
    let nit = credentials.nit || ""
    let token = credentials.token || ""
    const storedNit = localStorage.getItem("mipres_nit")
    const storedToken = localStorage.getItem("mipres_token")
    if (storedNit && !nit) nit = storedNit
    if (storedToken && !token) token = storedToken
    const savedCredentials = secureStorageGetItem("mipres_credentials")
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials)
        nit = nit || parsed?.nit || ""
        token = token || parsed?.tokenAcceso || parsed?.token || ""
      } catch {}
    }
    return { nit, token }
  }

  const reportesValidos = useMemo(() => {
    const nowTs = Date.now()
    return reportes
      .filter((r) => {
        const fecRepTs = parseDateTime(r.FecRepEntrega)
        const hasEstadoEntregaValido = Number(r.EstadoEntrega) === 1
        const causaNoEntregaRaw = r.CausaNoEntrega
        const hasCausaNoEntrega =
          causaNoEntregaRaw !== null &&
          causaNoEntregaRaw !== undefined &&
          String(causaNoEntregaRaw).trim() !== ""

        return (
          Number(r.EstRepEntrega) === 1 &&
          hasEstadoEntregaValido &&
          fecRepTs > 0 &&
          fecRepTs < nowTs &&
          !r.FecAnulacion &&
          !hasCausaNoEntrega
        )
      })
      .sort((a, b) => (a.NoEntrega || 0) - (b.NoEntrega || 0))
  }, [reportes])

  useEffect(() => {
    if (!open) return
    setResults([])
    setSelectedReportIds(reportesValidos.map((r) => String(r.IDReporteEntrega)))
    setModalPage(1)
  }, [open, noPrescripcion, reportesValidos])

  const reportesSeleccionados = useMemo(() => {
    const selectedSet = new Set(selectedReportIds)
    return reportesValidos.filter((r) => selectedSet.has(String(r.IDReporteEntrega)))
  }, [reportesValidos, selectedReportIds])

  // La selección y el procesamiento siempre cubren TODOS los elegibles;
  // la paginación de abajo es solo para no renderizar cientos de tarjetas de una.
  const modalPageCount = Math.max(1, Math.ceil(reportesValidos.length / MODAL_PAGE_SIZE))
  const reportesValidosPaginados = useMemo(() => {
    const start = (modalPage - 1) * MODAL_PAGE_SIZE
    return reportesValidos.slice(start, start + MODAL_PAGE_SIZE)
  }, [reportesValidos, modalPage])

  const handleProcesarSuministro = async () => {
    if (reportesSeleccionados.length === 0) {
      toast.error("Sin selección", {
        description: "Selecciona al menos un reporte elegible para procesar suministro.",
      })
      return
    }

    setProcessing(true)
    const newResults: SuministroResult[] = []

    try {
      const { nit, token } = getRobustCredentials()
      if (!nit || !token) {
        toast.error("Sin credenciales", {
          description: "No hay credenciales para procesar suministro.",
        })
        reportErrorNotification(
          "Suministro masivo",
          `Prescripción ${noPrescripcion}: no hay credenciales (NIT/token) configuradas para procesar el lote.`
        )
        setProcessing(false)
        return
      }

      // Fuente de verdad para última entrega: NoEntrega de direccionamiento
      let ultimaEntregaByTec = new Map<string, number>()
      try {
        const prescripciones = Array.from(new Set(reportesSeleccionados.map((r) => String(r.NoPrescripcion))))

        // Usar Promise.all para hacer todas las queries en paralelo
        const dirPromises = prescripciones.map(async (prescripcion) => {
          const dirParams = new URLSearchParams({
            nit,
            tokenAcceso: token,
            tipo: "prescripcion",
            noPrescripcion: prescripcion,
          })

          const dirResponse = await fetch(`/api/mipres/direccionamiento?${dirParams.toString()}`)
          const dirJson = await dirResponse.json()

          const direccionamientos: Direccionamiento[] = Array.isArray(dirJson?.data)
            ? dirJson.data
            : dirJson?.data
              ? [dirJson.data]
              : []

          return direccionamientos
        })

        const allDirResults = await Promise.all(dirPromises)
        
        for (const direccionamientos of allDirResults) {
          for (const dir of direccionamientos) {
            if (dir?.FecAnulacion) continue
            const key = `${String(dir.NoPrescripcion)}|${String(dir.TipoTec)}|${String(dir.ConTec)}`
            const noEntrega = Number(dir.NoEntrega || 0)
            const current = ultimaEntregaByTec.get(key) || 0
            if (noEntrega > current) {
              ultimaEntregaByTec.set(key, noEntrega)
            }
          }
        }
      } catch {
      }

      // Crear una función processor que pueda ser usada con concurrencia controlada
      const processReporteEntry = async (reporte: ReporteEntrega): Promise<SuministroResult> => {
        try {
          const entregasRelacionadas = reportes
            .filter(
              (r) =>
                r.NoPrescripcion === reporte.NoPrescripcion &&
                r.TipoTec === reporte.TipoTec &&
                r.ConTec === reporte.ConTec &&
                !r.FecAnulacion
            )
            .sort((a, b) => (a.NoEntrega || 0) - (b.NoEntrega || 0))

          const ultimaEntrega = entregasRelacionadas[entregasRelacionadas.length - 1]
          const dirKey = `${String(reporte.NoPrescripcion)}|${String(reporte.TipoTec)}|${String(reporte.ConTec)}`
          const ultimaEntregaDireccionamiento = ultimaEntregaByTec.get(dirKey)
          const esUltimaEntrega =
            ultimaEntregaDireccionamiento !== undefined
              ? (Number(reporte.NoEntrega || 0) === Number(ultimaEntregaDireccionamiento) ? 1 : 0)
              : (ultimaEntrega && Number(reporte.NoEntrega || 0) === Number(ultimaEntrega.NoEntrega || 0) ? 1 : 0)

          const causaNoEntregaRaw = reporte.CausaNoEntrega
          const hasCausaNoEntrega =
            causaNoEntregaRaw !== null &&
            causaNoEntregaRaw !== undefined &&
            String(causaNoEntregaRaw).trim() !== ""

          const entregaCompleta = reporte.EstadoEntrega === 1 && !hasCausaNoEntrega ? 1 : 0

          const suministroPayload = {
            ID: reporte.ID,
            UltEntrega: esUltimaEntrega,
            EntregaCompleta: entregaCompleta,
            CausaNoEntrega: reporte.CausaNoEntrega || 0,
            NoPrescripcionAsociada: null,
            ConTecAsociada: reporte.ConTec,
            CantTotEntregada: reporte.CantTotEntregada,
            NoLote: reporte.NoLote,
            ValorEntregado: reporte.ValorEntregado?.toString(),
          }

          const response = await fetch("/api/mipres/suministro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nit,
              tokenAcceso: token,
              body: suministroPayload,
            }),
          })

          const data = await response.json()

          if (!data.success) {
            const suministroError = data.error || "Error desconocido"
            reportErrorNotification(
              "Suministro masivo (SISPRO)",
              `Prescripción ${reporte.NoPrescripcion} (${reporte.TipoTec}-${reporte.ConTec}, entrega #${reporte.NoEntrega}): ${suministroError}`
            )
            return {
              id: String(reporte.IDReporteEntrega),
              success: false,
              message: suministroError,
            }
          }

          const rawData = data.data
          const raw = Array.isArray(rawData) ? (rawData[0] || {}) : (rawData || {})
          const normalized: any = { ...(typeof raw === "object" ? raw : {}) }

          const extractedId = extractSuministroId(data)
          normalized.IDSuministro =
            normalized.IdSuministro ??
            normalized.Id ??
            extractedId ??
            undefined

          normalized.FecSuministro = normalized.FecSuministro || formatLocalDateTime(new Date())

          return {
            id: String(reporte.IDReporteEntrega),
            success: true,
            data: normalized,
          }
        } catch (error: any) {
          const message = error?.message || "Error inesperado"
          reportErrorNotification(
            "Suministro masivo",
            `Prescripción ${reporte.NoPrescripcion} (${reporte.TipoTec}-${reporte.ConTec}, entrega #${reporte.NoEntrega}): ${message}`
          )
          return {
            id: String(reporte.IDReporteEntrega),
            success: false,
            message,
          }
        }
      }

      // Procesar uno por uno para priorizar estabilidad sobre velocidad.
      for (const reporte of reportesSeleccionados) {
        const result = await processReporteEntry(reporte)
        newResults.push(result)
        setResults([...newResults])
      }

      const successCount = newResults.filter((r) => r.success).length
      const errorCount = newResults.filter((r) => !r.success).length

      // Mostrar una sola notificación al final del proceso masivo.
      if (errorCount === 0 && successCount > 0) {
        toast.success("Todos los suministros se hicieron correctamente", {
          description: `Procesados: ${successCount}`,
        })
      } else {
        const parts: string[] = []
        if (successCount > 0) parts.push(`Exitosos: ${successCount}`)
        if (errorCount > 0) parts.push(`Errores: ${errorCount}`)
        toast.error("Proceso de suministro finalizó con novedades", {
          description: parts.join(" | "),
        })
      }

      // Siempre intentar refrescar tabla al finalizar el lote
      // para reflejar el estado más reciente del backend.
      if (newResults.length > 0) {
        try {
          if (onSuccess) await onSuccess()
        } catch {
        }
      }
    } finally {
      setProcessing(false)
    }
  }

  const getResultForReporte = (id: number) => results.find((r) => r.id === String(id))

  return (
    <Dialog open={open} onOpenChange={() => !processing && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Generar Suministro Masivo
          </DialogTitle>
          <DialogDescription>
            Origen: <span className="font-mono font-medium text-primary">{noPrescripcion}</span>
            <br />
            Elegibles: {reportesValidos.length} • Seleccionados: {reportesSeleccionados.length}
            {reportesValidos.length > MODAL_PAGE_SIZE && (
              <> • Mostrando {(modalPage - 1) * MODAL_PAGE_SIZE + 1}–{Math.min(modalPage * MODAL_PAGE_SIZE, reportesValidos.length)}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-1 border rounded-md">
          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="space-y-4 p-4">
              {reportesValidos.length > 0 && results.length === 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReportIds(reportesValidos.map((r) => String(r.IDReporteEntrega)))}
                    disabled={processing}
                  >
                    Seleccionar todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReportIds([])}
                    disabled={processing}
                  >
                    Limpiar selección
                  </Button>
                </div>
              )}

              {reportesValidos.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No hay reportes elegibles para generar suministro masivo.
                </div>
              )}

              {reportesValidosPaginados.map((reporte) => {
                const result = getResultForReporte(reporte.IDReporteEntrega)
                const reporteId = String(reporte.IDReporteEntrega)
                const isSelected = selectedReportIds.includes(reporteId)

                return (
                  <div key={reporte.IDReporteEntrega} className="flex flex-col gap-2 p-3 border rounded-lg shadow-sm bg-card">
                    <div className="mb-0">
                      <span className="text-xs font-semibold text-primary">Prescripción:</span>
                      <span className="ml-2 font-mono text-[12px] text-muted-foreground">{reporte.NoPrescripcion}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-0">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="font-mono">Entrega #{reporte.NoEntrega}</Badge>
                              <Badge variant="secondary" className="text-[12px]">{reporte.TipoTec} - {reporte.ConTec}</Badge>
                              <span className="text-xs text-muted-foreground ml-1">ID: {reporte.IDReporteEntrega}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3 ml-1.5">
                              <span className="truncate">Cantidad: <span className="font-mono text-[11px]">{reporte.CantTotEntregada ?? "-"}</span></span>
                              <span className="truncate">Valor: <span className="font-mono text-[11px]">{formatCurrency(reporte.ValorEntregado)}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (results.length > 0 || processing) return
                            if (checked) {
                              setSelectedReportIds((prev) => (prev.includes(reporteId) ? prev : [...prev, reporteId]))
                            } else {
                              setSelectedReportIds((prev) => prev.filter((id) => id !== reporteId))
                            }
                          }}
                          disabled={processing || results.length > 0}
                        />
                        {result ? (
                          result.success ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Exitoso
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" /> Error
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-dashed">Pendiente</Badge>
                        )}
                      </div>
                    </div>

                    {result && !result.success && (
                      <Alert variant="destructive" className="py-2 mt-2 text-xs">
                        <AlertCircle className="h-3 w-3" />
                        <AlertTitle className="text-xs font-semibold ml-2">Error al procesar</AlertTitle>
                        <AlertDescription className="text-xs ml-2 mt-1">{result.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {modalPageCount > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={modalPage <= 1}
              onClick={() => setModalPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium min-w-[70px] text-center">
              Página {modalPage} / {modalPageCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={modalPage >= modalPageCount}
              onClick={() => setModalPage((p) => Math.min(modalPageCount, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            {results.length > 0 ? "Cerrar" : "Cancelar"}
          </Button>
          <Button
            onClick={handleProcesarSuministro}
            disabled={processing || reportesValidos.length === 0 || reportesSeleccionados.length === 0 || results.length > 0}
            className="min-w-[140px]"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : results.length > 0 ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Finalizado
              </>
            ) : (
              "Confirmar Suministros"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
