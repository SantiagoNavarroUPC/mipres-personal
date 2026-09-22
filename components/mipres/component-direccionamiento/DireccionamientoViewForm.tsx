"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle, ArrowLeft, NotebookPen, Send,
  ClipboardList, User, BadgeCheck, MapPin, Building2, Home,
  FileText, Pill, Stethoscope, Package, Activity, Sparkles,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import type { MipresCredentials } from "@/models/credentials.model"
import type { NoDireccionamientoPayload } from "@/models/mipres-sispro/no_direccionamiento/no_direccionamiento"
import { AMBITOS_ATENCION } from "@/models/mipres-sispro/prescripcion"
import { CAUSAS_NO_ENTREGAS } from "@/models/constants"
import { reportErrorNotification } from "@/lib/error-notifications"
import { useDireccionamientoForm } from "./hooks/useDireccionamientoForm"
import { useIps } from "./hooks/useIps"
import { useMunicipios } from "./hooks/useMunicipios"
import { useMedicamentos } from "./hooks/useMedicamentos"
import { useProductosNutricionales } from "./hooks/useProductosNutricionales"
import { useServiciosComplementarios } from "./hooks/useServiciosComplementarios"
import { DireccionamientoFormContent } from "./components/DireccionamientoFormContent"
import type { DireccionamientoRow } from "./types"
import { MedicamentosDetails } from "../component-prescripcion/MedicamentosDetails"
import { ProcedimientosDetails } from "../component-prescripcion/ProcedimientosDetails"
import { DispositivosDetails } from "../component-prescripcion/DispositivosDetails"
import { ProductosNutricionalesDetails } from "../component-prescripcion/ProductosNutricionalesDetails"
import { ServiciosComplementariosDetails } from "../component-prescripcion/ServiciosComplementariosDetails"
import { getArray } from "../component-prescripcion/utils"
import { toast } from "sonner"

interface AccionesModalProps {
  prescripcion: any
  open: boolean
  onClose: () => void
  credentials: MipresCredentials
  onSuccess?: () => void
  onFormVisibilityChange?: (visible: boolean) => void
  tipo?: "prescripcion" | "tutela"
  initialFocus?: {
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
  }
}

type NoDireccionamientoRow = {
  id: string
  label: string
  payload: NoDireccionamientoPayload
  observacion: string
  selected: boolean
}

function getPacienteNombre(p: any): string {
  const nombres = [p?.PNPaciente, p?.SNPaciente].filter(Boolean).join(" ")
  const apellidos = [p?.PAPaciente, p?.SAPaciente].filter(Boolean).join(" ")
  return `${nombres} ${apellidos}`.trim() || "Paciente"
}

