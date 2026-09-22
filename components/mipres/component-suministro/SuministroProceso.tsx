"use client"

import { useState, useMemo } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertCircle, CheckCircle2, Package, Check } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ReporteEntrega } from "@/models/mipres-sispro/reporte-entrega/reporte-entrega"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento/direccionamiento"
import { secureStorageGetItem } from "@/lib/secure-storage"
import { reportErrorNotification } from "@/lib/error-notifications"

interface SuministroModalProps {
  open: boolean
  onClose: () => void
  reportes: ReporteEntrega[]
  noPrescripcion: string
  credentials: {
    nit: string
    token: string
  }
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

function getReporteResultKey(reporte: ReporteEntrega, index: number) {
  return `${reporte.IDReporteEntrega}-${reporte.NoEntrega ?? "na"}-${reporte.TipoTec ?? "na"}-${reporte.ConTec ?? "na"}-${index}`
}

function toApiMessage(payload: any): string {
  if (!payload) return "Sin detalle"

  const nestedResponse = payload?.results?.[0]?.response
  const nestedRegistro = payload?.results?.[0]?.registros?.[0]

  const rawMessage =
    (typeof payload?.mensaje === "string" && payload.mensaje.trim())
      ? payload.mensaje
      : (typeof payload?.error === "string" && payload.error.trim())
        ? payload.error
        : (typeof payload?.message === "string" && payload.message.trim())
          ? payload.message
          : (typeof nestedResponse === "string" && nestedResponse.trim())
            ? nestedResponse
            : ""

  const messageFromResponse = (() => {
    if (!rawMessage) return ""
    const match = rawMessage.match(/mensaje\s*=\s*"([^"]+)"/i)
    if (match?.[1]) return match[1].trim()
    return rawMessage.trim()
  })()

  const idAuxiliar =
    payload?.id_auxiliar ??
    payload?.registro?.id_auxiliar ??
    payload?.registros?.[0]?.id_auxiliar ??
    nestedRegistro?.id_auxiliar

  if (messageFromResponse) {
    const idText = idAuxiliar !== undefined && idAuxiliar !== null && String(idAuxiliar).trim()
      ? ` | ID auxiliar: ${String(idAuxiliar).trim()}`
      : ""
    return `${messageFromResponse}${idText}`
  }

