"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  NotebookPen, Printer, User, CheckCircle,
  ArrowLeft, AlertTriangle, AlertCircle, Trash2, Loader2,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import type { MipresCredentials } from "@/models/credentials.model"
import { generateDireccionamientoPDF, downloadPDF } from "@/lib/plantillas_pdf/direccionamiento_pdf"
import { IPS_DUSAKAWI } from "@/lib/config/organizacion"

interface DireccionamientoLecturaModalProps {
  prescripcion: any
  open: boolean
  onClose: () => void
  credentials: MipresCredentials
  tipo?: "prescripcion" | "tutela"
  hideAnuladosOnLoad?: boolean
  onFormVisibilityChange?: (visible: boolean) => void
  onRequestDireccionar?: (prescripcion: any, params?: {
    tipoTec?: string
    conTec?: number
    prescItem?: any
    seedFromDelivery?: {
      NoIDProv?: string
      CodMunEnt?: string
      CodSerTecAEntregar?: string
      DirPaciente?: string
      TipoIDProv?: string
      CantTotAEntregar?: string
    }
  }) => void
}

type DireccionamientoLecturaRow = {
  id?: string
  ID?: string
  IDDireccionamiento?: string
  NomProv?: string
  NomPrestador?: string
  NombrePrestador?: string
  NoPrescripcion: string
  TipoTec: string
  ConTec: number
  TipoIDPaciente: string
  NoIDPaciente: string
  NoEntrega: number
  NoSubEntrega: number
  TipoIDProv: string
  NoIDProv: string
  CodMunEnt: string
  FecMaxEnt: string
  CantTotAEntregar: string
  DirPaciente: string
  CodSerTecAEntregar: string
  FecDireccionamiento?: string
  FecAnulacion?: string | null
}

function normalizeDireccionamientos(data: any): DireccionamientoLecturaRow[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (data.root && Array.isArray(data.root)) return data.root
  if (data.direccionamientos && Array.isArray(data.direccionamientos)) return data.direccionamientos
  return [data]
}