function PanelPager({ items, render }: { items: any[]; render: (item: any, idx: number) => React.ReactNode }) {
  const [page, setPage] = useState(0)
  const total = items.length
  if (!total) return null
  const cur = Math.min(page, total - 1)
  return (
    <div>
      {render(items[cur], cur)}
      {total > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t">
          <button
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={cur === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">{cur + 1} / {total}</span>
          <button
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={cur >= total - 1}
            onClick={() => setPage(p => Math.min(total - 1, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export function AccionesModal({ prescripcion, open, onClose, credentials, onSuccess, onFormVisibilityChange, tipo, initialFocus }: AccionesModalProps) {
  const tipoDocumento = tipo || (prescripcion?.NoTutela ? "tutela" : "prescripcion")
  const numero = tipoDocumento === "tutela" ? prescripcion?.NoTutela : prescripcion?.NoPrescripcion

  const [accion, setAccion] = useState<'direccionar' | 'nodireccionar' | null>(null)
  const initialFocusAppliedRef = useRef<string | null>(null)

  const {
    showForm,
    setShowForm,
    submitting,
    formError,
    formSuccess,
    rows,
    setRows,
    page,
    setPage,
    registeredIds,
    handleSubmit,
    updateDeliveryCount,
  } = useDireccionamientoForm(prescripcion, open, credentials, onSuccess, tipoDocumento)

  // NoDireccionar inline state
  const [noDirSubmitting, setNoDirSubmitting] = useState(false)
  const [noDirFormError, setNoDirFormError] = useState<string | null>(null)
  const [noDirFormSuccess, setNoDirFormSuccess] = useState<string | null>(null)
  const [noDirRows, setNoDirRows] = useState<NoDireccionamientoRow[]>([])
  const [noDirPage, setNoDirPage] = useState(1)
  const [noDirPrescripcionAsociada, setNoDirPrescripcionAsociada] = useState<string[]>([])
  const [noDirConTecAsociada, setNoDirConTecAsociada] = useState<number[]>([])

  const [checkingAntecedentes, setCheckingAntecedentes] = useState(false)
  const [portabilidadInfo, setPortabilidadInfo] = useState<any | null>(null)
  const [infoTab, setInfoTab] = useState<'prescripcion' | 'prescriptor' | 'afiliado'>('afiliado')
  const [datosAfiliado, setDatosAfiliado] = useState<{
    ips_primaria?: string
    grupo_poblacional?: string
    etnia_comunidad?: string
    discapacidad?: string
    indigena_asentamiento?: string
  } | null>(null)

  // Reset on close
  useEffect(() => {
    if (!open) {
      setAccion(null)
      initialFocusAppliedRef.current = null
      setNoDirRows([])
      setNoDirPage(1)
      setNoDirFormError(null)
      setNoDirFormSuccess(null)
      setDatosAfiliado(null)
    }
  }, [open])

  // Fetch datos del afiliado al abrir
  useEffect(() => {
    if (!open || !prescripcion) return
    const numeroId = prescripcion.NroIDPaciente || prescripcion.NoIDPaciente || prescripcion.NumIDPaciente
    if (!numeroId) return

    fetch("/api/afiliado/datos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero_identificacion: String(numeroId) }),
    })
      .then((r) => r.json())
      .then((data) => setDatosAfiliado(data))
      .catch(() => {})
  }, [open, prescripcion])

  // Auto-open direccionar form when initialFocus is provided
  useEffect(() => {
    if (!open) return
    setAccion('direccionar')
    if (initialFocus) {
      setShowForm(true)
    } else {
      handleDireccionar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Notify parent immediately when open changes (hides table as soon as modal opens)
  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  // Initialize NoDireccionar rows when that action is selected
  useEffect(() => {
    if (accion !== 'nodireccionar' || !prescripcion) return

    setNoDirFormError(null)
    setNoDirFormSuccess(null)
    setNoDirPage(1)

    const noPrescripcion = prescripcion.NoPrescripcion || prescripcion.NoTutela || ""
    const tipoIdPaciente = prescripcion.TipoIDPaciente || prescripcion.TipoIDPac || ""
    const noIdPaciente = prescripcion.NoIDPaciente || prescripcion.NroIDPaciente || ""

    const nextRows: NoDireccionamientoRow[] = []

    const pushRows = (
      items: any[],
      tipoTec: string,
      conTecResolver: (item: any, index: number) => number,
      labelResolver: (item: any, index: number) => string
    ) => {
      items.forEach((item, index) => {
        const conTec = conTecResolver(item, index)
        nextRows.push({
          id: `${tipoTec}-${conTec}-${index}`,
          label: labelResolver(item, index),
          observacion: "",
          selected: true,
          payload: {
            NoPrescripcion: String(noPrescripcion),
            TipoTec: tipoTec,
            ConTec: Number(conTec),
            TipoIDPaciente: String(tipoIdPaciente),
            NoIDPaciente: String(noIdPaciente),
            NoPrescripcionAsociada: null,
            ConTecAsociada: 0,
            CausaNoEntrega: 17,
          },
        })
      })
    }

    pushRows(
      getArray(prescripcion, "medicamentos"),
      "M",
      (item, index) => Number(item.ConOrden || index + 1),
      (item, index) => `Medicamento ${index + 1} ${item.DescMedPrinAct || item.DscMedPA || ""}`.trim()
    )
    pushRows(
      getArray(prescripcion, "procedimientos"),
      "P",
      (item, index) => Number(item.ConOrdenPro || item.ConOrden || index + 1),
      (item) => `Procedimiento ${item.CodCUPS || ""} ${item.DescPro || item.NomProc || ""}`.trim()
    )
    pushRows(
      getArray(prescripcion, "dispositivos"),
      "D",
      (item, index) => Number(item.ConOrdenDM || item.ConOrden || index + 1),
      (item) => `Dispositivo ${item.DescDM || item.CodDisp || ""}`.trim()
    )
    pushRows(
      getArray(prescripcion, "productosNutricionales"),
      "N",
      (item, index) => Number(item.ConOrdenPN || item.ConOrden || index + 1),
      (item) => `Producto Nutricional ${item.DescProdNutr || item.DescPN || ""}`.trim()
    )
    pushRows(
      getArray(prescripcion, "serviciosComplementarios"),
      "S",
      (item, index) => Number(item.ConOrdenSC || item.ConOrden || index + 1),
      (item) => `Servicio Complementario ${item.DescSerComp || ""}`.trim()
    )

    setNoDirRows(nextRows)
    setNoDirPrescripcionAsociada(nextRows.map(() => ""))
    setNoDirConTecAsociada(nextRows.map(() => 0))
  }, [accion, prescripcion])

  // Apply initialFocus row targeting
  useEffect(() => {
    if (!open) {
      initialFocusAppliedRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!initialFocus || !rows || rows.length === 0) return
    const { tipoTec, conTec, seedFromDelivery } = initialFocus
    if (!tipoTec || conTec == null) return
    const focusTipo = String(tipoTec).trim().toUpperCase()
    const focusCon = Number(conTec)
    const focusKey = `${focusTipo}:${focusCon}`
    if (initialFocusAppliedRef.current === focusKey) return
    initialFocusAppliedRef.current = focusKey
    const isMatch = (r: DireccionamientoRow) =>
      String(r.TipoTec ?? "").trim().toUpperCase() === focusTipo && Number(r.ConTec) === focusCon

    const idx = rows.findIndex(isMatch)
    if (idx === -1) {
      const baseRow = rows[0]
      if (!baseRow) return
      const nextEntrega = 1
      const placeholder: DireccionamientoRow = {
        ...baseRow,
        id: `manual-${focusTipo}-${focusCon}-${Date.now()}`,
        allowManualTipo: true,
        TipoTec: focusTipo,
        ConTec: "",
        label: typeof initialFocus.prescItem === "object"
          ? String(
              initialFocus.prescItem?.DescMedPrinAct ||
              initialFocus.prescItem?.DescPro ||
              initialFocus.prescItem?.DescProdNutr ||
              initialFocus.prescItem?.DescSerComp ||
              initialFocus.prescItem?.DescDM ||
              ""
            )
          : "",
        CodSerTecFixed: false,
        codigoMipres: "",
        NoEntrega: String(nextEntrega),
        NoSubEntrega: "0",
        FecMaxEnt: "",
        isUnique: false,
        intervalValue: null,
        intervalUnit: null,
        deliveryIndex: 1,
        deliveryCount: 1,
        NoIDProv: seedFromDelivery?.NoIDProv || baseRow.NoIDProv || "",
        CodMunEnt: seedFromDelivery?.CodMunEnt || baseRow.CodMunEnt || "",
        CodSerTecAEntregar: seedFromDelivery?.CodSerTecAEntregar || "",
        DirPaciente: seedFromDelivery?.DirPaciente || baseRow.DirPaciente || "",
        TipoIDProv: seedFromDelivery?.TipoIDProv || baseRow.TipoIDProv || "NI",
        CantTotAEntregar: seedFromDelivery?.CantTotAEntregar || "",
      }
      setRows(() => [placeholder])
      setPage(1)
      return
    }

    setPage(1)
    setRows((prev) => {
      const focusedRows = prev.filter(isMatch)
      if (focusedRows.length === 0) return prev
      return focusedRows.map((r) => ({
        ...r,
        allowManualTipo: true,
        CodSerTecFixed: false,
        ConTec: seedFromDelivery ? "" : r.ConTec,
        NoIDProv: seedFromDelivery?.NoIDProv || r.NoIDProv || "",
        CodMunEnt: seedFromDelivery?.CodMunEnt || r.CodMunEnt || "",
        CodSerTecAEntregar: seedFromDelivery?.CodSerTecAEntregar || r.CodSerTecAEntregar || "",
        DirPaciente: seedFromDelivery?.DirPaciente || r.DirPaciente || "",
        TipoIDProv: seedFromDelivery?.TipoIDProv || r.TipoIDProv || "NI",
        CantTotAEntregar: seedFromDelivery?.CantTotAEntregar || r.CantTotAEntregar || "",
      }))
    })
  }, [initialFocus, rows, setPage])

  const {
    municipios,
    municipiosLoading,
    municipiosError,
    municipioQuery,
    setMunicipioQuery,
    municipioByCode,
    filteredMunicipios,
  } = useMunicipios(open && showForm)

  const {
    ipsLoading,
    ipsError,
    ipsQuery,
    setIpsQuery,
    ipsSearch,
    setIpsSearch,
    filteredIps,
  } = useIps(open && showForm)

  const {
    medicamentosLoading,
    medicamentosError,
    medicamentoQuery,
    setMedicamentoQuery,
    medicamentoSearch,
    setMedicamentoSearch,
    filteredMedicamentos,
  } = useMedicamentos(open && showForm)

  const codigosMipres = useMemo(() => {
    return Array.from(new Set(rows
      .filter(row => row.TipoTec === "N" && row.codigoMipres)
      .map(row => row.codigoMipres!)))
  }, [rows])

  const codigosServicios = useMemo(() => {
    return Array.from(new Set(rows
      .filter(row => row.TipoTec === "S" && row.CodSerTecAEntregar)
      .map(row => row.CodSerTecAEntregar)))
  }, [rows])

  const { productos, getDescripcionPreferida } = useProductosNutricionales(
    codigosMipres,
    open && showForm && codigosMipres.length > 0
  )

  const { servicios, getDescripcion: getDescripcionServicio } = useServiciosComplementarios(
    codigosServicios,
    open && showForm && codigosServicios.length > 0
  )

  useEffect(() => {
    if (productos.size === 0 && servicios.size === 0) return
    setRows(prevRows => {
      let hasChanges = false
      const updatedRows = prevRows.map(row => {
        if (row.TipoTec === "N" && row.codigoMipres) {
          const desc = getDescripcionPreferida(row.codigoMipres)
          if (desc) {
            const base = `Producto Nutricional: ${desc}`
            const newLabel = row.deliveryCount > 1 ? `${base} - Entrega ${row.deliveryIndex} de ${row.deliveryCount}` : base
            if (row.label !== newLabel) { hasChanges = true; return { ...row, label: newLabel } }
          }
        }
        if (row.TipoTec === "S" && row.CodSerTecAEntregar) {
          const desc = getDescripcionServicio(row.CodSerTecAEntregar)
          if (desc) {
            const base = `Servicio Complementario: ${desc}`
            const newLabel = row.deliveryCount > 1 ? `${base} - Entrega ${row.deliveryIndex} de ${row.deliveryCount}` : base
            if (row.label !== newLabel) { hasChanges = true; return { ...row, label: newLabel } }
          }
        }
        return row
      })
      return hasChanges ? updatedRows : prevRows
    })
  }, [productos, servicios, getDescripcionPreferida, getDescripcionServicio, setRows])

  const municipioNombre = useMemo(() => {
    if (!prescripcion?.CodDANEMunIPS) return null
    return municipioByCode.get(String(prescripcion.CodDANEMunIPS)) || null
  }, [municipioByCode, prescripcion?.CodDANEMunIPS])


  const handleDireccionar = async () => {
    setPortabilidadInfo(null)
    setCheckingAntecedentes(true)
    try {
      const numero_documento = String(
        prescripcion?.NroIDPaciente || prescripcion?.NoIDPaciente || prescripcion?.NumIDPaciente || ""
      ).trim()

      if (!numero_documento) {
        setShowForm(true)
        setCheckingAntecedentes(false)
        return
      }

      const portabilidadData = await fetch(`/api/afiliado/portabilidad-paciente?idAfiliado=${numero_documento}`)
        .then(res => res.ok ? res.json() : null).catch(() => null)

      if (portabilidadData?.portabilidades && Array.isArray(portabilidadData.portabilidades)) {
        const primera = portabilidadData.portabilidades[0]
        if (primera) setPortabilidadInfo(primera)
      }

      setShowForm(true)
    } catch {
      setShowForm(true)
    } finally {
      setCheckingAntecedentes(false)
    }
  }

  const handleRowChange = (index: number, updatedRow: DireccionamientoRow) => {
    const next = [...rows]
    next[index] = updatedRow
    setRows(next)
  }

  const handleMunicipioSelect = () => { setMunicipioQuery("") }
  const handleMedicamentoSelect = () => { setMedicamentoQuery(""); setMedicamentoSearch("") }
  const handleMedicamentoSearch = (query: string) => { setMedicamentoSearch(query) }

  const handleIpsSelect = (nit: string, ipsProveedor: any) => {
    setIpsQuery("")
    setIpsSearch("")
    if (nit && ipsProveedor) {
      setRows((prevRows) => {
        const updated = [...prevRows]
        for (let i = 0; i < updated.length; i++) {
          if (!updated[i].NoIDProv || updated[i].NoIDProv === "") {
            updated[i] = {
              ...updated[i],
              NoIDProv: nit,
              NomProv: ipsProveedor.ips_nombre || ipsProveedor.razon_social || "",
              CodMunEnt: ipsProveedor.municipio_codigo || updated[i].CodMunEnt || "",
            }
            break
          }
        }
        return updated
      })
    }
  }

  const handleIpsSearch = (query: string) => { setIpsSearch(query) }

  // NoDireccionar handlers
  const handleNoDirObservacionChange = (index: number, observacion: string) => {
    setNoDirRows(prev => { const next = [...prev]; next[index] = { ...next[index], observacion }; return next })
  }

  const handleNoDirPrescripcionAsociadaChange = (index: number, value: string) => {
    setNoDirPrescripcionAsociada(prev => { const next = [...prev]; next[index] = value; return next })
    setNoDirRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], payload: { ...next[index].payload, NoPrescripcionAsociada: value || null } }
      return next
    })
  }

  const handleNoDirConTecAsociadaChange = (index: number, value: string) => {
    const num = Number(value)
    setNoDirConTecAsociada(prev => { const next = [...prev]; next[index] = isNaN(num) ? 0 : num; return next })
    setNoDirRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], payload: { ...next[index].payload, ConTecAsociada: isNaN(num) ? 0 : num } }
      return next
    })
  }

  const handleNoDirCausalChange = (index: number, causal: string) => {
    const parsed = Number(causal)
    if (Number.isNaN(parsed)) return
    setNoDirRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], payload: { ...next[index].payload, CausaNoEntrega: parsed } }
      return next
    })
  }

  const toggleNoDirSelection = (index: number) => {
    setNoDirRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], selected: !next[index].selected }
      return next
    })
  }

  const handleNoDirSubmit = async () => {
    const noDirCurrentRow = noDirRows[noDirPage - 1]
    const currentNoDirPA = noDirPrescripcionAsociada[noDirPage - 1] || ""
    const noDirRequierePA = String(noDirCurrentRow?.payload?.CausaNoEntrega) === "1"

    for (const [idx, row] of noDirRows.entries()) {
      if (row.selected && String(row.payload.CausaNoEntrega) === "1") {
        if (!noDirPrescripcionAsociada[idx]?.trim()) {
          setNoDirFormError("Debe ingresar la prescripción asociada para la causal 1.")
          return
        }
        if (isNaN(noDirConTecAsociada[idx]) || noDirConTecAsociada[idx] < 0) {
          setNoDirFormError("Debe ingresar un ConTec asociado válido para la causal 1.")
          return
        }
      }
    }

    const selectedRows = noDirRows.filter(r => r.selected)
    if (selectedRows.length === 0) {
      setNoDirFormError("Debe seleccionar al menos una tecnología para registrar no direccionamiento")
      return
    }

    const regimen = prescripcion?.tipoRegimen?.toLowerCase()
    let accessToken = ""
    if (regimen === "subsidiado") {
      accessToken = credentials.tokenAccesoSubsidiado || ""
      if (!accessToken) { setNoDirFormError("Token Subsidiado no configurado."); return }
    } else if (regimen === "contributivo") {
      accessToken = credentials.tokenAccesoContributivo || ""
      if (!accessToken) { setNoDirFormError("Token Contributivo no configurado."); return }
    } else {
      setNoDirFormError(`Régimen no especificado (valor: "${prescripcion?.tipoRegimen}").`)
      return
    }

    if (!credentials.nit) { setNoDirFormError("Configure el NIT en Configuración antes de continuar."); return }

    setNoDirSubmitting(true)
    setNoDirFormError(null)
    setNoDirFormSuccess(null)

    try {
      const errors: string[] = []
      let successCount = 0

      for (const row of selectedRows) {
        const response = await fetch("/api/mipres/no-direccionamiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nit: credentials.nit, tokenAcceso: accessToken, tipo: "registrar", body: row.payload }),
        })
        const result = await response.json()
        if (!result.success) {
          const registrarError = result.error || `Error al registrar ${row.label}`
          errors.push(registrarError)
          reportErrorNotification("No direccionamiento (SISPRO)", `${row.label}: ${registrarError}`)
          continue
        }

        successCount += 1
      }

      if (successCount === 0) {
        const msg = errors.slice(0, 3).join("\n") || "No se registraron tecnologías"
        setNoDirFormError(msg)
        toast.error(msg)
        return
      }

      if (errors.length > 0) {
        setNoDirFormSuccess(`Registrado para ${successCount} tecnología(s).`)
        setNoDirFormError(`Algunas tecnologías no se registraron:\n${errors.slice(0, 3).join("\n")}`)
        toast.warning(`Registro parcial: ${successCount} registradas, ${errors.length} con error`)
      } else {
        setNoDirFormSuccess(`No direccionamiento registrado exitosamente para ${successCount} tecnología(s)`)
        toast.success("No direccionamiento registrado")
      }

      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("no-direccionamiento:refresh"))
      onSuccess?.()
    } catch {
      setNoDirFormError("Error de conexión con el servidor")
      toast.error("Error de conexión con el servidor")
    } finally {
      setNoDirSubmitting(false)
    }
  }

  if (!prescripcion || !open) return null

  const medCount = getArray(prescripcion, "medicamentos").length
  const procCount = getArray(prescripcion, "procedimientos").length
  const dispCount = getArray(prescripcion, "dispositivos").length
  const nutrCount = getArray(prescripcion, "productosNutricionales").length
  const servCount = getArray(prescripcion, "serviciosComplementarios").length

  const noDirCurrentRow = noDirRows[noDirPage - 1]
  const currentNoDirPA = noDirPrescripcionAsociada[noDirPage - 1] || ""
  const currentNoDirConTec = noDirConTecAsociada[noDirPage - 1] || 0
  const noDirRequierePA = String(noDirCurrentRow?.payload?.CausaNoEntrega) === "1"

  return (
    <>
      <div className="flex gap-6 items-start">

        {/* ── Columna izquierda ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b">
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <NotebookPen className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-none">Formulario de direccionamiento</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tipoDocumento === "tutela" ? "Tutela" : "Prescripción"}{" "}
                <span className="font-mono">{numero}</span>
              </p>
            </div>
          </div>

          {/* Paciente */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-1">Paciente</p>
            <p className="font-medium">{getPacienteNombre(prescripcion)}</p>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => { setAccion('direccionar'); handleDireccionar() }}
              disabled={checkingAntecedentes}
              variant={accion === 'direccionar' ? 'default' : 'outline'}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {checkingAntecedentes ? "Verificando..." : `Direccionar ${tipoDocumento === "tutela" ? "tutela" : "prescripción"}`}
            </Button>
            <Button
              onClick={() => setAccion('nodireccionar')}
              variant={accion === 'nodireccionar' ? 'destructive' : 'outline'}
              className={`w-full gap-2 ${accion !== 'nodireccionar' ? 'border-red-200 text-red-700 hover:bg-red-50 hover:text-red-900 dark:border-zinc-700 dark:text-red-400' : ''}`}
            >
              <Send className="h-4 w-4" />
              No direccionar
            </Button>
          </div>

          {/* ── Formulario de Direccionamiento ── */}
          {accion === 'direccionar' && showForm && (
            <div className="space-y-4">
              {portabilidadInfo && (
                <div className="p-3 rounded border border-yellow-300 bg-yellow-100 text-sm flex items-start gap-2 dark:border-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-100">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600 shrink-0 dark:text-yellow-400" />
                  <span>
                    <strong className="font-medium">Portabilidad:</strong> El paciente {portabilidadInfo.numero_identificacion} del municipio {portabilidadInfo.municipio} tiene portabilidad a municipio receptor {portabilidadInfo.municipio_receptor}
                  </span>
                </div>
              )}

              <DireccionamientoFormContent
                rows={rows}
                page={page}
                submitting={submitting}
                formError={formError}
                formSuccess={formSuccess}
                municipioByCode={municipioByCode}
                filteredMedicamentos={filteredMedicamentos}
                medicamentoQuery={medicamentoQuery}
                medicamentoSearch={medicamentoSearch}
                medicamentosLoading={medicamentosLoading}
                medicamentosError={medicamentosError}
                filteredMunicipios={filteredMunicipios}
                municipioQuery={municipioQuery}
                municipiosLoading={municipiosLoading}
                municipiosError={municipiosError}
                filteredIps={filteredIps}
                ipsQuery={ipsQuery}
                ipsSearch={ipsSearch}
                ipsLoading={ipsLoading}
                ipsError={ipsError}
                onRowChange={handleRowChange}
                onRowsChange={setRows}
                onPageChange={setPage}
                onAddressChange={() => {}}
                onMedicamentoSelect={handleMedicamentoSelect}
                onMedicamentoQueryChange={setMedicamentoQuery}
                onMedicamentoSearch={handleMedicamentoSearch}
                onMunicipioSelect={handleMunicipioSelect}
                onQueryChange={setMunicipioQuery}
                onIpsSelect={handleIpsSelect}
                onIpsQueryChange={setIpsQuery}
                onIpsSearch={handleIpsSearch}
                onSubmit={handleSubmit}
                onCancel={onClose}
                onUpdateDeliveries={updateDeliveryCount}
              />
            </div>
          )}

          {/* Spinner mientras verifica antecedentes */}
          {accion === 'direccionar' && !showForm && checkingAntecedentes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Verificando antecedentes del paciente...
            </div>
          )}

          {/* ── Formulario de No Direccionamiento ── */}
          {accion === 'nodireccionar' && (
            <div className="space-y-4">
              {(noDirFormError || noDirFormSuccess) && (
                <Alert
                  variant={noDirFormError && !noDirFormSuccess ? "destructive" : "default"}
                  className={noDirFormSuccess ? "border-green-500 bg-green-50 text-green-700 dark:border-green-700 dark:bg-zinc-900 dark:text-green-300" : ""}
                >
                  <AlertDescription>{noDirFormError || noDirFormSuccess}</AlertDescription>
                </Alert>
              )}

              {noDirRows.length === 0 ? (
                <Alert className="border-red-300 bg-red-100 dark:border-zinc-700 dark:bg-zinc-900">
                  <AlertDescription>No hay tecnologías asociadas para no direccionar.</AlertDescription>
                </Alert>
              ) : noDirCurrentRow ? (
                <div className="space-y-5 rounded-md border border-red-200 bg-white/80 p-5 dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={`tech-${noDirCurrentRow.id}`}
                        checked={noDirCurrentRow.selected}
                        onCheckedChange={() => toggleNoDirSelection(noDirPage - 1)}
                        className="border-red-300 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600 dark:border-zinc-600"
                      />
                      <label htmlFor={`tech-${noDirCurrentRow.id}`} className="text-sm font-medium cursor-pointer select-none">
                        Seleccionar para No Direccionamiento
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tecnología</p>
                      <p className="text-sm text-muted-foreground">{noDirCurrentRow.label}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">No. Prescripción</p>
                      <p className="text-sm font-medium">{noDirCurrentRow.payload.NoPrescripcion}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">TipoTec</p>
                      <p className="text-sm font-medium">{noDirCurrentRow.payload.TipoTec}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ConTec</p>
                      <p className="text-sm font-medium">{noDirCurrentRow.payload.ConTec}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Causal de no entrega</p>
                      <Select
                        value={String(noDirCurrentRow.payload.CausaNoEntrega || "")}
                        onValueChange={(value) => handleNoDirCausalChange(noDirPage - 1, value)}
                      >
                        <SelectTrigger className="h-10 border-red-200 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-900">
                          <SelectValue placeholder="Seleccione causal" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md border border-red-200 bg-rose-50 dark:border-zinc-700 dark:bg-zinc-900">
                          {Object.entries(CAUSAS_NO_ENTREGAS).map(([codigo, descripcion]) => (
                            <SelectItem key={codigo} value={codigo} className="py-2 hover:bg-rose-100 focus:bg-rose-100 dark:hover:bg-zinc-800">
                              {codigo} - {descripcion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {noDirRequierePA && (
                      <div className="flex flex-row gap-2 items-end flex-1">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Prescripción asociada <span className="text-red-600">*</span></p>
                          <Input
                            value={currentNoDirPA}
                            onChange={(e) => handleNoDirPrescripcionAsociadaChange(noDirPage - 1, e.target.value)}
                            placeholder="N° prescripción asociada"
                            className="h-10 border-red-200 focus-visible:ring-red-500 dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                        <div style={{ width: 80 }}>
                          <p className="text-xs">ConTec</p>
                          <Input
                            type="number"
                            min={0}
                            value={currentNoDirConTec}
                            onChange={(e) => handleNoDirConTecAsociadaChange(noDirPage - 1, e.target.value)}
                            placeholder="0"
                            className="h-10 border-red-200 focus-visible:ring-red-500 text-xs px-2 dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium">Observación</p>
                    <Input
                      value={noDirCurrentRow.observacion || ""}
                      onChange={(e) => handleNoDirObservacionChange(noDirPage - 1, e.target.value)}
                      placeholder="Digite una observación (se guardará internamente)"
                      className="h-10 mt-1 border-red-200 focus-visible:ring-red-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>

                  {noDirRows.length > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setNoDirPage(p => Math.max(1, p - 1))}
                        disabled={noDirPage <= 1}
                        className="h-9 border-red-200 hover:bg-red-100 hover:text-red-900 dark:border-zinc-700"
                      >
                        Anterior
                      </Button>
                      <p className="text-xs text-muted-foreground">{noDirPage} / {noDirRows.length}</p>
                      <Button
                        variant="outline"
                        onClick={() => setNoDirPage(p => Math.min(noDirRows.length, p + 1))}
                        disabled={noDirPage >= noDirRows.length}
                        className="h-9 border-red-200 hover:bg-red-100 hover:text-red-900 dark:border-zinc-700"
                      >
                        Siguiente
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-100 dark:border-zinc-700"
                  onClick={onClose}
                  disabled={noDirSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleNoDirSubmit}
                  disabled={
                    noDirSubmitting ||
                    noDirRows.filter(r => r.selected).length === 0 ||
                    (noDirRequierePA && !currentNoDirPA.trim())
                  }
                >
                  {noDirSubmitting
                    ? "Registrando..."
                    : noDirRows.filter(r => r.selected).length > 1
                      ? `Registrar ${noDirRows.filter(r => r.selected).length} tecnologías`
                      : "Guardar no direccionamiento"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Columna derecha: panel de info ── */}
        <div className="w-80 shrink-0 border rounded-lg overflow-hidden self-start sticky top-4">
          <div className="flex border-b bg-muted/30">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${infoTab === 'afiliado' ? 'bg-background text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setInfoTab('afiliado')}
            >
              <User className="h-4 w-4" />
              Afiliado
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${infoTab === 'prescripcion' ? 'bg-background text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setInfoTab('prescripcion')}
            >
              <FileText className="h-4 w-4" />
              Prescripción
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${infoTab === 'prescriptor' ? 'bg-background text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setInfoTab('prescriptor')}
            >
              <ClipboardList className="h-4 w-4" />
              Prescriptor
            </button>
          </div>

          <ScrollArea className="max-h-[70vh]">
            {infoTab === 'prescripcion' && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Paciente</p>
                    <p className="font-medium text-xs leading-snug">{prescripcion.PNPaciente} {prescripcion.PAPaciente}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Documento</p>
                    <p className="font-medium text-xs">{prescripcion.TipoIDPaciente || prescripcion.TipoIDPac} - {prescripcion.NroIDPaciente || prescripcion.NoIDPaciente}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Fecha</p>
                    <p className="font-medium text-xs">{prescripcion.FPrescripcion?.split("T")[0]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Estado</p>
                    <Badge variant={prescripcion.EstPres === 4 ? "default" : "destructive"} className={`text-[10px] py-0 ${prescripcion.EstPres === 4 ? "bg-emerald-500" : ""}`}>
                      {prescripcion.EstPres === 4 ? "Activo" : "Anulado"}
                    </Badge>
                  </div>
                </div>
                <Tabs defaultValue="medicamentos" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 h-16 mb-4">
                    <TabsTrigger value="medicamentos" className="text-[10px] px-1 gap-0.5 flex-col h-full">
                      <Pill className="h-3 w-3" />
                      <span className="font-semibold">M</span>
                      <span>{medCount}</span>
                    </TabsTrigger>
                    <TabsTrigger value="procedimientos" className="text-[10px] px-1 gap-0.5 flex-col h-full">
                      <Stethoscope className="h-3 w-3" />
                      <span className="font-semibold">P</span>
                      <span>{procCount}</span>
                    </TabsTrigger>
                    <TabsTrigger value="dispositivos" className="text-[10px] px-1 gap-0.5 flex-col h-full">
                      <Package className="h-3 w-3" />
                      <span className="font-semibold">D</span>
                      <span>{dispCount}</span>
                    </TabsTrigger>
                    <TabsTrigger value="nutricionales" className="text-[10px] px-1 gap-0.5 flex-col h-full">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-semibold">PN</span>
                      <span>{nutrCount}</span>
                    </TabsTrigger>
                    <TabsTrigger value="servicios" className="text-[10px] px-1 gap-0.5 flex-col h-full">
                      <Activity className="h-3 w-3" />
                      <span className="font-semibold">S</span>
                      <span>{servCount}</span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="medicamentos" className="mt-0">
                    <PanelPager items={getArray(prescripcion, "medicamentos")} render={(item) => <MedicamentosDetails medicamentos={[item]} />} />
                  </TabsContent>
                  <TabsContent value="procedimientos" className="mt-0">
                    <PanelPager items={getArray(prescripcion, "procedimientos")} render={(item) => <ProcedimientosDetails procedimientos={[item]} />} />
                  </TabsContent>
                  <TabsContent value="dispositivos" className="mt-0">
                    <PanelPager items={getArray(prescripcion, "dispositivos")} render={(item) => <DispositivosDetails dispositivos={[item]} />} />
                  </TabsContent>
                  <TabsContent value="nutricionales" className="mt-0">
                    <PanelPager items={getArray(prescripcion, "productosNutricionales")} render={(item) => <ProductosNutricionalesDetails productos={[item]} />} />
                  </TabsContent>
                  <TabsContent value="servicios" className="mt-0">
                    <PanelPager items={getArray(prescripcion, "serviciosComplementarios")} render={(item) => <ServiciosComplementariosDetails servicios={[item]} />} />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {infoTab === 'prescriptor' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{prescripcion.PNProfS || "N/A"} {prescripcion.PAProfS || ""}</h3>
                    <p className="text-xs text-muted-foreground">Profesional de la Salud</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Registro Profesional</p>
                      <p className="font-medium text-xs">{prescripcion.RegProfS || "No registrado"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Municipio IPS</p>
                      <p className="font-medium text-xs">{prescripcion.CodDANEMunIPS || "—"}{municipioNombre ? ` · ${municipioNombre}` : ""}</p>
                    </div>
                  </div>
                  {prescripcion.CodAmbAte && (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Ámbito de atención</p>
                        <p className="font-medium text-xs">{AMBITOS_ATENCION[prescripcion.CodAmbAte as keyof typeof AMBITOS_ATENCION] || "Desconocido"}</p>
                      </div>
                    </div>
                  )}
                  {prescripcion.CodDxPpal && (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                        <Stethoscope className="h-4 w-4 text-rose-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Diagnóstico Principal</p>
                        <p className="font-medium text-xs">{prescripcion.CodDxPpal}</p>
                      </div>
                    </div>
                  )}
                  {prescripcion.CodEPS && (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                        <Home className="h-4 w-4 text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">{prescripcion.TipoIDIPS} - {prescripcion.NroIDIPS}</p>
                        {prescripcion.ipsSolicitanteNombre && <p className="text-xs font-medium">{prescripcion.ipsSolicitanteNombre}</p>}
                        <p className="font-medium text-xs">{prescripcion.DirSedeIPS || "Dirección no registrada"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {infoTab === 'afiliado' && (
              <div className="p-4 space-y-2">
                {!datosAfiliado ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Cargando datos del afiliado...
                  </div>
                ) : (
                  <>
                    {datosAfiliado.ips_primaria && (
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-sky-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">IPS Primaria</p>
                          <p className="font-medium text-xs">{datosAfiliado.ips_primaria}</p>
                        </div>
                      </div>
                    )}
                    {datosAfiliado.grupo_poblacional && (
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Grupo Poblacional</p>
                          <p className="font-medium text-xs">{datosAfiliado.grupo_poblacional}</p>
                        </div>
                      </div>
                    )}
                    {datosAfiliado.etnia_comunidad && (
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                          <BadgeCheck className="h-4 w-4 text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Etnia / Comunidad</p>
                          <p className="font-medium text-xs">{datosAfiliado.etnia_comunidad}</p>
                        </div>
                      </div>
                    )}
                    {datosAfiliado.discapacidad && (
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                          <Activity className="h-4 w-4 text-rose-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Discapacidad</p>
                          <p className="font-medium text-xs">{datosAfiliado.discapacidad}</p>
                        </div>
                      </div>
                    )}
                    {datosAfiliado.indigena_asentamiento && (
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                          <MapPin className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Asentamiento</p>
                          <p className="font-medium text-xs">{datosAfiliado.indigena_asentamiento}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

      </div>
    </>
  )
}