  if (Array.isArray(payload?.omitidos) && payload.omitidos.length > 0) {
    const motivo = String(payload.omitidos[0]?.motivo ?? "").trim()
    if (motivo) return motivo
  }
  return "Respuesta recibida"
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

export function SuministroModal({
  open,
  onClose,
  reportes,
  noPrescripcion,
  credentials,
  onSuccess
}: SuministroModalProps) {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<SuministroResult[]>([])

  // Obtener credenciales robustamente (igual que en el masivo)
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

  // Filtrar reportes elegibles para suministro
  // Reglas: EstRepEntrega=1, EstadoEntrega=1, CausaNoEntrega vacía,
  // FecRepEntrega menor a la fecha actual y sin FecAnulacion
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

  const handleProcesarSuministro = async () => {
    if (reportesValidos.length === 0) {
      toast.error("No hay reportes elegibles", {
        description: "No hay reportes de entrega que cumplan las condiciones para procesar suministro.",
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
          "Suministro",
          `Prescripción ${noPrescripcion}: no hay credenciales (NIT/token) configuradas para procesar el suministro.`
        )
        setProcessing(false)
        return
      }

      // Fuente de verdad para última entrega: NoEntrega de direccionamiento
      // (los reportes de entrega pueden venir incompletos)
      let ultimaEntregaByTec = new Map<string, number>()
      try {
        const dirParams = new URLSearchParams({
          nit,
          tokenAcceso: token,
          tipo: "prescripcion",
          noPrescripcion,
        })
        const dirResponse = await fetch(`/api/mipres/direccionamiento?${dirParams.toString()}`)
        const dirJson = await dirResponse.json()

        const direccionamientos: Direccionamiento[] = Array.isArray(dirJson?.data)
          ? dirJson.data
          : dirJson?.data
            ? [dirJson.data]
            : []

        for (const dir of direccionamientos) {
          if (dir?.FecAnulacion) continue
          const key = `${String(dir.NoPrescripcion)}|${String(dir.TipoTec)}|${String(dir.ConTec)}`
          const noEntrega = Number(dir.NoEntrega || 0)
          const current = ultimaEntregaByTec.get(key) || 0
          if (noEntrega > current) {
            ultimaEntregaByTec.set(key, noEntrega)
          }
        }
      } catch {
      }

      // Procesar cada reporte individualmente como solicitado
      for (const [index, reporte] of reportesValidos.entries()) {
        const resultKey = getReporteResultKey(reporte, index)
        // Verificar si ya fue procesado en esta sesión
        if (newResults.find(r => r.id === resultKey)) continue

        try {
          // Lógica de cálculo solicitada:
          // 1. UltEntrega: Buscar reporte de entrega por prescripción completo y mirar si es el último
          // Filtrar entregas: NoPrescripcion, TipoTec, ConTec, FecAnulacion = null
          // IMPORTANTE: Se asume que 'reportes' contiene TODOS los reportes de la prescripción para poder calcular UltEntrega correctamente
          const entregasRelacionadas = reportes.filter(r => 
            r.NoPrescripcion === reporte.NoPrescripcion &&
            r.TipoTec === reporte.TipoTec &&
            r.ConTec === reporte.ConTec &&
            !r.FecAnulacion
          ).sort((a, b) => {
            // Ordenar por NoEntrega ascendente para saber cuál es la última
            return (a.NoEntrega || 0) - (b.NoEntrega || 0)
          })

          const ultimaEntrega = entregasRelacionadas[entregasRelacionadas.length - 1]

          // Regla principal: usar NoEntrega desde direccionamiento por tecnología/prescripción.
          // Fallback: si no hay direccionamiento, usar lógica previa con reportes.
          const dirKey = `${String(reporte.NoPrescripcion)}|${String(reporte.TipoTec)}|${String(reporte.ConTec)}`
          const ultimaEntregaDireccionamiento = ultimaEntregaByTec.get(dirKey)
          const esUltimaEntrega =
            ultimaEntregaDireccionamiento !== undefined
              ? (Number(reporte.NoEntrega || 0) === Number(ultimaEntregaDireccionamiento) ? 1 : 0)
              : (ultimaEntrega && ultimaEntrega.IDReporteEntrega === reporte.IDReporteEntrega ? 1 : 0)

          const causaNoEntregaRaw = reporte.CausaNoEntrega
          const hasCausaNoEntrega =
            causaNoEntregaRaw !== null &&
            causaNoEntregaRaw !== undefined &&
            String(causaNoEntregaRaw).trim() !== ""

          const entregaCompleta = reporte.EstadoEntrega === 1 && !hasCausaNoEntrega ? 1 : 0

          // Construir objeto de suministro según instrucción
          const suministroPayload = {
            ID: reporte.ID,
            UltEntrega: esUltimaEntrega,
            EntregaCompleta: entregaCompleta,
            CausaNoEntrega: reporte.CausaNoEntrega || 0, 
            NoPrescripcionAsociada: null,
            ConTecAsociada: reporte.ConTec,
            CantTotEntregada: reporte.CantTotEntregada,
            NoLote: reporte.NoLote,
            ValorEntregado: reporte.ValorEntregado?.toString()
          }

          // Realizar la petición usando fetch en lugar de axios
          try {
            const suministroRequestBody = {
              nit,
              tokenAcceso: token,
              body: suministroPayload
            }

            const response = await fetch("/api/mipres/suministro", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(suministroRequestBody),
            })

            const data = await response.json()
            if (data?.success) {
              toast.success("El suministro ya fue diligenciado a WSSuministroAPI", {
                description: "Respuesta recibida",
              })
            } else {
              toast.error("El suministro no fue diligenciado a WSSuministroAPI", {
                description: "Respuesta recibida",
              })
            }

            if (data.success) {
              // Normalizar campos que la API puede devolver con distintas claves o dentro de un array
              const rawData = data.data
              const raw = Array.isArray(rawData) ? (rawData[0] || {}) : (rawData || {})
              const normalized: any = { ...(typeof raw === "object" ? raw : {}) }

              const extractedId = extractSuministroId(data)
              normalized.IDSuministro =
                normalized.IdSuministro ??
                normalized.Id ??
                extractedId ??
                undefined

              // Si la API no devolvió fecha de suministro, usar fecha/hora local
              normalized.FecSuministro = normalized.FecSuministro || formatLocalDateTime(new Date())

              newResults.push({
                id: resultKey,
                success: true,
                data: normalized,
              })
            } else {
              const suministroError = data.error || "Error desconocido"
              reportErrorNotification(
                "Suministro (SISPRO)",
                `Prescripción ${reporte.NoPrescripcion} (${reporte.TipoTec}-${reporte.ConTec}, entrega #${reporte.NoEntrega}): ${suministroError}`
              )
              newResults.push({
                id: resultKey,
                success: false,
                message: suministroError,
                data: data.data || null
              })
            }
          } catch (fetchError: any) {
            const message = fetchError.message || "Error de conexión"
            reportErrorNotification(
              "Suministro",
              `Prescripción ${reporte.NoPrescripcion} (${reporte.TipoTec}-${reporte.ConTec}, entrega #${reporte.NoEntrega}): ${message}`
            )
            newResults.push({
              id: resultKey,
              success: false,
              message
            })
          }

        } catch (error: any) {
          const message = error.message || "Error inesperado"
          reportErrorNotification(
            "Suministro",
            `Prescripción ${reporte.NoPrescripcion} (${reporte.TipoTec}-${reporte.ConTec}, entrega #${reporte.NoEntrega}): ${message}`
          )
          newResults.push({
            id: resultKey,
            success: false,
            message
          })
        }
        
        // Actualizar resultados progresivamente para feedback visual
        setResults([...newResults])
      }
      
      const successCount = newResults.filter(r => r.success).length
      
      if (successCount > 0) {
        // Esperar 2 segundos antes de notificar éxito y refrescar
        await new Promise((resolve) => setTimeout(resolve, 2000))
        toast.success("Suministros diligenciados correctamente", {
          description: `Se generaron ${successCount} suministros correctamente.`,
        })
      } else {
        toast.error("Error en el proceso", {
          description: "No se pudo generar ningún suministro.",
        })
      }

      // Siempre intentar refrescar tabla al finalizar el lote individual
      if (newResults.length > 0) {
        try {
          if (onSuccess) await onSuccess()
        } catch {
        }
      }

    } catch (error) {
      toast.error("Error crítico", {
        description: "Ocurrió un error inesperado al iniciar el proceso.",
      })
      reportErrorNotification(
        "Suministro",
        `Prescripción ${noPrescripcion}: ${error instanceof Error ? error.message : "Error inesperado al iniciar el proceso"}`
      )
    } finally {
      setProcessing(false)
    }
  }