export function DireccionamientoLecturaModal({ prescripcion, open, onClose, credentials, tipo, onFormVisibilityChange, onRequestDireccionar }: DireccionamientoLecturaModalProps) {
  const tipoDocumento = tipo || (prescripcion?.NoTutela ? "tutela" : "prescripcion")
  const numero = tipoDocumento === "tutela" ? prescripcion?.NoTutela : prescripcion?.NoPrescripcion

  const [rows, setRows] = useState<DireccionamientoLecturaRow[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [anuladosIds, setAnuladosIds] = useState<Set<string>>(new Set())
  const [anularPage, setAnularPage] = useState(1)
  const ANULAR_PAGE_SIZE = 6

  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  const getTipoTecLabel = (tipo?: string) => {
    switch (tipo) {
      case "M": return "Medicamentos"
      case "P": return "Procedimientos"
      case "D": return "Dispositivos Médicos"
      case "N": return "Productos Nutricionales"
      case "S": return "Servicios Complementarios"
      default: return "Desconocido"
    }
  }

  const getDescripcionServicio = (row: DireccionamientoLecturaRow) => {
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

  const getJustificacion = (row: DireccionamientoLecturaRow) => {
    const conTec = Number(row.ConTec)
    switch (row.TipoTec) {
      case "M": { const meds = prescripcion?.medicamentos || []; const found = meds.find((m: any) => Number(m.ConOrden) === conTec) || meds[conTec - 1]; return found?.JustNoPBS || "" }
      case "P": { const procs = prescripcion?.procedimientos || []; const found = procs.find((p: any) => Number(p.ConOrdenPro) === conTec) || procs[conTec - 1]; return found?.JustNoPBS || "" }
      case "N": { const nutrs = prescripcion?.productosNutricionales || []; const found = nutrs.find((n: any) => Number(n.ConOrdenPN) === conTec) || nutrs[conTec - 1]; return found?.JustNoPB || "" }
      case "S": { const servs = prescripcion?.serviciosComplementarios || []; const found = servs.find((s: any) => Number(s.ConOrdenSC) === conTec) || servs[conTec - 1]; return found?.JustNoPBSSC || "" }
      case "D": { const disps = prescripcion?.dispositivos || []; const found = disps.find((d: any) => Number(d.ConOrdenDM) === conTec) || disps[conTec - 1]; return found?.JustNoPBS || "" }
      default: return ""
    }
  }

  const keyFor = (tipoTec: string, conTec: unknown) => `${String(tipoTec ?? "").trim()}:${Number(conTec ?? 0)}`

  const validationState = useMemo(() => {
    if (!prescripcion) return { complete: true, firstMissingKey: null }
    const types = [
      { key: "medicamentos", type: "M", idField: "ConOrden" },
      { key: "procedimientos", type: "P", idField: "ConOrdenPro" },
      { key: "productosNutricionales", type: "N", idField: "ConOrdenPN" },
      { key: "serviciosComplementarios", type: "S", idField: "ConOrdenSC" },
      { key: "dispositivos", type: "D", idField: "ConOrdenDM" },
    ]
    let allComplete = true
    let firstMissing: string | null = null

    for (const t of types) {
      const arr = prescripcion[t.key] || []
      if (!Array.isArray(arr) || arr.length === 0) continue
      const distinctConTecs = new Set<number>()
      const deliveredQuantities = new Map<number, number>()
      const activeEntregaKeys = new Set<string>()

      if (rows && rows.length > 0) {
        rows.forEach(r => {
          const rowNoPresc = String(r.NoPrescripcion || "").trim()
          const targetNoPresc = String(numero || "").trim()
          const anulada = Boolean(String(r.FecAnulacion || "").trim())
          if (!anulada && rowNoPresc === targetNoPresc && r.TipoTec === t.type) {
            const val = Number(r.ConTec)
            if (Number.isFinite(val) && val > 0) {
              const noEntrega = Number(r.NoEntrega)
              const entregaKey = `${t.type}|${val}|${Number.isFinite(noEntrega) ? noEntrega : 0}`
              if (activeEntregaKeys.has(entregaKey)) return
              activeEntregaKeys.add(entregaKey)
              distinctConTecs.add(val)
              const currentQty = deliveredQuantities.get(val) || 0
              deliveredQuantities.set(val, currentQty + (Number(r.CantTotAEntregar) || 0))
            }
          }
        })
      }

      if (distinctConTecs.size < arr.length) {
        allComplete = false
        if (!firstMissing) {
          for (const item of arr) {
            const id = Number(item[t.idField])
            if (Number.isFinite(id) && !distinctConTecs.has(id)) { firstMissing = keyFor(t.type, id); break }
          }
          if (!firstMissing && arr.length > 0) firstMissing = keyFor(t.type, Number(arr[0][t.idField]))
        }
      } else {
        for (const item of arr) {
          const id = Number(item[t.idField])
          if (Number.isFinite(id)) {
            const totalRequired = Number(item.CantTotalF || item.CantTotal || 0)
            const totalDelivered = deliveredQuantities.get(id) || 0
            if (totalDelivered < totalRequired) { allComplete = false; if (!firstMissing) firstMissing = keyFor(t.type, id); break }
          }
        }
      }
    }

    return { complete: allComplete, firstMissingKey: firstMissing }
  }, [prescripcion, rows, numero])

  const direccionamientoComplete = validationState.complete

  const pacienteDisplay = (() => {
    const firstName = String(prescripcion?.PNPaciente ?? "").trim()
    const lastName = String(prescripcion?.PAPaciente ?? "").trim()
    if (firstName || lastName) return `${firstName} ${lastName}`.trim()
    const tipoid = String(prescripcion?.TipoIDPaciente ?? "").trim()
    const noid = String(prescripcion?.NoIDPaciente ?? "").trim()
    if (tipoid || noid) return `${tipoid} - ${noid}`.trim()
    return "-"
  })()

  const getPrescItemByTipoConTec = (tipoTec: string, conTec: number) => {
    switch (tipoTec) {
      case "M": { const meds = prescripcion?.medicamentos || []; return meds.find((m: any) => Number(m.ConOrden) === conTec) || meds[conTec - 1] }
      case "P": { const procs = prescripcion?.procedimientos || []; return procs.find((p: any) => Number(p.ConOrdenPro) === conTec) || procs[conTec - 1] }
      case "N": { const nutrs = prescripcion?.productosNutricionales || []; return nutrs.find((n: any) => Number(n.ConOrdenPN) === conTec) || nutrs[conTec - 1] }
      case "S": { const servs = prescripcion?.serviciosComplementarios || []; return servs.find((s: any) => Number(s.ConOrdenSC) === conTec) || servs[conTec - 1] }
      case "D": { const disps = prescripcion?.dispositivos || []; return disps.find((d: any) => Number(d.ConOrdenDM) === conTec) || disps[conTec - 1] }
      default: return null
    }
  }

  const getSeedDeliveryForFocus = (tipoTec: string, conTec: number) => {
    const targetTipo = String(tipoTec || "").trim().toUpperCase()
    const targetConTec = Number(conTec || 0)
    const sameTecActivas = rows
      .filter(r => !String(r.FecAnulacion || "").trim() && String(r.TipoTec || "").trim().toUpperCase() === targetTipo && Number(r.ConTec) === targetConTec)
      .sort((a, b) => Number(a.NoEntrega || 0) - Number(b.NoEntrega || 0))
    const fallbackActiva = rows.filter(r => !String(r.FecAnulacion || "").trim()).sort((a, b) => Number(a.NoEntrega || 0) - Number(b.NoEntrega || 0))[0]
    return { seedBase: sameTecActivas[0] || fallbackActiva || null, sameTecSeed: sameTecActivas[0] || null }
  }

  const handlePrintPDF = async (row: DireccionamientoLecturaRow) => {
    setGeneratingPDF(true)
    try {
      const normalizeId = (value?: string | number | null) => String(value ?? "").replace(/\D/g, "")
      let ipsData = { nombre: "N/A", direccion: "N/A", telefono: "N/A" }
      try {
        const apiUrl = `/api/mipres/direccionamiento/ips?search=${encodeURIComponent(row.NoIDProv)}`
        const response = await fetch(apiUrl)
        if (response.ok) {
          const data = await response.json()
          const allIps = Array.isArray(data) ? data : (data.value || [])
          const normalizedRowId = normalizeId(row.NoIDProv)
          const foundIps = allIps.find((item: any) => String(item.nit) === String(row.NoIDProv) || normalizeId(item.nit) === normalizedRowId)
          // Nombre de la IPS (razón social), no el de la sede: "ips" es el campo que trae el nombre
          // legal de la IPS; "ips_nombre" es el nombre de la sede puntual devuelta por la búsqueda.
          if (foundIps) ipsData = { nombre: foundIps.ips || foundIps.razon_social || foundIps.nombre || foundIps.ips_nombre || "N/A", direccion: foundIps.direccion_sede || foundIps.direccion || "N/A", telefono: foundIps.telefono || "N/A" }
        }
      } catch {}

      // Departamento/municipio de la sede a partir del código DANE (mismo catálogo público que usa prescripcion_pdf.ts)
      let departamentoPrestador = "N/A"
      let municipioPrestadorNombre = row.CodMunEnt || "N/A"
      if (row.CodMunEnt) {
        try {
          const municipioResponse = await fetch(`https://www.datos.gov.co/resource/gdxc-w37w.json?cod_mpio=${encodeURIComponent(row.CodMunEnt)}`)
          if (municipioResponse.ok) {
            const municipioData = await municipioResponse.json()
            const match = Array.isArray(municipioData) ? municipioData[0] : null
            if (match) {
              departamentoPrestador = match.dpto || "N/A"
              municipioPrestadorNombre = match.nom_mpio || row.CodMunEnt || "N/A"
            }
          }
        } catch {}
      }

      const prestadorNombre = ipsData.nombre !== "N/A" ? ipsData.nombre : row.NomProv || row.NomPrestador || row.NombrePrestador || "N/A"
      const esTutela = Boolean(prescripcion?.NoTutela)
      let prescriptoraNombre = esTutela ? IPS_DUSAKAWI.nombreIPS : "N/A"
      if (prescripcion?.NroIDIPS) {
        try {
          const res = await fetch(`/api/mipres/direccionamiento/ips?search=${encodeURIComponent(prescripcion.NroIDIPS)}`)
          if (res.ok) {
            const data = await res.json()
            const arr = Array.isArray(data) ? data : (data.value || [])
            const match = arr.find((item: any) => String(item.nit) === String(prescripcion.NroIDIPS))
            if (match) prescriptoraNombre = match.ips_nombre || "N/A"
          }
        } catch {}
      }

      const totalEntregas = rows.filter(r => r.NoPrescripcion === row.NoPrescripcion && r.TipoTec === row.TipoTec && Number(r.ConTec) === Number(row.ConTec)).reduce((max, current) => Math.max(max, Number(current.NoEntrega) || 0), 0)

      const pdfData = {
        IDDireccionamiento: row.IDDireccionamiento || row.ID || "N/A",
        FecDireccionamiento: new Date().toLocaleDateString('es-CO'),
        FecMaxEnt: row.FecMaxEnt || "N/A",
        NitPrestador: row.NoIDProv || "N/A",
        NombrePrestador: prestadorNombre,
        DireccionPrestador: ipsData.direccion,
        MunicipioPrestador: municipioPrestadorNombre,
        DepartamentoPrestador: departamentoPrestador,
        CodigoPrestador: row.NoIDProv || "N/A",
        TelefonoPrestador: ipsData.telefono,
        NombrePaciente: prescripcion?.PNPaciente || "N/A",
        ApellidoPaciente: prescripcion?.PAPaciente || "",
        TipoDocPaciente: row.TipoIDPaciente || "N/A",
        NumDocPaciente: row.NoIDPaciente || "N/A",
        Regimen: prescripcion?.tipoRegimen || "Subsidiado",
        NivelSisben: "Población",
        DireccionPaciente: row.DirPaciente || "N/A",
        MunicipioPaciente: row.CodMunEnt || "N/A",
        TelefonoPaciente: prescripcion?.TelPaciente || "N/A",
        TipoTecnologia: getTipoTecLabel(row.TipoTec),
        CodigoServicio: row.CodSerTecAEntregar || "N/A",
        DescripcionServicio: getDescripcionServicio(row) || `${getTipoTecLabel(row.TipoTec)} - Código: ${row.CodSerTecAEntregar}`,
        Cantidad: row.CantTotAEntregar || "1",
        NumEntrega: String(row.NoEntrega),
        NumSubEntrega: String(row.NoSubEntrega),
        TotalEntregas: String(totalEntregas || 1),
        IPSPrescriptora: prescriptoraNombre,
        NoPrescripcion: row.NoPrescripcion || "N/A",
        RegimenPrescripcion: prescripcion?.tipoRegimen || "Subsidiado",
        Ambito: "Ambulatorio-No Priorizado",
        Profesional: prescripcion ? [prescripcion.PNProfS, prescripcion.SNProfS, prescripcion.PAProfS, prescripcion.SAProfS].filter(Boolean).join(" ") || "N/A" : "N/A",
        JustificacionNoPBS: getJustificacion(row) || "N/A",
      }

      const pdfBytes = await generateDireccionamientoPDF(pdfData)
      downloadPDF(pdfBytes, `Direccionamiento_${row.IDDireccionamiento || row.ID}_${Date.now()}.pdf`)
      toast.success("PDF generado correctamente")
    } catch {
      toast.error("Error al generar el PDF")
    } finally {
      setGeneratingPDF(false)
    }
  }

  useEffect(() => {
    if (!open || !prescripcion) return
    setRows([])
    setPage(1)
    setError(null)

    const tokenCandidates = [
      credentials.tokenAcceso,
      credentials.tokenAccesoSubsidiado,
      credentials.tokenAccesoContributivo,
    ].filter((token, index, arr) => !!token && arr.indexOf(token) === index) as string[]

    if (!credentials.nit || tokenCandidates.length === 0) {
      setError("Configure NIT y Token de acceso antes de consultar")
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const run = async () => {
      setLoading(true)
      try {
        let lastError = ""
        let hadSuccessWithoutData = false

        for (const tokenAcceso of tokenCandidates) {
          const queryParams = new URLSearchParams({ nit: credentials.nit, tokenAcceso, tipo: "prescripcion", noPrescripcion: numero || "" })
          const response = await fetch(`/api/mipres/direccionamiento?${queryParams.toString()}`, { signal })
          const result = await response.json()

          if (result.success) {
            const filtered = normalizeDireccionamientos(result.data)
            filtered.sort((a, b) => {
              const aAnulada = Boolean(String(a.FecAnulacion ?? "").trim())
              const bAnulada = Boolean(String(b.FecAnulacion ?? "").trim())
              if (aAnulada !== bAnulada) return aAnulada ? 1 : -1
              const conA = Number(a.ConTec) || 0
              const conB = Number(b.ConTec) || 0
              if (conA !== conB) return conA - conB
              return (Number(a.NoEntrega) || 0) - (Number(b.NoEntrega) || 0)
            })
            if (filtered.length > 0) { setRows(filtered); return }
            hadSuccessWithoutData = true
            continue
          }
          lastError = result.error || "Error al consultar direccionamiento"
        }

        if (hadSuccessWithoutData) { setRows([]); return }
        setError(lastError || "Error al consultar direccionamiento")
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setError("Error de conexion con el servidor")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    run()
    return () => { controller.abort() }
  }, [open, prescripcion, credentials, numero])

  const handleAnular = async (row: DireccionamientoLecturaRow) => {
    const idDir = row.IDDireccionamiento || row.ID || ""
    if (!idDir) return
    if (!credentials.nit) { toast.error("NIT no configurado"); return }

    const regimen = prescripcion?.tipoRegimen
    const token = regimen === "Subsidiado"
      ? credentials.tokenAccesoSubsidiado
      : regimen === "Contributivo"
      ? credentials.tokenAccesoContributivo
      : credentials.tokenAcceso

    if (!token) { toast.error(`Token ${regimen || "Principal"} no configurado`); return }

    setAnulandoId(idDir)
    try {
      const response = await fetch("/api/mipres/direccionamiento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nit: credentials.nit, tokenAcceso: token, idDireccionamiento: idDir }),
      })
      const result = await response.json()
      if (response.ok && result.success) {
        toast.success(`Direccionamiento ${idDir} anulado`)
        setAnuladosIds(prev => new Set(prev).add(idDir))
        setRows(prev => prev.map(r =>
          (r.IDDireccionamiento === idDir || r.ID === idDir)
            ? { ...r, FecAnulacion: new Date().toISOString() }
            : r
        ))
      } else {
        let errorMsg = result.error || "Error al anular"
        if (result.details?.Errors && Array.isArray(result.details.Errors)) { errorMsg = result.details.Errors[0] }
        else if (result.Errors && Array.isArray(result.Errors)) { errorMsg = result.Errors[0] }
        toast.error(errorMsg)
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setAnulandoId(null)
    }
  }

  if (!prescripcion || !open) return null

  return (
    <div className="flex gap-6 items-start">

      {/* ── Columna izquierda ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-none">Ver direccionamiento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tipoDocumento === "tutela" ? "Tutela" : "Prescripción"} <span className="font-mono">{numero}</span>
            </p>
          </div>
        </div>

        {/* Paciente */}
        <div className="p-4 rounded-lg bg-muted/50 border flex items-center gap-4">
          <div className="p-2 rounded-md bg-primary/5 text-primary flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Paciente</p>
            <p className="font-medium text-base">{pacienteDisplay}</p>
            {prescripcion?.EDad && <p className="text-xs text-muted-foreground mt-1">Edad: {prescripcion.EDad}</p>}
          </div>
        </div>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {loading && <Alert><AlertDescription>Cargando direccionamiento...</AlertDescription></Alert>}
        {!loading && !error && rows.length === 0 && <Alert><AlertDescription>No hay direccionamientos registrados.</AlertDescription></Alert>}

        {!loading && rows.length > 0 && (
          <div className="space-y-4">
            {rows.slice(page - 1, page).map((row, idx) => {
              const absoluteIndex = page - 1 + idx
              return (
                <div key={row.id || `${row.NoPrescripcion}-${absoluteIndex}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {rows.length > 1 && <p className="text-xs text-muted-foreground">{page} / {rows.length}</p>}
                      {row.FecAnulacion && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-destructive text-destructive-foreground">ANULADO</span>
                      )}
                    </div>
                    <button
                      type="button"
                      title={direccionamientoComplete ? "Direccionamiento completo" : "Incompleto - Clic para direccionar faltante"}
                      onClick={() => {
                        if (direccionamientoComplete) {
                          toast.success("Este direccionamiento está completo")
                        } else {
                          const firstMissing = validationState.firstMissingKey
                          let effectiveTipoTec = String(row.TipoTec ?? "")
                          let effectiveConTec = Number(row.ConTec)
                          if (firstMissing) { const [t, c] = firstMissing.split(":"); effectiveTipoTec = t; effectiveConTec = Number(c) }
                          const prescItem = getPrescItemByTipoConTec(effectiveTipoTec, effectiveConTec)
                          const { seedBase, sameTecSeed } = getSeedDeliveryForFocus(effectiveTipoTec, effectiveConTec)
                          if (onRequestDireccionar) {
                            onRequestDireccionar(prescripcion, {
                              tipoTec: effectiveTipoTec,
                              conTec: effectiveConTec,
                              prescItem,
                              seedFromDelivery: seedBase ? { NoIDProv: seedBase.NoIDProv, CodMunEnt: seedBase.CodMunEnt, CodSerTecAEntregar: sameTecSeed?.CodSerTecAEntregar || "", DirPaciente: seedBase.DirPaciente || row.DirPaciente || "", TipoIDProv: seedBase.TipoIDProv, CantTotAEntregar: sameTecSeed?.CantTotAEntregar || "" } : undefined,
                            })
                          } else {
                            toast("Direccionamiento incompleto. Abra el modal de direccionamiento para completar.")
                          }
                        }
                      }}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-full border ${direccionamientoComplete ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}`}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {row.ID && <div><Label>ID</Label><Input value={row.ID} readOnly className="mt-1 bg-muted" /></div>}
                      {row.IDDireccionamiento && <div><Label>ID Direccionamiento</Label><Input value={row.IDDireccionamiento} readOnly className="mt-1 bg-muted" /></div>}
                      <div><Label>Número de Prescripción</Label><Input value={row.NoPrescripcion} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Tipo de Servicio o Tecnología</Label><Input value={row.TipoTec} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Consecutivo del Servicio o Tecnología</Label><Input value={row.ConTec} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Número de Entrega</Label><Input value={row.NoEntrega} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Número de Subentrega</Label><Input value={row.NoSubEntrega} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Tipo de Documento del Paciente</Label><Input value={row.TipoIDPaciente} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Número de Documento del Paciente</Label><Input value={row.NoIDPaciente} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Tipo de Documento del Proveedor</Label><Input value={row.TipoIDProv} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Número de Documento del Proveedor</Label><Input value={row.NoIDProv} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Lugar de Entrega</Label><Input value={row.CodMunEnt} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Fecha Máxima de Entrega</Label><Input value={row.FecMaxEnt} readOnly className="mt-1 bg-muted" /></div>
                      {row.FecAnulacion && (
                        <div className="col-span-1 sm:col-span-2">
                          <Label className="text-destructive">Fecha de Anulación</Label>
                          <Input value={row.FecAnulacion} readOnly className="mt-1 bg-destructive/10 text-destructive border-destructive/20 font-medium" />
                        </div>
                      )}
                      <div><Label>Cantidad Total a Entregar</Label><Input value={row.CantTotAEntregar} readOnly className="mt-1 bg-muted" /></div>
                      <div><Label>Código del Servicio o Tecnología</Label><Input value={row.CodSerTecAEntregar} readOnly className="mt-1 bg-muted" /></div>
                    </div>
                    <div className="mt-4"><Label>Dirección del Paciente</Label><Textarea value={row.DirPaciente} readOnly className="mt-1 bg-muted" rows={3} /></div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button onClick={() => handlePrintPDF(row)} disabled={generatingPDF} className="gap-2">
                        <Printer className="h-4 w-4" />
                        {generatingPDF ? "Generando PDF..." : "Imprimir Formato"}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {rows.length > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</Button>
                <p className="text-xs text-muted-foreground">{page} / {rows.length}</p>
                <Button variant="outline" onClick={() => setPage(p => Math.min(rows.length, p + 1))} disabled={page >= rows.length}>Siguiente</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Columna derecha: Anular ── */}
      {(() => {
        const vigentItems = rows.filter(r =>
          !String(r.FecAnulacion ?? "").trim() &&
          !anuladosIds.has(r.IDDireccionamiento || r.ID || "")
        )
        const anularTotal = Math.max(1, Math.ceil(vigentItems.length / ANULAR_PAGE_SIZE))
        const anularSafe = Math.min(anularPage, anularTotal)
        const anularItems = vigentItems.slice((anularSafe - 1) * ANULAR_PAGE_SIZE, anularSafe * ANULAR_PAGE_SIZE)

        return (
          <div className="w-80 shrink-0 border rounded-lg overflow-hidden self-start sticky top-4">
            <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-2.5">
              <Trash2 className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium">Anular Direccionamientos</span>
            </div>

            <div className="p-4 space-y-3">
              {vigentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="bg-muted p-3 rounded-full mb-3">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No hay direccionamientos vigentes para anular.</p>
                </div>
              ) : (
                <>
                  <Alert variant="destructive" className="mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Precaución</AlertTitle>
                    <AlertDescription>La anulación es irreversible. Verifique el ID antes de proceder.</AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    {anularItems.map((row) => {
                      const idDir = row.IDDireccionamiento || row.ID || ""
                      return (
                        <div key={idDir} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                          <div className="space-y-1 min-w-0 mr-2">
                            <span className="font-mono text-xs font-bold block truncate">{idDir}</span>
                            <div className="text-xs text-muted-foreground">
                              {`${String(row.TipoTec || "").toUpperCase()}${row.ConTec ?? ""}`} · Entrega {row.NoEntrega}
                              {row.CantTotAEntregar && ` (${row.CantTotAEntregar} unds)`}
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1 shrink-0"
                            onClick={() => handleAnular(row)}
                            disabled={anulandoId === idDir}
                          >
                            {anulandoId === idDir ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Anular
                          </Button>
                        </div>
                      )
                    })}
                  </div>

                  {anularTotal > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {vigentItems.length} items · {anularSafe}/{anularTotal}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline" size="icon" className="h-6 w-6"
                          disabled={anularSafe <= 1}
                          onClick={() => setAnularPage(anularSafe - 1)}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline" size="icon" className="h-6 w-6"
                          disabled={anularSafe >= anularTotal}
                          onClick={() => setAnularPage(anularSafe + 1)}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })()}

    </div>
  )
}
