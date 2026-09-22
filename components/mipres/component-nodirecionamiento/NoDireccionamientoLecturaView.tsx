"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  XCircle, User, ArrowLeft,
} from "lucide-react"
import type { MipresCredentials } from "@/models/credentials.model"
import type { NoDireccionamiento } from "@/models/mipres-sispro/no_direccionamiento/no_direccionamiento"
import {
  CAUSAS_NO_ENTREGAS,
  TIPOS_DOCUMENTO,
  TIPOS_TECNOLOGIAS,
  ESTADOS_TECNOLOGIAS,
} from "@/models/constants"

interface NoDireccionamientoLecturaModalProps {
  prescripcion: any
  open: boolean
  onClose: () => void
  credentials: MipresCredentials
  tipo?: "prescripcion" | "tutela"
  onFormVisibilityChange?: (visible: boolean) => void
}

function normalizeNoDireccionamientos(data: any): NoDireccionamiento[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (data.root && Array.isArray(data.root)) return data.root
  if (data.noDireccionamientos && Array.isArray(data.noDireccionamientos)) return data.noDireccionamientos
  return [data]
}


export function NoDireccionamientoLecturaModal({
  prescripcion,
  open,
  onClose,
  credentials,
  tipo,
  onFormVisibilityChange,
}: NoDireccionamientoLecturaModalProps) {
  const tipoDocumento = tipo || (prescripcion?.NoTutela ? "tutela" : "prescripcion")
  const numero = tipoDocumento === "tutela" ? prescripcion?.NoTutela : prescripcion?.NoPrescripcion
  const readonlyInputClass = "mt-1 border border-rose-200 bg-rose-50 dark:border-zinc-700 dark:bg-zinc-900"

  const [rows, setRows] = useState<NoDireccionamiento[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  const getTipoTecLabel = (tipoTec?: string) => {
    if (!tipoTec) return "Desconocido"
    const tipoLabel = TIPOS_TECNOLOGIAS[tipoTec as keyof typeof TIPOS_TECNOLOGIAS]
    if (tipoLabel) return tipoLabel
    const estadoLabel = ESTADOS_TECNOLOGIAS[Number(tipoTec) as keyof typeof ESTADOS_TECNOLOGIAS]
    if (estadoLabel) return estadoLabel
    return tipoTec
  }

  const getDescripcionServicio = (row: NoDireccionamiento) => {
    const conTec = Number(row.ConTec)
    switch (row.TipoTec) {
      case "M": { const meds = prescripcion?.medicamentos || []; const found = meds.find((m: any) => Number(m.ConOrden) === conTec) || meds[conTec - 1]; return found?.DescMedPrinAct || "" }
      case "P": { const procs = prescripcion?.procedimientos || []; const found = procs.find((p: any) => Number(p.ConOrdenPro) === conTec) || procs[conTec - 1]; return found?.DescPro || "" }
      case "N": { const nutrs = prescripcion?.productosNutricionales || []; const found = nutrs.find((n: any) => Number(n.ConOrdenPN) === conTec) || nutrs[conTec - 1]; return found?.DescProdNutr || "" }
      case "S": { const servs = prescripcion?.serviciosComplementarios || []; const found = servs.find((s: any) => Number(s.ConOrdenSC) === conTec) || servs[conTec - 1]; return found?.DescSerComp || "" }
      case "D": { const disps = prescripcion?.dispositivos || []; const found = disps.find((d: any) => Number(d.ConOrdenDM) === conTec) || disps[conTec - 1]; return found?.CodDisp || "" }
      default: return ""
    }
  }

  const getCausaNoEntregaLabel = (causa: number): string => {
    return CAUSAS_NO_ENTREGAS[causa as keyof typeof CAUSAS_NO_ENTREGAS] || `Causa ${causa}`
  }

  useEffect(() => {
    if (!open || !prescripcion) return
    setRows([])
    setPage(1)
    setError(null)

    const tokenSubsidiado = credentials.tokenAccesoSubsidiado || ""
    const tokenContributivo = credentials.tokenAccesoContributivo || ""
    if (!credentials.nit || !tokenSubsidiado || !tokenContributivo) { setError("Configure NIT y Token de acceso antes de consultar"); return }

    const run = async () => {
      setLoading(true)
      try {
        const queryParams = new URLSearchParams({ nit: credentials.nit, tokenAccesoSubsidiado: tokenSubsidiado, tokenAccesoContributivo: tokenContributivo, tipo: "prescripcion", noPrescripcion: numero || "" })
        const response = await fetch(`/api/mipres/no-direccionamiento?${queryParams.toString()}`)
        const result = await response.json()
        if (result.success) { setRows(normalizeNoDireccionamientos(result.data)) } else { setError(result.error || "Error al consultar no direccionamiento") }
      } catch {
        setError("Error de conexión con el servidor")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [open, prescripcion, credentials, numero])

  if (!prescripcion || !open) return null

  return (
    <div className="flex gap-6 items-start">

      {/* ── Columna izquierda ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-rose-100">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-none">Ver no direccionamiento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tipoDocumento === "tutela" ? "Tutela" : "Prescripción"} <span className="font-mono">{numero}</span>
            </p>
          </div>
        </div>

        {/* Paciente */}
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-100 flex items-center gap-4">
          <div className="p-2 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Paciente</p>
            <p className="font-medium text-base">{prescripcion.PNPaciente} {prescripcion.PAPaciente}</p>
          </div>
        </div>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {loading && <Alert><AlertDescription>Cargando no direccionamiento...</AlertDescription></Alert>}
        {!loading && !error && rows.length === 0 && <Alert><AlertDescription>No hay registros de no direccionamiento.</AlertDescription></Alert>}

        {!loading && rows.length > 0 && (
          <div className="space-y-4">
            {rows.slice(page - 1, page).map((row, idx) => {
              const absoluteIndex = page - 1 + idx
              const descripcion = getDescripcionServicio(row)
              return (
                <div key={row.IDNODireccionamiento || `${row.NoPrescripcion}-${absoluteIndex}`} className="space-y-2">
                  {rows.length > 1 && (
                    <p className="text-xs text-muted-foreground">{page} / {rows.length}</p>
                  )}
                  <div className="rounded-lg border border-rose-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="mb-4">
                      <Badge variant="destructive" className="bg-red-500">No Direccionamiento</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {row.IDNODireccionamiento && (
                        <div><Label>ID No Direccionamiento</Label><Input value={row.IDNODireccionamiento} readOnly className={readonlyInputClass} /></div>
                      )}
                      <div><Label>Número de Prescripción</Label><Input value={row.NoPrescripcion} readOnly className={readonlyInputClass} /></div>
                      <div><Label>Tipo de Servicio o Tecnología</Label><Input value={`${row.TipoTec} - ${getTipoTecLabel(row.TipoTec)}`} readOnly className={readonlyInputClass} /></div>
                      <div><Label>Consecutivo del Servicio o Tecnología</Label><Input value={row.ConTec} readOnly className={readonlyInputClass} /></div>
                      {descripcion && (
                        <div className="sm:col-span-2"><Label>Descripción del Servicio</Label><Input value={descripcion} readOnly className={readonlyInputClass} /></div>
                      )}
                      <div><Label>Tipo de Documento del Paciente</Label><Input value={`${row.TipoIDPaciente} - ${TIPOS_DOCUMENTO[row.TipoIDPaciente as keyof typeof TIPOS_DOCUMENTO] || ""}`} readOnly className={readonlyInputClass} /></div>
                      <div><Label>Número de Documento del Paciente</Label><Input value={row.NoIDPaciente} readOnly className={readonlyInputClass} /></div>
                      {row.NoPrescripcionAsociada && (
                        <div><Label>Prescripción Asociada</Label><Input value={row.NoPrescripcionAsociada} readOnly className={readonlyInputClass} /></div>
                      )}
                      {row.ConTecAsociada > 0 && (
                        <div><Label>Consecutivo Tecnología Asociada</Label><Input value={row.ConTecAsociada} readOnly className={readonlyInputClass} /></div>
                      )}
                    </div>
                    <div className="mt-4">
                      <Label>Causa de No Entrega</Label>
                      <div className="mt-2 rounded-md border border-red-200 bg-red-100 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                        <p className="text-sm font-medium text-red-900 dark:text-zinc-100">{getCausaNoEntregaLabel(row.CausaNoEntrega)}</p>
                      </div>
                    </div>
                    {row.FecAnulacion && (
                      <div className="mt-4">
                        <Label className="text-destructive">Fecha de Anulación</Label>
                        <Input value={row.FecAnulacion} readOnly className={`${readonlyInputClass} text-destructive`} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {rows.length > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="border-red-500 hover:bg-[#FB2C36] hover:text-white">Anterior</Button>
                <p className="text-xs text-muted-foreground">{page} / {rows.length}</p>
                <Button variant="outline" onClick={() => setPage(p => Math.min(rows.length, p + 1))} disabled={page >= rows.length} className="border-red-500 hover:bg-[#FB2C36] hover:text-white">Siguiente</Button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
