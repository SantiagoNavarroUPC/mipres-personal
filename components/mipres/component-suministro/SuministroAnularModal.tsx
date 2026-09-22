"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, Trash2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import type { Suministro } from "@/models/mipres-sispro/suministro/suministro"
import { secureStorageGetItem } from "@/lib/secure-storage"

interface SuministroAnularModalProps {
  open: boolean
  onClose: () => void
  suministros: Suministro[]
  noPrescripcion: string
  credentials: {
    nit: string
    token?: string
  }
  onRefresh?: () => Promise<void>
  onFormVisibilityChange?: (open: boolean) => void
}

interface AnularResult {
  id: string
  success: boolean
  message?: string
}

export function SuministroAnularModal({
  open,
  onClose,
  suministros,
  noPrescripcion,
  credentials,
  onRefresh,
  onFormVisibilityChange,
}: SuministroAnularModalProps) {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<AnularResult[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const validSuministros = useMemo(() => suministros || [], [suministros])

  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  useEffect(() => {
    if (!open) {
      setResults([])
      setSelectedIds([])
      return
    }
    setResults([])
    setSelectedIds(validSuministros.filter(s => !s.FecAnulacion).map(s => String(s.IDSuministro ?? s.ID)))
  }, [open, validSuministros])

  const getRobustCredentials = () => {
    let nit = credentials.nit || ""
    let token = credentials.token || ""
    if (typeof window !== "undefined") {
      const storedNit = localStorage.getItem("mipres_nit")
      const storedToken = localStorage.getItem("mipres_token")
      if (storedNit && !nit) nit = storedNit
      if (storedToken && !token) token = storedToken
    }
    const saved = secureStorageGetItem("mipres_credentials")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        nit = nit || parsed?.nit || ""
        token = token || parsed?.tokenAcceso || parsed?.token || ""
      } catch {}
    }
    return { nit, token }
  }

  const handleProcesarAnulacion = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un suministro a anular")
      return
    }

    setProcessing(true)
    const newResults: AnularResult[] = []

    try {
      const { nit, token } = getRobustCredentials()
      if (!nit || !token) {
        toast.error("No hay NIT o token para anular suministros")
        setProcessing(false)
        return
      }

      for (const id of selectedIds) {
        if (newResults.find(r => r.id === id)) continue

        try {
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
          if (data.success) {
            newResults.push({ id, success: true })
            toast.success(`Suministro ${id} anulado correctamente`)
          } else {
            newResults.push({ id, success: false, message: data.error || "Error desconocido" })
            toast.error(`Error anulando ${id}: ${data.error || "Error desconocido"}`)
          }
        } catch (error: any) {
          newResults.push({ id, success: false, message: error?.message || "Error inesperado" })
          toast.error(`Error anulando ${id}: ${error?.message || "Error inesperado"}`)
        }

        setResults([...newResults])
      }

      const successCount = newResults.filter(r => r.success).length

      if (onRefresh) {
        try { await onRefresh() } catch {}
      }

      if (successCount === selectedIds.length && successCount > 0) {
        toast.success(`Se anularon ${successCount} suministros`)
        await new Promise(r => setTimeout(r, 800))
        onClose()
      } else if (successCount > 0) {
        toast.warning(`Se anularon ${successCount} de ${selectedIds.length} suministros`)
      } else {
        toast.error("No se pudo anular ningún suministro")
      }
    } finally {
      setProcessing(false)
    }
  }

  const toggleSelect = (id: string, checked: boolean) => {
    if (processing || results.length > 0) return
    if (checked) setSelectedIds(prev => (prev.includes(id) ? prev : [...prev, id]))
    else setSelectedIds(prev => prev.filter(x => x !== id))
  }

  if (!open) return null

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-destructive/20">
        <Button variant="ghost" size="icon" onClick={onClose} disabled={processing} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-none">Anular Suministros</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prescripción <span className="font-mono font-semibold text-primary">{noPrescripcion}</span>
            {" · "}<span className="font-semibold">{selectedIds.length}</span> seleccionados de <span className="font-semibold">{validSuministros.length}</span>
          </p>
        </div>
      </div>

      <Alert variant="destructive" className="py-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs ml-1">
          Esta acción es irreversible. Los suministros anulados no podrán recuperarse.
        </AlertDescription>
      </Alert>

      {/* Controles de selección */}
      {validSuministros.length > 0 && results.length === 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={processing}
            onClick={() => setSelectedIds(validSuministros.filter(s => !s.FecAnulacion).map(s => String(s.IDSuministro ?? s.ID)))}
          >
            Seleccionar todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={processing}
            onClick={() => setSelectedIds([])}
          >
            Limpiar selección
          </Button>
        </div>
      )}

      {/* Lista de suministros */}
      <div className="space-y-3">
        {validSuministros.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No hay suministros para anular.
          </div>
        )}

        {validSuministros.map(s => {
          const id = String(s.IDSuministro ?? s.ID)
          const isSelected = selectedIds.includes(id)
          const alreadyAnulado = !!s.FecAnulacion
          const result = results.find(r => r.id === id)

          return (
            <div key={id} className="flex flex-col gap-2 p-3 border rounded-lg bg-card">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary"
                    checked={isSelected}
                    disabled={processing || alreadyAnulado || results.length > 0}
                    onChange={e => toggleSelect(id, e.target.checked)}
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="font-mono text-xs">ID: {s.IDSuministro ?? id}</Badge>
                      {s.NoEntrega !== undefined && (
                        <Badge variant="outline" className="font-mono text-xs">Entrega #{s.NoEntrega}</Badge>
                      )}
                      {s.ConTecAsociada !== undefined && (
                        <Badge variant="secondary" className="text-xs">{s.ConTecAsociada}</Badge>
                      )}
                    </div>
                    {s.FecSuministro && (
                      <div className="text-xs text-muted-foreground">Fecha: {s.FecSuministro}</div>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {alreadyAnulado ? (
                    <Badge variant="destructive" className="text-xs">Anulado</Badge>
                  ) : result ? (
                    result.success ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" /> Anulado
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertCircle className="h-3 w-3" /> Error
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-dashed text-xs">
                      {isSelected ? "Seleccionado" : "Pendiente"}
                    </Badge>
                  )}
                </div>
              </div>

              {result && !result.success && (
                <Alert variant="destructive" className="py-1.5">
                  <AlertCircle className="h-3 w-3" />
                  <AlertTitle className="text-xs font-semibold ml-1">Error</AlertTitle>
                  <AlertDescription className="text-xs ml-1">{result.message}</AlertDescription>
                </Alert>
              )}
            </div>
          )
        })}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={processing}>
          {results.length > 0 ? "Cerrar" : "Cancelar"}
        </Button>
        <Button
          variant="destructive"
          onClick={handleProcesarAnulacion}
          disabled={processing || validSuministros.length === 0 || selectedIds.length === 0 || results.length > 0}
          className="min-w-[160px]"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : results.length > 0 ? (
            "Finalizado"
          ) : (
            `Confirmar Anulación (${selectedIds.length})`
          )}
        </Button>
      </div>

    </div>
  )
}
