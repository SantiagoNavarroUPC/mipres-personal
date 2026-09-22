"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Package, AlertTriangle, ClipboardCheck, User, Calendar, Hash,
  ArrowLeft, AlertCircle, CheckCircle2, Check, Loader2,
} from "lucide-react"
import { toast } from "sonner"
import type { ReporteEntrega } from "@/models/mipres-sispro/reporte-entrega/reporte-entrega"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento/direccionamiento"
import { ESTADOS_ENTREGA, TIPOS_TECNOLOGIAS, ESTADOS_REPORTE_ENTREGA, CAUSAS_NO_ENTREGAS } from "@/models/constants"
import { secureStorageGetItem } from "@/lib/secure-storage"

// ── Suministro helpers (from SuministroModal) ─────────────────────────────────
interface SuministroResult {
  id: string
  success: boolean
  warning?: boolean
  message?: string
  data?: any
}

function parseDateTimeTs(value?: string | null) {
  if (!value) return 0
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value
  const ts = new Date(normalized).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function getReporteResultKey(reporte: ReporteEntrega, index: number) {
  return `${reporte.IDReporteEntrega}-${reporte.NoEntrega ?? "na"}-${reporte.TipoTec ?? "na"}-${reporte.ConTec ?? "na"}-${index}`
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
    value, value?.data,
    Array.isArray(value?.data) ? value.data[0] : null,
    value?.results?.[0], value?.results?.[0]?.response, value?.results?.[0]?.data,
    value?.data?.results?.[0], value?.data?.results?.[0]?.response,
  ]
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const id = candidate.IDSuministro ?? candidate.IdSuministro ?? candidate.idSuministro ??
      candidate.id_suministro ?? candidate.ID ?? candidate.Id ?? candidate.id
    if (id !== undefined && id !== null && String(id).trim()) return String(id).trim()
  }
  return null
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ReporteEntregaLecturaModalProps {
  reportes: ReporteEntrega[]
  open: boolean
  onClose: () => void
  noPrescripcion: string
  onFormVisibilityChange?: (open: boolean) => void
  onSuccess?: () => Promise<void>
  forceShowCausaNoEntrega?: boolean
}

