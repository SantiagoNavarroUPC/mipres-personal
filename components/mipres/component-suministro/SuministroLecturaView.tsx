"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Package, AlertTriangle, User, Calendar, Hash, ArrowLeft,
  Trash2, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import type { Suministro } from "@/models/mipres-sispro/suministro/suministro"
import type { ReporteEntrega } from "@/models/mipres-sispro/reporte-entrega/reporte-entrega"
import { ESTADOS_ENTREGA, TIPOS_TECNOLOGIAS, CAUSAS_NO_ENTREGAS } from "@/models/constants"
import { secureStorageGetItem } from "@/lib/secure-storage"

interface AnularResult {
  success: boolean
  message?: string
}

interface SuministroLecturaModalProps {
  suministros: Suministro[]
  open: boolean
  onClose: () => void
  noPrescripcion: string
  onFormVisibilityChange?: (open: boolean) => void
  onRefresh?: () => Promise<void>
}

export function SuministroLecturaModal({
  suministros,
  open,
  onClose,
  noPrescripcion,
  onFormVisibilityChange,
  onRefresh,
}: SuministroLecturaModalProps) {
  const [page, setPage] = useState(1)

  // Anular state
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [anularResults, setAnularResults] = useState<Record<string, AnularResult>>({})

  const sortedSuministros = useMemo(() => {
    const toNum = (v?: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
    }

    return [...(suministros || [])].sort((a, b) => {
      const ac = toNum(a.ConTecAsociada)
      const bc = toNum(b.ConTecAsociada)
      if (ac !== bc) return ac - bc

      const an = toNum(a.NoEntrega)
      const bn = toNum(b.NoEntrega)
      return an - bn
    })
  }, [suministros])

  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  useEffect(() => {
    if (!open) {
      setPage(1)
      setAnulandoId(null)
      setAnularResults({})
      return
    }
    setPage(1)
  }, [open, noPrescripcion])

  const currentSuministro = sortedSuministros[page - 1]

  const formatDateTime = (value?: string | null) => {
    if (!value) return "N/A"
    return value.includes("T") ? value.replace("T", " ") : value
  }

  const formatCurrency = (value?: number | string | null) => {
    if (value === null || value === undefined || value === "") return "N/A"
    const num = typeof value === "string" ? Number(value) : value
    if (isNaN(num)) return "N/A"
    return num.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })
  }

  const [prescripcionReportes, setPrescripcionReportes] = useState<ReporteEntrega[] | null>(null)

  useEffect(() => {
    if (!open) return
    const saved = typeof window !== "undefined" ? secureStorageGetItem("mipres_credentials") : null
    let nit: string | null = null
    let tokenAcceso: string | null = null
    let tokenAccesoSubsidiado: string | null = null
    let tokenAccesoContributivo: string | null = null

    if (saved) {
      try {
        const creds = JSON.parse(saved)
        nit = creds.nit || null
        tokenAcceso = creds.tokenAcceso || null
        tokenAccesoSubsidiado = creds.tokenAccesoSubsidiado || null
        tokenAccesoContributivo = creds.tokenAccesoContributivo || null
      } catch (e) {
        // ignore parse errors
      }
    }

    if (!nit || !noPrescripcion) {
      setPrescripcionReportes(null)
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      nit,
      tipo: "prescripcion",
      noPrescripcion,
    } as Record<string, string>)

    if (tokenAcceso) params.set("tokenAcceso", tokenAcceso)
    if (tokenAccesoSubsidiado) params.set("tokenAccesoSubsidiado", tokenAccesoSubsidiado)
    if (tokenAccesoContributivo) params.set("tokenAccesoContributivo", tokenAccesoContributivo)

    fetch(`/api/mipres/reporte-entrega?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) setPrescripcionReportes(res.data)
        else setPrescripcionReportes([])
      })
      .catch(() => setPrescripcionReportes([]))

    return () => controller.abort()
  }, [open, noPrescripcion])

  const findConTecFromReportes = (codTecEntregado?: string | null) => {
    if (!prescripcionReportes) return undefined

    const normalize = (s?: string) => (s ? String(s).toLowerCase().replace(/[^0-9a-z]/g, "") : "")

    if (codTecEntregado) {
      const trimmed = String(codTecEntregado).trim()
      let found = prescripcionReportes.find(r => r.CodTecEntregado && String(r.CodTecEntregado).trim() === trimmed)
      if (found) return found.ConTec

      const norm = normalize(trimmed)
      found = prescripcionReportes.find(r => r.CodTecEntregado && normalize(String(r.CodTecEntregado)) === norm)
      if (found) return found.ConTec

      found = prescripcionReportes.find(r => r.CodTecEntregado && (String(r.CodTecEntregado).includes(trimmed) || trimmed.includes(String(r.CodTecEntregado))))
      if (found) return found.ConTec
    }

    if (currentSuministro?.ConTecAsociada !== undefined && currentSuministro?.ConTecAsociada !== null) {
      const cnum = Number(currentSuministro.ConTecAsociada)
      if (!isNaN(cnum)) {
        const found = prescripcionReportes.find(r => Number(r.ConTec) === cnum)
        if (found) return found.ConTec
      }
    }

    return undefined
  }

  const associatedConTec = findConTecFromReportes(currentSuministro?.CodTecEntregado)

  const codTecEntregadoDisplay = useMemo(() => {
    if (currentSuministro?.CodTecEntregado) return currentSuministro.CodTecEntregado

    if (prescripcionReportes && currentSuministro?.ConTecAsociada) {
      const reporte = prescripcionReportes.find(
        r => String(r.ConTec) === String(currentSuministro.ConTecAsociada)
      )
      if (reporte?.CodTecEntregado) return reporte.CodTecEntregado
    }

    return "N/A"
  }, [currentSuministro, prescripcionReportes])

  // --- Anular helpers ---
  const getRobustCredentials = () => {
    let nit = ""
    let token = ""
    if (typeof window !== "undefined") {
      nit = localStorage.getItem("mipres_nit") || ""
      token = localStorage.getItem("mipres_token") || ""
    }
    const saved = secureStorageGetItem("mipres_credentials")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        nit = nit || parsed?.nit || ""
        token = token || parsed?.tokenAcceso || parsed?.tokenAccesoSubsidiado || parsed?.tokenAccesoContributivo || ""
      } catch {}
    }
    return { nit, token }
  }

  const handleAnular = async (suministro: Suministro) => {
    const id = String(suministro.IDSuministro ?? suministro.ID)
    if (anulandoId === id) return
    setAnulandoId(id)

    try {
      const { nit, token } = getRobustCredentials()
      if (!nit || !token) {
        toast.error("No hay credenciales para anular suministros")
        return
      }

      const response = await fetch("/api/mipres/suministro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nit, tokenAcceso: token, idSuministro: id }),
      })

      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = { success: false, error: `Respuesta no JSON (status ${response.status})` }
      }

      if (data?.success) {
        setAnularResults(prev => ({ ...prev, [id]: { success: true } }))
        toast.success(`Suministro ${id} anulado correctamente`)
        if (onRefresh) {
          try { await onRefresh() } catch {}
        }
      } else {
        const msg = data?.error || "Error desconocido"
        setAnularResults(prev => ({ ...prev, [id]: { success: false, message: msg } }))
        toast.error(`Error anulando ${id}: ${msg}`)
      }
    } catch (error: any) {
      const msg = error?.message || "Error inesperado"
      setAnularResults(prev => ({ ...prev, [id]: { success: false, message: msg } }))
      toast.error(`Error anulando ${id}: ${msg}`)
    } finally {
      setAnulandoId(null)
    }
  }

  const vigentes = sortedSuministros.filter(
    s => !s.FecAnulacion && !anularResults[String(s.IDSuministro ?? s.ID)]?.success
  )

  if (!open || !suministros || suministros.length === 0) return null

  return (
    <div className="flex gap-6 items-start">

      {/* Columna izquierda: detalle */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-amber-100">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-none">Detalle de Suministro</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prescripción <span className="font-mono font-semibold text-primary">{noPrescripcion}</span>
              {sortedSuministros.length > 1 && (
                <> · Registro <span className="font-semibold">{page}</span> de <span className="font-semibold">{sortedSuministros.length}</span></>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-[#f5e6b5] bg-amber-100 p-4 flex items-start gap-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="p-2 rounded-md bg-amber-50 text-amber-700 dark:bg-zinc-800 dark:text-amber-300">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Paciente</div>
                <div className="font-semibold text-base">
                  {currentSuministro?.TipoIDPaciente && currentSuministro?.NoIDPaciente
                    ? `${currentSuministro.TipoIDPaciente} - ${currentSuministro.NoIDPaciente}`
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
                  {currentSuministro?.TipoTec ? (TIPOS_TECNOLOGIAS[currentSuministro.TipoTec as keyof typeof TIPOS_TECNOLOGIAS] || currentSuministro.TipoTec) : "Tecnología"}{" "}
                  <span className="text-muted-foreground">#{findConTecFromReportes(currentSuministro?.CodTecEntregado) ?? currentSuministro?.ConTecAsociada ?? "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#f5e6b9] bg-amber-100 p-4 flex items-start gap-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="p-2 rounded-md bg-amber-50 text-amber-700 dark:bg-zinc-800 dark:text-amber-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fecha Suministro</div>
                <div className="font-semibold text-base">{formatDateTime(currentSuministro?.FecSuministro || currentSuministro?.FecEntrega)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>ID</Label>
                <Input value={currentSuministro?.ID ?? "N/A"} readOnly className="mt-1 bg-amber-100 border-[#f5e6b5] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
              <div>
                <Label>ID Suministro</Label>
                <Input value={currentSuministro?.IDSuministro ?? "N/A"} readOnly className="mt-1 bg-amber-100 border-[#f5e6b5] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
              <div>
                <Label>Número de Entrega</Label>
                <Input value={currentSuministro?.NoEntrega ?? "N/A"} readOnly className="mt-1 bg-amber-100 border-[#f5e6b5] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
              <div>
                <Label>Última Entrega</Label>
                <div className="mt-1 h-10 px-3 py-2 rounded-md border border-[#f5e6b5] bg-amber-100 text-sm flex items-center dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  {currentSuministro?.UltEntrega === 1 ? "Sí" : "No"}
                </div>
              </div>
              <div>
                <Label>Valor Entregado</Label>
                <Input
                  readOnly
                  className="mt-1 bg-amber-100 border-[#f5e6b5] font-semibold text-green-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-emerald-300"
                  value={formatCurrency(currentSuministro?.ValorEntregado)}
                />
              </div>
              <div>
                <Label>Código Tecnología Entregado</Label>
                <Input value={codTecEntregadoDisplay} readOnly className="mt-1 bg-amber-100 border-[#f5e6b5] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
              <div>
                <Label>Cantidad Total Entregada</Label>
                <Input value={currentSuministro?.CantTotEntregada ?? "N/A"} readOnly className="mt-1 bg-amber-100 border-[#f5e6b5] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
              <div>
                <Label>No. Lote</Label>
                <Input value={currentSuministro?.NoLote ?? "No tiene Lote"} readOnly className="mt-1 bg-amber-100 border-[#f5e6b5] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" />
              </div>

              {currentSuministro?.FecAnulacion && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="p-2 rounded-md bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-destructive">Fecha Anulación</Label>
                    <Input value={formatDateTime(currentSuministro.FecAnulacion)} readOnly className="mt-1 bg-destructive/10 text-destructive border-destructive/20" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Entrega Completa</Label>
                <div className={`mt-1 h-10 px-3 py-2 rounded-md border text-sm flex items-center ${
                  currentSuministro?.EntregaCompleta === 1
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-amber-100 text-amber-700 border-[#f5e6b5]"
                }`}>
                  {currentSuministro?.EntregaCompleta === 1 ? "Completa" : "Parcial"}
                </div>
              </div>

              {currentSuministro?.EstadoEntrega !== undefined && (
                <div>
                  <Label>Estado Entrega</Label>
                  <div className="mt-1 h-10 px-3 py-2 rounded-md border border-[#f5e6b5] bg-amber-100 text-sm flex items-center dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                    {(ESTADOS_ENTREGA as any)[currentSuministro?.EstadoEntrega] || `Estado ${currentSuministro?.EstadoEntrega ?? "-"}`}
                  </div>
                </div>
              )}

              {currentSuministro?.CausaNoEntrega && Number(currentSuministro.CausaNoEntrega) > 0 && (
                <div>
                  <Label className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Causa No Entrega
                  </Label>
                  <Input
                    value={
                      (Number(currentSuministro?.CausaNoEntrega) > 0 && (CAUSAS_NO_ENTREGAS as any)[Number(currentSuministro?.CausaNoEntrega)])
                        ? (CAUSAS_NO_ENTREGAS as any)[Number(currentSuministro?.CausaNoEntrega)]
                        : currentSuministro.CausaNoEntrega
                    }
                    readOnly
                    className="mt-1 bg-amber-100 border-[#f5e6b5] text-yellow-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-yellow-300"
                  />
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
                {page} / {sortedSuministros.length}
              </p>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(sortedSuministros.length, p + 1))}
                disabled={page >= sortedSuministros.length}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Columna derecha: Anular Suministros */}
      <div className="w-80 shrink-0 sticky top-4 border rounded-lg overflow-hidden">
        <div className="bg-destructive/10 px-4 py-3 border-b">
          <h3 className="font-semibold text-sm text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Anular Suministros
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prescripción <span className="font-mono font-semibold">{noPrescripcion}</span>
          </p>
        </div>

        <div className="p-3 space-y-3">
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs ml-1">
              Esta acción es irreversible. El suministro no podrá recuperarse.
            </AlertDescription>
          </Alert>

          {vigentes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              Todos los suministros vigentes han sido anulados
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSuministros.map(s => {
                const id = String(s.IDSuministro ?? s.ID)
                const result = anularResults[id]
                const isAnulando = anulandoId === id
                const yaAnulado = !!s.FecAnulacion || result?.success

                return (
                  <div
                    key={id}
                    className={`p-3 border rounded-lg text-xs ${
                      yaAnulado ? "bg-muted/50 opacity-60" : "bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{id}
                        </Badge>
                        {s.FecSuministro && (
                          <div className="text-muted-foreground truncate">{s.FecSuministro}</div>
                        )}
                        {s.NoEntrega !== undefined && (
                          <div className="text-muted-foreground">Entrega #{s.NoEntrega}</div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {yaAnulado ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Anulado
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-3"
                            disabled={!!anulandoId}
                            onClick={() => handleAnular(s)}
                          >
                            {isAnulando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Anular"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {result && !result.success && (
                      <div className="mt-2 text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">{result.message}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