  const getResultForReporte = (resultKey: string) => {
    return results.find(r => r.id === resultKey)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !processing && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Generar Suministro
          </DialogTitle>
          <DialogDescription>
            Prescripción: <span className="font-mono font-medium text-primary">{noPrescripcion}</span>
            <br />
            Se procesarán {reportesValidos.length} reportes de entrega elegibles.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-1 border rounded-md">
          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="space-y-4 p-4">
              {reportesValidos.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No hay reportes elegibles para generar suministro en esta prescripción.
                </div>
              )}

              {reportesValidos.map((reporte, index) => {
                const resultKey = getReporteResultKey(reporte, index)
                const result = getResultForReporte(resultKey)
                
                return (
                  <div key={resultKey} className="flex flex-col gap-2 p-3 border rounded-lg shadow-sm bg-background">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono">Entrega #{reporte.NoEntrega}</Badge>
                            <Badge variant="secondary">{reporte.TipoTec} - {reporte.ConTec}</Badge>
                            <span className="text-xs text-muted-foreground ml-2">ID: {reporte.IDReporteEntrega}</span>
                          </div>
                          <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                            <div><span className="font-semibold text-muted-foreground">Cantidad:</span> {reporte.CantTotEntregada}</div>
                            <div><span className="font-semibold text-muted-foreground">Valor:</span> ${reporte.ValorEntregado?.toLocaleString()}</div>
                            <div><span className="font-semibold text-muted-foreground">Fecha:</span> {reporte.FecRepEntrega?.split(" ")[0]}</div>
                            <div><span className="font-semibold text-muted-foreground">Lote:</span> {reporte.NoLote || "N/A"}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
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
                          <AlertDescription className="text-xs ml-2 mt-1">
                            {result.message}
                          </AlertDescription>
                        </Alert>
                      )}

                      {result && result.success && result.data && (
                        <div className="bg-muted/50 p-2 rounded text-xs font-mono mt-2 overflow-x-auto border border-muted">
                           <span className="font-semibold">Suministro ID:</span> {result.data.IDSuministro ?? "N/A"}
                           <br/>
                           <span className="font-semibold">Fecha:</span> {result.data.FecSuministro || "N/A"}
                        </div>
                      )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            {results.length > 0 ? "Cerrar" : "Cancelar"}
          </Button>
          <Button 
            onClick={handleProcesarSuministro} 
            disabled={processing || reportesValidos.length === 0 || results.length > 0}
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