export function ReporteEntregaLecturaModal({
  reportes,
  open,
  onClose,
  noPrescripcion,
  onFormVisibilityChange,
  onSuccess,
  forceShowCausaNoEntrega = false,
}: ReporteEntregaLecturaModalProps) {
  const [page, setPage] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [suministroResults, setSuministroResults] = useState<SuministroResult[]>([])

  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  useEffect(() => {
    if (!open) return
    setPage(1)
    setSuministroResults([])
  }, [open, noPrescripcion])

  const sortedReportes = useMemo(() => {
    return [...(reportes || [])].sort((a, b) => {
      const aKey = `${String(a.TipoTec ?? "")}-${Number(a.ConTec ?? 0)}-${Number(a.NoEntrega ?? 0)}`
      const bKey = `${String(b.TipoTec ?? "")}-${Number(b.ConTec ?? 0)}-${Number(b.NoEntrega ?? 0)}`
      return aKey.localeCompare(bKey)
    })
  }, [reportes])

  const reportesValidos = useMemo(() => {
    const nowTs = Date.now()
    return [...(reportes || [])]
      .filter((r) => {
        const fecRepTs = parseDateTimeTs(r.FecRepEntrega)
        const hasCausa = r.CausaNoEntrega !== null && r.CausaNoEntrega !== undefined && String(r.CausaNoEntrega).trim() !== ""
        return Number(r.EstRepEntrega) === 1 && Number(r.EstadoEntrega) === 1 && fecRepTs > 0 && fecRepTs < nowTs && !r.FecAnulacion && !hasCausa
      })
      .sort((a, b) => (a.NoEntrega || 0) - (b.NoEntrega || 0))
  }, [reportes])

  const currentReporte = sortedReportes[page - 1]

  const getRobustCredentials = () => {
    let nit = localStorage.getItem("mipres_nit") || ""
    let token = localStorage.getItem("mipres_token") || ""
    const saved = secureStorageGetItem("mipres_credentials")
    if (saved) {
      try {
        const p = JSON.parse(saved)
        nit = nit || p?.nit || ""
        token = token || p?.tokenAcceso || p?.token || ""
      } catch {}
    }
    return { nit, token }
  }

  const handleProcesarSuministro = async () => {
    if (reportesValidos.length === 0) { toast.error("No hay reportes elegibles para suministro."); return }
    setProcessing(true)
    const newResults: SuministroResult[] = []

    try {
      const { nit, token } = getRobustCredentials()
      if (!nit || !token) { toast.error("Sin credenciales para procesar suministro."); setProcessing(false); return }

      const ultimaEntregaByTec = new Map<string, number>()
      try {
        const dirParams = new URLSearchParams({ nit, tokenAcceso: token, tipo: "prescripcion", noPrescripcion })
        const dirJson = await fetch(`/api/mipres/direccionamiento?${dirParams.toString()}`).then(r => r.json())
        const dirs: Direccionamiento[] = Array.isArray(dirJson?.data) ? dirJson.data : dirJson?.data ? [dirJson.data] : []
        for (const dir of dirs) {
          if (dir?.FecAnulacion) continue
          const key = `${String(dir.NoPrescripcion)}|${String(dir.TipoTec)}|${String(dir.ConTec)}`
          const noEntrega = Number(dir.NoEntrega || 0)
          if (noEntrega > (ultimaEntregaByTec.get(key) || 0)) ultimaEntregaByTec.set(key, noEntrega)
        }
      } catch {}

      for (const [index, reporte] of reportesValidos.entries()) {
        const resultKey = getReporteResultKey(reporte, index)
        if (newResults.find(r => r.id === resultKey)) continue

        try {
          const entregasRel = (reportes || [])
            .filter(r => r.NoPrescripcion === reporte.NoPrescripcion && r.TipoTec === reporte.TipoTec && r.ConTec === reporte.ConTec && !r.FecAnulacion)
            .sort((a, b) => (a.NoEntrega || 0) - (b.NoEntrega || 0))
          const ultimaEntrega = entregasRel[entregasRel.length - 1]
          const dirKey = `${String(reporte.NoPrescripcion)}|${String(reporte.TipoTec)}|${String(reporte.ConTec)}`
          const ultDir = ultimaEntregaByTec.get(dirKey)
          const esUltima = ultDir !== undefined ? (Number(reporte.NoEntrega || 0) === Number(ultDir) ? 1 : 0) : (ultimaEntrega?.IDReporteEntrega === reporte.IDReporteEntrega ? 1 : 0)
          const hasCausa = reporte.CausaNoEntrega !== null && reporte.CausaNoEntrega !== undefined && String(reporte.CausaNoEntrega).trim() !== ""
          const entregaCompleta = reporte.EstadoEntrega === 1 && !hasCausa ? 1 : 0

          try {
            const suministroResp = await fetch("/api/mipres/suministro", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nit, tokenAcceso: token,
                body: { ID: reporte.ID, UltEntrega: esUltima, EntregaCompleta: entregaCompleta, CausaNoEntrega: reporte.CausaNoEntrega || 0, NoPrescripcionAsociada: null, ConTecAsociada: reporte.ConTec, CantTotEntregada: reporte.CantTotEntregada, NoLote: reporte.NoLote, ValorEntregado: reporte.ValorEntregado?.toString() },
              }),
            })
            const data = await suministroResp.json()

            if (data.success) {
              const rawData = data.data
              const raw = Array.isArray(rawData) ? (rawData[0] || {}) : (rawData || {})
              const normalized: any = { ...(typeof raw === "object" ? raw : {}) }
              normalized.IDSuministro = normalized.IdSuministro ?? normalized.Id ?? extractSuministroId(data) ?? undefined
              normalized.FecSuministro = normalized.FecSuministro || formatLocalDateTime(new Date())

              newResults.push({ id: resultKey, success: true, data: normalized })
            } else {
              newResults.push({ id: resultKey, success: false, message: data.error || "Error desconocido", data: data.data || null })
            }
          } catch (fetchError: any) {
            newResults.push({ id: resultKey, success: false, message: fetchError.message || "Error de conexión" })
          }
        } catch (error: any) {
          newResults.push({ id: resultKey, success: false, message: error.message || "Error inesperado" })
        }
        setSuministroResults([...newResults])
      }

      const successCount = newResults.filter(r => r.success).length
      if (successCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        toast.success(`${successCount} suministro(s) procesado(s) correctamente.`)
        try { await onSuccess?.() } catch {}
        onClose()
      } else {
        toast.error("No se pudo generar ningún suministro.")
      }
    } catch { toast.error("Error crítico al procesar suministros.") }
    finally { setProcessing(false) }
  }

  // ── Formatters ───────────────────────────────────────────────────────────
  const formatDateTime = (value?: string | null) => { if (!value) return "N/A"; return value.includes("T") ? value.replace("T", " ") : value }
  const formatDate = (value?: string | null) => { if (!value) return "N/A"; if (value.includes(" ")) return value.split(" ")[0] || "N/A"; if (value.includes("T")) return value.split("T")[0] || "N/A"; return value }
  const formatCurrency = (value?: number | string | null) => {
    if (value === null || value === undefined || value === "") return "N/A"
    const num = typeof value === "string" ? Number(value) : value
    if (isNaN(num)) return "N/A"
    return num.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })
  }
  const getCodEntregado = (r?: ReporteEntrega) => {
    const raw = (r as any)?.CodTecEntregado ?? (r as any)?.CodSerTecAEntregar ?? (r as any)?.CodTecnologiaEntregada ?? (r as any)?.CodTec ?? ""
    const v = String(raw ?? "").trim(); return v !== "" ? v : "N/A"
  }
  const getEstRepClasses = (val?: number | null) => {
    switch (Number(val)) {
      case 2: return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case 1: return "bg-amber-100 text-amber-700 border-amber-200"
      case 0: return "bg-destructive/10 text-destructive border-destructive/20"
      default: return "bg-muted"
    }
  }

  if (!open || !reportes || reportes.length === 0) return null

  return (
    <div className="flex gap-6 items-start">

      {/* ── Columna izquierda: detalle reporte ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-none">Detalle Reporte de Entrega</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prescripción <span className="font-mono font-semibold">{noPrescripcion}</span>
              {sortedReportes.length > 1 && (
                <> · Registro <span className="font-semibold">{page}</span> de <span className="font-semibold">{sortedReportes.length}</span></>
              )}
            </p>
          </div>
        </div>

        {/* Cards resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/5 text-primary"><User className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Paciente</div>
              <div className="font-semibold text-base">{currentReporte?.TipoIDPaciente} - {currentReporte?.NoIDPaciente}</div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/5 text-primary"><Hash className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Tecnología</div>
              <div className="font-semibold text-base">
                {TIPOS_TECNOLOGIAS[currentReporte?.TipoTec as keyof typeof TIPOS_TECNOLOGIAS] || "-"}
                <span className="text-muted-foreground"> #{currentReporte?.ConTec}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/5 text-primary"><Calendar className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Fecha Reporte</div>
              <div className="font-semibold text-base">{formatDateTime(currentReporte?.FecRepEntrega)}</div>
            </div>
          </div>
        </div>

        {/* Campos */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>ID</Label><Input value={currentReporte?.ID ?? "N/A"} readOnly className="mt-1 bg-muted" /></div>
            <div><Label>ID Reporte</Label><Input value={currentReporte?.IDReporteEntrega ?? "N/A"} readOnly className="mt-1 bg-muted" /></div>
            <div><Label>Fecha Entrega</Label><Input value={formatDateTime(currentReporte?.FecEntrega)} readOnly className="mt-1 bg-muted" /></div>
            <div><Label>Número Entrega</Label><Input value={currentReporte?.NoEntrega ?? "N/A"} readOnly className="mt-1 bg-muted" /></div>
            <div>
              <Label>Valor Entregado</Label>
              <Input readOnly className="mt-1 bg-muted font-semibold" value={formatCurrency(currentReporte?.ValorEntregado)} style={{ color: "#15803d" }} />
            </div>
            <div><Label>Código Tecnología</Label><Input value={getCodEntregado(currentReporte)} readOnly className="mt-1 bg-muted" /></div>
            <div><Label>Cantidad Total Entregada</Label><Input value={currentReporte?.CantTotEntregada ?? "N/A"} readOnly className="mt-1 bg-muted" /></div>
            <div><Label>No. Lote</Label><Input value={currentReporte?.NoLote ?? "N/A"} readOnly className="mt-1 bg-muted" /></div>
            {currentReporte?.FecAnulacion && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="p-2 rounded-md bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" /></div>
                <div className="flex-1">
                  <Label className="text-destructive">Fecha Anulación</Label>
                  <Input value={formatDate(currentReporte.FecAnulacion)} readOnly className="mt-1 bg-destructive/10 text-destructive border-destructive/20" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Estado Entrega</Label>
              <div className="mt-1 h-10 px-3 py-2 rounded-md border border-input bg-muted text-sm flex items-center">
                {(ESTADOS_ENTREGA as any)[currentReporte?.EstadoEntrega] || `Estado ${currentReporte?.EstadoEntrega ?? "-"}`}
              </div>
            </div>
            <div>
              <Label>Estado Reporte</Label>
              <div className={`mt-1 h-10 px-3 py-2 rounded-md border text-sm flex items-center ${getEstRepClasses(currentReporte?.EstRepEntrega)}`}>
                {(ESTADOS_REPORTE_ENTREGA as any)[currentReporte?.EstRepEntrega] || `Estado ${currentReporte?.EstRepEntrega ?? "-"}`}
              </div>
            </div>
            {currentReporte?.CausaNoEntrega && String(currentReporte.CausaNoEntrega).trim() !== "" && Number(currentReporte.CausaNoEntrega) > 0 && (
              <div>
                <Label className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-4 w-4" />Causa No Entrega</Label>
                <Input value={(CAUSAS_NO_ENTREGAS as any)[Number(currentReporte.CausaNoEntrega)] ?? String(currentReporte.CausaNoEntrega ?? "")} readOnly className="mt-1 bg-yellow-50 border-yellow-200 text-yellow-900" />
              </div>
            )}
          </div>
        </div>

        {/* Paginación */}
        {sortedReportes.length > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</Button>
            <p className="text-xs text-muted-foreground">{page} / {sortedReportes.length}</p>
            <Button variant="outline" onClick={() => setPage((p) => Math.min(sortedReportes.length, p + 1))} disabled={page >= sortedReportes.length}>Siguiente</Button>
          </div>
        )}
      </div>

      {/* ── Columna derecha: hacer suministro ── */}
      <div className="w-96 shrink-0 border rounded-lg overflow-hidden self-start sticky top-4">
        <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-2.5">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Hacer Suministro</span>
          {reportesValidos.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px]">{reportesValidos.length} elegible(s)</Badge>
          )}
        </div>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 space-y-3">
            {reportesValidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-muted p-3 rounded-full mb-3">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Sin reportes elegibles para suministro.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Deben tener EstRepEntrega=1, EstadoEntrega=1 y sin anulación.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {reportesValidos.map((reporte, index) => {
                    const resultKey = getReporteResultKey(reporte, index)
                    const result = suministroResults.find(r => r.id === resultKey)
                    return (
                      <div key={resultKey} className="flex flex-col gap-1.5 p-3 border rounded-lg bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-[10px]">Entrega #{reporte.NoEntrega}</Badge>
                            <span className="text-[10px] text-muted-foreground">{reporte.TipoTec}-{reporte.ConTec}</span>
                          </div>
                          {result ? (
                            result.success ? (
                              result.warning ? (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 gap-1 text-[10px]">
                                  <AlertCircle className="h-3 w-3" /> Advertencia
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 gap-1 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" /> Exitoso
                                </Badge>
                              )
                            ) : (
                              <Badge variant="destructive" className="gap-1 text-[10px]">
                                <AlertCircle className="h-3 w-3" /> Error
                              </Badge>
                            )
                          ) : processing ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground border-dashed text-[10px]">Pendiente</Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground grid grid-cols-2 gap-x-2">
                          <span>Cant: {reporte.CantTotEntregada}</span>
                          <span>Lote: {reporte.NoLote || "N/A"}</span>
                          <span>Valor: ${reporte.ValorEntregado?.toLocaleString()}</span>
                          <span>ID: {reporte.IDReporteEntrega}</span>
                        </div>
                        {result && !result.success && (
                          <Alert variant="destructive" className="py-1.5 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <AlertDescription className="text-xs ml-1">{result.message}</AlertDescription>
                          </Alert>
                        )}
                        {result?.success && result.data && (
                          <div className="bg-muted/50 rounded p-2 text-[10px] font-mono">
                            ID Suministro: {result.data.IDSuministro ?? "N/A"}<br />
                            Fecha: {result.data.FecSuministro || "N/A"}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={handleProcesarSuministro}
                  disabled={processing || suministroResults.length > 0}
                >
                  {processing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
                  ) : suministroResults.length > 0 ? (
                    <><Check className="mr-2 h-4 w-4" />Finalizado</>
                  ) : "Confirmar Suministros"}
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

    </div>
  )
}
