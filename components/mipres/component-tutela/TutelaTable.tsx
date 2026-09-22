"use client"

import { useMemo, useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Calendar, User, Hash, Eye, ChevronLeft, ChevronRight, Activity, Gavel, Pill, Stethoscope, Package, Sparkles, ArrowUpDown, ArrowUp, ArrowDown, Printer, Download, Info, Search } from "lucide-react"
import { TutelaInfoModal } from "./TutelaInfoModal"
import { TutelaModal } from "./TutelaModal"
import { CategoryBadge } from "@/components/mipres/component-prescripcion/CategoryBadge"
import { AccionesModal, DireccionamientoLecturaModal } from "../component-direccionamiento/DireccionamientoView"
import { NoDireccionamientoLecturaModal } from "../component-nodirecionamiento"
import type { MipresCredentials } from "@/models/credentials.model"
import { preparePrescripcionExportData, exportToExcel } from "@/lib/config/export-utils"
import { generarPrescripcionHTML } from "@/lib/plantillas_pdf/prescripcion_pdf"
import { IPS_DUSAKAWI } from "@/lib/config/organizacion"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"


interface TutelaTableProps {
  tutelas: any[]
  credentials: MipresCredentials
  onRefresh?: () => void
  onDireccionamientoFormOpen?: (open: boolean) => void
}

function getEstadoTutela(estTut?: number) {
  if (estTut === 4) return { label: "Activa", className: "bg-emerald-500 hover:bg-emerald-600" }
  if (estTut === 1) return { label: "Modificada", className: "bg-amber-500 hover:bg-amber-600" }
  if (estTut === 2) return { label: "Anulada", className: "bg-red-500 hover:bg-red-600" }
  return { label: `Estado ${estTut ?? "-"}`, className: "bg-muted text-muted-foreground" }
}

export function TutelaTable({ tutelas, credentials, onRefresh, onDireccionamientoFormOpen }: TutelaTableProps) {
  const [selectedTutela, setSelectedTutela] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTutelaInfo, setSelectedTutelaInfo] = useState<any>(null)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [searchNoTutela, setSearchNoTutela] = useState("")
  const [regimenFilter, setRegimenFilter] = useState<"todos" | "Contributivo" | "Subsidiado">("todos")
  const [direccionamientoFilter, setDireccionamientoFilter] = useState<"todos" | "direccionado" | "no-direccionado" | "no-direccionamiento">("todos")
  const [dateSort, setDateSort] = useState<"none" | "asc" | "desc">("none")

  // Estados para modales de direccionamiento
  const [selectedForAcciones, setSelectedForAcciones] = useState<any>(null)
  const [accionesModalOpen, setAccionesModalOpen] = useState(false)
  const [accionesFormOpen, setAccionesFormOpen] = useState(false)
  const [verFormOpen, setVerFormOpen] = useState(false)
  const [noDirFormOpen, setNoDirFormOpen] = useState(false)
  const anyFormOpen = accionesFormOpen || verFormOpen || noDirFormOpen
  useEffect(() => { onDireccionamientoFormOpen?.(anyFormOpen) }, [anyFormOpen])

  const [accionesInitialFocus, setAccionesInitialFocus] = useState<any>(null)
  const [selectedForVer, setSelectedForVer] = useState<any>(null)
  const [verModalOpen, setVerModalOpen] = useState(false)
  const [selectedForNoDireccionamiento, setSelectedForNoDireccionamiento] = useState<any>(null)
  const [noDireccionamientoModalOpen, setNoDireccionamientoModalOpen] = useState(false)

  // Estados de validación
  const [anulacionStatus, setAnulacionStatus] = useState<Record<string, boolean>>({})
  const [direccionamientoStatus, setDireccionamientoStatus] = useState<Record<string, boolean>>({})
  const [noDireccionamientoStatus, setNoDireccionamientoStatus] = useState<Record<string, boolean>>({})
  const [noDireccionamientoNoAnuladoStatus, setNoDireccionamientoNoAnuladoStatus] = useState<Record<string, boolean>>({})
  const [statusChecked, setStatusChecked] = useState<Record<string, boolean>>({})

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeRow, setActiveRow] = useState<string | null>(null)

  const { fetchTutelas } = useMipresQueryClient()

  const getTutelaDetalleSiHaceFalta = async (tutela: any) => {
    const hasAnyTecnologias = ["medicamentos", "procedimientos", "dispositivos", "productosNutricionales", "serviciosComplementarios"].some(
      (k) => Array.isArray(tutela?.[k]) && tutela[k].length > 0
    )
    if (hasAnyTecnologias) return tutela

    const noTutela = tutela?.NoTutela
    if (!noTutela) return tutela

    try {
      const result = await fetchTutelas(credentials, "numero", { noTutela: String(noTutela) })
      const detailed = Array.isArray(result) ? result[0] : result
      return detailed || tutela
    } catch {
      return tutela
    }
  }
  
  // Funciones para abrir modales de direccionamiento
  const openAccionesModal = async (tutela: any) => {
    const tutelaDetalle = await getTutelaDetalleSiHaceFalta(tutela)
    const filteredTutela = {
      ...tutelaDetalle,
      NoPrescripcion: tutelaDetalle.NoTutela,
      TipoIDPaciente: tutelaDetalle.TipoIDPaciente,
      NoIDPaciente: tutelaDetalle.NroIDPaciente,
      medicamentos: Array.isArray(tutelaDetalle.medicamentos) ? tutelaDetalle.medicamentos : [],
      procedimientos: Array.isArray(tutelaDetalle.procedimientos) ? tutelaDetalle.procedimientos : [],
      dispositivos: Array.isArray(tutelaDetalle.dispositivos) ? tutelaDetalle.dispositivos : [],
      productosNutricionales: Array.isArray(tutelaDetalle.productosNutricionales) ? tutelaDetalle.productosNutricionales : [],
      serviciosComplementarios: Array.isArray(tutelaDetalle.serviciosComplementarios) ? tutelaDetalle.serviciosComplementarios : [],
    }
    setSelectedForAcciones(filteredTutela)
    setAccionesModalOpen(true)
  }

  const openAccionesModalWithFocus = async (tutela: any, initialFocus?: {
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
  }) => {
    const tutelaDetalle = await getTutelaDetalleSiHaceFalta(tutela)
    const filteredTutela = {
      ...tutelaDetalle,
      NoPrescripcion: tutelaDetalle.NoTutela,
      TipoIDPaciente: tutelaDetalle.TipoIDPaciente,
      NoIDPaciente: tutelaDetalle.NroIDPaciente,
      medicamentos: Array.isArray(tutelaDetalle.medicamentos) ? tutelaDetalle.medicamentos : [],
      procedimientos: Array.isArray(tutelaDetalle.procedimientos) ? tutelaDetalle.procedimientos : [],
      dispositivos: Array.isArray(tutelaDetalle.dispositivos) ? tutelaDetalle.dispositivos : [],
      productosNutricionales: Array.isArray(tutelaDetalle.productosNutricionales) ? tutelaDetalle.productosNutricionales : [],
      serviciosComplementarios: Array.isArray(tutelaDetalle.serviciosComplementarios) ? tutelaDetalle.serviciosComplementarios : [],
    }
    setSelectedForAcciones(filteredTutela)
    setAccionesInitialFocus(initialFocus || null)
    setAccionesModalOpen(true)
  }

  const openVerModal = async (tutela: any) => {
    const tutelaDetalle = await getTutelaDetalleSiHaceFalta(tutela)
    const tutelaAsPrescripcion = {
      ...tutelaDetalle,
      NoPrescripcion: tutelaDetalle.NoTutela,
      TipoIDPaciente: tutelaDetalle.TipoIDPaciente,
      NoIDPaciente: tutelaDetalle.NroIDPaciente,
    }
    setSelectedForVer(tutelaAsPrescripcion)
    setVerModalOpen(true)
  }

  const openNoDireccionamientoModal = async (tutela: any) => {
    const tutelaDetalle = await getTutelaDetalleSiHaceFalta(tutela)
    const tutelaAsPrescripcion = {
      ...tutelaDetalle,
      NoPrescripcion: tutelaDetalle.NoTutela,
      TipoIDPaciente: tutelaDetalle.TipoIDPaciente,
      NoIDPaciente: tutelaDetalle.NroIDPaciente,
    }
    setSelectedForNoDireccionamiento(tutelaAsPrescripcion)
    setNoDireccionamientoModalOpen(true)
  }
  
  const handleAccionesSuccess = async () => {
    const currentTutela = selectedForAcciones
    const noTutela = currentTutela?.NoTutela ? String(currentTutela.NoTutela) : null

    setAccionesModalOpen(false)
    setSelectedForAcciones(null)
    setAccionesInitialFocus(null)
    setAccionesFormOpen(false)

    // Optimistic update: mostrar verde inmediatamente sin esperar al API
    if (noTutela) {
      setDireccionamientoStatus((prev) => ({ ...prev, [noTutela]: true }))
      setAnulacionStatus((prev) => ({ ...prev, [noTutela]: false }))
      setStatusChecked((prev) => ({ ...prev, [noTutela]: false }))
    }

    if (currentTutela) {
      await checkSingleAnulacionStatus(currentTutela)
    }

    if (onRefresh) {
      onRefresh()
    } else {
      window.location.reload()
    }
  }

  // Validar si una tutela puede direccionarse
  // Permite direccionar tecnologías de tipos diferentes aunque otras estén pendientes
  // Pero bloquea si hay múltiples del mismo tipo con una pendiente/rechazada
  const canDireccionarTutela = (tutela: any): { 
    canDireccionar: boolean
    status: 'success' | 'warning' | 'error'
    hasApproved?: boolean
    hasPending?: boolean
    isDifferentTypePartial?: boolean
    typeDetails?: Array<{ type: string; approved: number; pending: number; rejected: number }>
  } => {
    const tecsByType = {
      med: Array.isArray(tutela.medicamentos) ? tutela.medicamentos : [],
      proc: Array.isArray(tutela.procedimientos) ? tutela.procedimientos : [],
      disp: Array.isArray(tutela.dispositivos) ? tutela.dispositivos : [],
      nutr: Array.isArray(tutela.productosNutricionales) ? tutela.productosNutricionales : [],
      serv: Array.isArray(tutela.serviciosComplementarios) ? tutela.serviciosComplementarios : [],
    }

    const typeStates: Record<string, { approved: number; pending: number; rejected: number }> = {}
    let totalApproved = 0
    let totalPending = 0
    let totalRejected = 0
    let typesWithTechs = 0
    const typeDetailsArray: Array<{ type: string; approved: number; pending: number; rejected: number }> = []

    // Analizar cada tipo de tecnología
    for (const [type, techs] of Object.entries(tecsByType)) {
      if (!Array.isArray(techs) || techs.length === 0) continue
      
      typesWithTechs++
      const hasEstJM = techs.some((t: any) => t?.EstJM !== undefined && t?.EstJM !== null)
      const approved = hasEstJM ? techs.filter((t: any) => t.EstJM === 1 || t.EstJM === 3).length : techs.length
      const pending = hasEstJM ? techs.filter((t: any) => t.EstJM === 2).length : 0
      const rejected = hasEstJM ? techs.filter((t: any) => t.EstJM === 4).length : 0

      typeStates[type] = { approved, pending, rejected }
      typeDetailsArray.push({ type, approved, pending, rejected })
      totalApproved += approved
      totalPending += pending
      totalRejected += rejected
    }

    // Si hay rechazadas globalmente, no permitir
    if (totalRejected > 0) {
      return { canDireccionar: false, status: 'error', typeDetails: typeDetailsArray }
    }

    // Detectar si es el caso especial: 2+ tipos diferentes CON aprobadas Y pendientes (pero no mezcla en mismo tipo)
    let isDifferentTypePartial = false
    let hasMultipleTypesWithContent = typesWithTechs > 1
    let hasApprovedInAnyType = false
    let hasPendingInAnyType = false

    for (const [type, state] of Object.entries(typeStates)) {
      const { approved, pending, rejected } = state
      const totalOfType = approved + pending + rejected

      if (approved > 0) hasApprovedInAnyType = true
      if (pending > 0) hasPendingInAnyType = true

      // Bloqueo: si en el MISMO tipo hay múltiples techs con mezcla (no todos del mismo estado)
      if (totalOfType > 1 && (pending > 0 || rejected > 0) && approved > 0) {
        return { canDireccionar: false, status: 'warning', typeDetails: typeDetailsArray }
      }
    }

    // Caso especial: diferentes tipos con algunos aprobados y otros pendientes
    if (hasMultipleTypesWithContent && hasApprovedInAnyType && hasPendingInAnyType) {
      isDifferentTypePartial = true
    }

    // Si hay aprobadas (aunque haya pendientes de otros tipos), permitir
    if (totalApproved > 0) {
      return { canDireccionar: true, status: totalPending > 0 ? 'warning' : 'success', hasApproved: true, hasPending: totalPending > 0, isDifferentTypePartial, typeDetails: typeDetailsArray }
    }

    // Si todo está pendiente, no permitir aún
    if (totalPending > 0) {
      return { canDireccionar: false, status: 'warning', typeDetails: typeDetailsArray }
    }

    return { canDireccionar: true, status: 'success', typeDetails: typeDetailsArray }
  }

  const getTokensForTutela = (tutela?: any) => {
    const preferContributivo = tutela?.tipoRegimen === "Contributivo"
    const preferSubsidiado = tutela?.tipoRegimen === "Subsidiado"

    const ordered = preferContributivo
      ? [
          credentials.tokenAccesoContributivo,
          credentials.tokenAccesoSubsidiado,
          credentials.tokenAcceso,
        ]
      : preferSubsidiado
      ? [
          credentials.tokenAccesoSubsidiado,
          credentials.tokenAccesoContributivo,
          credentials.tokenAcceso,
        ]
      : [
          credentials.tokenAcceso,
          credentials.tokenAccesoSubsidiado,
          credentials.tokenAccesoContributivo,
        ]

    return Array.from(new Set(ordered.filter(Boolean))) as string[]
  }

  const parseApiList = (data: any, keys: string[]) => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray(data.root)) return data.root
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key]
    }
    return []
  }

  const fetchDireccionamientosTutelaWithTokens = async (noTutela: string, tokens: string[]) => {
    const merged: any[] = []
    for (const tokenAcceso of tokens) {
      try {
        const dirQueryParams = new URLSearchParams({
          nit: credentials.nit,
          tokenAcceso,
          tipo: "prescripcion",
          noPrescripcion: noTutela,
        })

        const dirResponse = await fetch(`/api/mipres/direccionamiento?${dirQueryParams.toString()}`)
        const dirResult = dirResponse.ok ? await dirResponse.json() : null

        if (dirResult?.success) {
          const list = parseApiList(dirResult.data, ["direccionamientos"])
          if (list.length > 0) merged.push(...list)
        }
      } catch {
      }
    }

    return merged
  }

  const fetchNoDireccionamientosTutelaWithTokens = async (noTutela: string, tokens: string[]) => {
    const merged: any[] = []
    for (const tokenAcceso of tokens) {
      try {
        const noDirQueryParams = new URLSearchParams({
          nit: credentials.nit,
          tokenAcceso,
          tipo: "prescripcion",
          noPrescripcion: noTutela,
        })

        const noDirResponse = await fetch(`/api/mipres/no-direccionamiento?${noDirQueryParams.toString()}`)
        const noDirResult = noDirResponse.ok ? await noDirResponse.json() : null

        if (noDirResult?.success && noDirResult.data) {
          const list = parseApiList(noDirResult.data, ["noDireccionamientos"])
          if (list.length > 0) merged.push(...list)
        }
      } catch {
      }
    }

    return merged
  }

  const checkSingleAnulacionStatus = async (tutela: any) => {
    try {
      const noTutela = String(tutela?.NoTutela || "").trim()
      if (!credentials.nit || !noTutela) return

      const tokens = getTokensForTutela(tutela)
      if (tokens.length === 0) return

      const direccionamientos = await fetchDireccionamientosTutelaWithTokens(noTutela, tokens)
      const tieneDireccionamientoVigente = direccionamientos.some((d: any) => !d.FecAnulacion && d.Estado !== 3)
      const tieneSoloDireccionamientosAnulados = direccionamientos.length > 0 && !tieneDireccionamientoVigente
      setDireccionamientoStatus((prev) => ({ ...prev, [noTutela]: tieneDireccionamientoVigente }))
      setAnulacionStatus((prev) => ({ ...prev, [noTutela]: tieneSoloDireccionamientosAnulados }))

      const noDireccionamientos = await fetchNoDireccionamientosTutelaWithTokens(noTutela, tokens)
      const hasNoDirec = noDireccionamientos.length > 0
      const hasNoDirecNoAnulado = noDireccionamientos.some((nd: any) => !String(nd?.FecAnulacion ?? "").trim())

      setNoDireccionamientoStatus((prev) => ({ ...prev, [noTutela]: hasNoDirec }))
      setNoDireccionamientoNoAnuladoStatus((prev) => ({ ...prev, [noTutela]: hasNoDirecNoAnulado }))
    } catch {
    }
  }

  const getSyncState = (tutela: any): "gray" | "red" | "yellow" | "green" => {
    const noTutela = String(tutela?.NoTutela || "")
    const hasDireccionamientoVigente = Boolean(
      (tutela?.direccionada || direccionamientoStatus[noTutela]) &&
      !anulacionStatus[noTutela]
    )
    const hasNoDireccionamientoNoAnulado = Boolean(noDireccionamientoNoAnuladoStatus[noTutela])

    if (hasNoDireccionamientoNoAnulado) return "red"
    if (hasDireccionamientoVigente) return "green"
    return "gray"
  }

  const filtered = useMemo(() => {
    let list = tutelas

    if (searchNoTutela.trim()) {
      list = list.filter((item) =>
        String(item.NoTutela || "").toLowerCase().includes(searchNoTutela.toLowerCase())
      )
    }

    // Apply direccionamiento filter
    if (direccionamientoFilter === "direccionado") {
      list = list.filter((item) =>
        Boolean(item.direccionada || direccionamientoStatus[item.NoTutela]) &&
        !noDireccionamientoStatus[item.NoTutela]
      )
    } else if (direccionamientoFilter === "no-direccionado") {
      list = list.filter((item) =>
        !Boolean(item.direccionada || direccionamientoStatus[item.NoTutela]) &&
        !noDireccionamientoStatus[item.NoTutela]
      )
    } else if (direccionamientoFilter === "no-direccionamiento") {
      list = list.filter((item) => noDireccionamientoStatus[item.NoTutela] === true)
    }

    if (regimenFilter !== "todos") {
      list = list.filter((item) => item.tipoRegimen === regimenFilter)
    }

    if (dateSort !== "none") {
      const copy = [...list]
      copy.sort((a: any, b: any) => {
        const dateA = new Date(`${a.FTutela || ""} ${a.HTutela || "00:00:00"}`).getTime()
        const dateB = new Date(`${b.FTutela || ""} ${b.HTutela || "00:00:00"}`).getTime()
        return dateSort === "asc" ? dateA - dateB : dateB - dateA
      })
      return copy
    }

    return list
  }, [tutelas, searchNoTutela, direccionamientoFilter, regimenFilter, dateSort, direccionamientoStatus, noDireccionamientoStatus])

  const handlePrintTutela = async (tutela: any) => {
    try {
      const tutelaAsPrescripcion = {
        ...tutela,
        NoPrescripcion: tutela.NoTutela,
        FPrescripcion: tutela.FTutela,
        HPrescripcion: tutela.HTutela,
        ...IPS_DUSAKAWI,
      }
      await generarPrescripcionHTML(tutelaAsPrescripcion as any)
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.includes("ventanas emergentes")
          ? "Por favor permite ventanas emergentes para esta página y vuelve a intentar."
          : "Error al generar el PDF. Por favor intenta nuevamente."
      alert(errorMessage)
    }
  }

  const handleExportExcel = () => {
    const exportData = preparePrescripcionExportData(filtered)
    const timestamp = new Date().toISOString().split("T")[0]
    exportToExcel(exportData, `tutelas_${timestamp}.xlsx`)
  }

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const displayed = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  // Verificar estado por página (lazy + chunks)
  useEffect(() => {
    const checkAnulacionStatus = async () => {
      if (!credentials.nit) return

      const toCheck = displayed.filter((tutela) => {
        const noTutela = tutela?.NoTutela
        return Boolean(noTutela) && !statusChecked[noTutela]
      })

      if (toCheck.length === 0) return

      const newAnulacionStatus: Record<string, boolean> = {}
      const newDireccionamientoStatus: Record<string, boolean> = {}
      const newNoDireccionamientoStatus: Record<string, boolean> = {}
      const newNoDireccionamientoNoAnuladoStatus: Record<string, boolean> = {}
      const checkedNow: Record<string, boolean> = {}

      const chunkSize = 5
      for (let i = 0; i < toCheck.length; i += chunkSize) {
        const chunk = toCheck.slice(i, i + chunkSize)

        await Promise.all(
          chunk.map(async (tutela) => {
            try {
              const noTutela = tutela.NoTutela
              if (!noTutela) return

              const tokens = getTokensForTutela(tutela)
              if (tokens.length === 0) return

              const direccionamientos = await fetchDireccionamientosTutelaWithTokens(noTutela, tokens)
              const tieneDireccionamientoVigente = direccionamientos.some((d: any) => !d.FecAnulacion && d.Estado !== 3)
              const tieneSoloDireccionamientosAnulados = direccionamientos.length > 0 && !tieneDireccionamientoVigente
              newDireccionamientoStatus[noTutela] = tieneDireccionamientoVigente
              newAnulacionStatus[noTutela] = tieneSoloDireccionamientosAnulados

              const noDireccionamientos = await fetchNoDireccionamientosTutelaWithTokens(noTutela, tokens)
              const hasNoDirec = noDireccionamientos.length > 0
              newNoDireccionamientoStatus[noTutela] = hasNoDirec

              const hasNoDirecNoAnulado = noDireccionamientos.some((nd: any) => !String(nd?.FecAnulacion ?? "").trim())
              newNoDireccionamientoNoAnuladoStatus[noTutela] = hasNoDirecNoAnulado

              checkedNow[noTutela] = true
            } catch {
            }
          })
        )
      }

      setAnulacionStatus((prev) => ({ ...prev, ...newAnulacionStatus }))
      setDireccionamientoStatus((prev) => ({ ...prev, ...newDireccionamientoStatus }))
      setNoDireccionamientoStatus((prev) => ({ ...prev, ...newNoDireccionamientoStatus }))
      setNoDireccionamientoNoAnuladoStatus((prev) => ({ ...prev, ...newNoDireccionamientoNoAnuladoStatus }))
      setStatusChecked((prev) => ({ ...prev, ...checkedNow }))
    }

    checkAnulacionStatus()
  }, [displayed, statusChecked, credentials.nit, credentials.tokenAcceso, credentials.tokenAccesoSubsidiado, credentials.tokenAccesoContributivo])

  if (!tutelas.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">No se encontraron tutelas</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Intenta con otros criterios de busqueda</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {!anyFormOpen && <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Tutelas</h2>
          <Badge variant="secondary" className="text-xs">
            {total}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[180px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar"
              value={searchNoTutela}
              onChange={(e) => setSearchNoTutela(e.target.value)}
              className="h-8 w-full rounded-md border bg-white pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Select value={direccionamientoFilter} onValueChange={(value: any) => setDireccionamientoFilter(value)}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-white text-foreground border border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Estado: Todos</SelectItem>
              <SelectItem value="direccionado">Direccionado</SelectItem>
              <SelectItem value="no-direccionado">Sin Proceso</SelectItem>
              <SelectItem value="no-direccionamiento">No Direccionamiento</SelectItem>
            </SelectContent>
          </Select>

          <Select value={regimenFilter} onValueChange={(value: any) => setRegimenFilter(value)}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-white text-foreground border border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Regimen: Todos</SelectItem>
              <SelectItem value="Contributivo">Regimen: Contributivo</SelectItem>
              <SelectItem value="Subsidiado">Regimen: Subsidiado</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 bg-white text-foreground border border-input hover:bg-muted/40"
            onClick={handleExportExcel}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <Hash className="h-3 w-3" />
                    Tutela
                  </div>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <User className="h-3 w-3" />
                    Paciente
                  </div>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDateSort((prev) => 
                        prev === "none" ? "desc" : prev === "desc" ? "asc" : "none"
                      )
                    }}
                    className="flex items-center justify-center gap-1.5 w-full hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Calendar className="h-3 w-3" />
                    Fecha de Tutela
                    {dateSort === "none" && <ArrowUpDown className="h-3 w-3" />}
                    {dateSort === "asc" && <ArrowUp className="h-3 w-3" />}
                    {dateSort === "desc" && <ArrowDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <Activity className="h-3 w-3" />
                    Estado de Tutela
                  </div>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  Tipo de regimen
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  Tecnologías asociadas
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  <Popover>
                    <PopoverTrigger className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-foreground transition-colors w-full">
                      Direccionamiento
                      <Info className="h-3 w-3" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <div className="space-y-2 text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-gray-400 shadow-sm" />
                          <span>Sin proceso / Todos anulados</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
                          <span>Direccionamiento activo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
                          <span>No direccionamiento</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-4">
                  <div className="flex justify-end">
                    <span className="inline-block w-28 text-center">Acciones</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.map((tutela, idx) => {
                const estado = getEstadoTutela(Number(tutela.EstTut))
                const nombrePaciente = [tutela.PNPaciente, tutela.SNPaciente, tutela.PAPaciente, tutela.SAPaciente]
                  .filter(Boolean)
                  .join(" ")
                const medCount = Array.isArray(tutela.medicamentos) ? tutela.medicamentos.length : 0
                const procCount = Array.isArray(tutela.procedimientos) ? tutela.procedimientos.length : 0
                const dispCount = Array.isArray(tutela.dispositivos) ? tutela.dispositivos.length : 0
                const nutrCount = Array.isArray(tutela.productosNutricionales) ? tutela.productosNutricionales.length : 0
                const servCount = Array.isArray(tutela.serviciosComplementarios) ? tutela.serviciosComplementarios.length : 0

                const hasDireccionamiento = Boolean(
                  (tutela.direccionada || direccionamientoStatus[tutela.NoTutela]) &&
                  !anulacionStatus[tutela.NoTutela]
                )
                const hasNoDireccionamiento = Boolean(
                  noDireccionamientoNoAnuladoStatus[tutela.NoTutela]
                )
                const { canDireccionar, status, isDifferentTypePartial, typeDetails } = canDireccionarTutela(tutela)

                const isActive = activeRow === String(tutela.NoTutela)
                const syncState = getSyncState(tutela)
                return (
                  <tr key={tutela.NoTutela ?? idx} className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}> 
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-mono text-xs font-medium text-emerald-700">
                        {tutela.NoTutela ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-sm font-medium">
                        {nombrePaciente || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="text-xs text-muted-foreground">
                        <div className="font-medium">{String(tutela.FTutela || "-").split("T")[0]}</div>
                        <div className="text-[10px]">{tutela.HTutela || "-"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge className={`text-[10px] h-5 ${estado.className}`}>
                        {estado.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-5 ${
                          tutela.tipoRegimen === "Contributivo"
                            ? "bg-blue-100 text-blue-700"
                            : tutela.tipoRegimen === "Subsidiado"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tutela.tipoRegimen || "Sin regimen"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <CategoryBadge icon={Pill} label="Med" count={medCount} colorClass="bg-emerald-100 text-emerald-700" />
                        <CategoryBadge icon={Stethoscope} label="Proc" count={procCount} colorClass="bg-sky-100 text-sky-700" />
                        <CategoryBadge icon={Package} label="Disp" count={dispCount} colorClass="bg-amber-100 text-amber-700" />
                        <CategoryBadge icon={Sparkles} label="Nutr" count={nutrCount} colorClass="bg-rose-100 text-rose-700" />
                        <CategoryBadge icon={Activity} label="Serv" count={servCount} colorClass="bg-violet-100 text-violet-700" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {hasDireccionamiento && !hasNoDireccionamiento && !canDireccionar ? (
                        // Caso 1: Completamente direccionado (o todos anulados)
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openVerModal(tutela)}
                            title={
                              syncState === "gray"
                                ? "Todos los direccionamientos anulados - Clic para ver detalles"
                                : anulacionStatus[tutela.NoTutela]
                                ? "Todos los direccionamientos anulados - Clic para ver detalles"
                                : "Direccionado - Clic para ver detalles"
                            }
                          >
                            <span
                              className={`h-3.5 w-3.5 rounded-full ${
                                syncState === "gray"
                                  ? "bg-gray-400"
                                  : anulacionStatus[tutela.NoTutela]
                                  ? "bg-gray-400"
                                  : "bg-emerald-500"
                              }`}
                            />
                          </Button>
                        </div>
                      ) : hasNoDireccionamiento ? (
                        // Caso 2: Tiene no direccionamiento
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openNoDireccionamientoModal(tutela)}
                            title="No Direccionamiento - Clic para ver detalles"
                          >
                            <span className="h-3.5 w-3.5 rounded-full bg-red-500" />
                          </Button>
                        </div>
                      ) : hasDireccionamiento && canDireccionar ? (
                        // Caso 3: Dirección PARCIAL - 2 tipos diferentes
                        <div className="flex items-center justify-center gap-1">
                          {/* Mostrar solo si es dirección parcial de tipos diferentes */}
                          {isDifferentTypePartial && typeDetails && typeDetails.length >= 2 ? (
                            <>
                              {/* Punto 1: Tipo aprobado - ya direccionado */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openVerModal(tutela)}
                                title="Direccionado - Ver detalles"
                              >
                                <span
                                  className={`h-3.5 w-3.5 rounded-full ${
                                    syncState === "gray"
                                      ? "bg-gray-400"
                                      : anulacionStatus[tutela.NoTutela]
                                      ? "bg-gray-400"
                                      : "bg-emerald-500"
                                  }`}
                                />
                              </Button>
                              {/* Punto 2: Tipo en junta - no clickeable */}
                              <span
                                className="h-3.5 w-3.5 rounded-full bg-gray-400"
                                title="En revisión de junta - No disponible para direccionar"
                              />
                            </>
                          ) : (
                            // Si ya está direccionado, siempre mostrar según syncState
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openVerModal(tutela)}
                              title={
                                syncState === "gray"
                                  ? "Todos los direccionamientos anulados - Clic para ver detalles"
                                  : anulacionStatus[tutela.NoTutela]
                                  ? "Direccionamiento Anulado - Clic para ver detalles"
                                  : "Direccionado - Clic para ver detalles"
                              }
                            >
                              <span
                                className={`h-3.5 w-3.5 rounded-full ${
                                  syncState === "gray" || anulacionStatus[tutela.NoTutela]
                                    ? "bg-gray-400"
                                    : "bg-emerald-500"
                                }`}
                              />
                            </Button>
                          )}
                        </div>
                      ) : canDireccionar ? (
                        // Caso 4: Puede direccionarse pero aún no hay nada direccionado
                        <div className="flex items-center justify-center gap-1">
                          {/* Mostrar 2 puntos si hay 2 tipos diferentes */}
                          {isDifferentTypePartial && typeDetails && typeDetails.length >= 2 ? (
                            <>
                              {/* Punto 1: Tipo aprobado - BLOQUEADO (no clickeable) */}
                              <span 
                                className="h-3.5 w-3.5 rounded-full bg-gray-400"
                                title="En revisión de junta - No disponible para direccionar"
                              />
                              {/* Punto 2: Tipo en junta - NO clickeable */}
                              <span 
                                className="h-3.5 w-3.5 rounded-full bg-gray-400"
                                title="En revisión de junta - No disponible para direccionar"
                              />
                            </>
                          ) : (
                            // Solo 1 botón gris clickeable
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openAccionesModal(tutela)}
                              title="Direccionar tecnologías"
                            >
                              <span className="h-3.5 w-3.5 rounded-full bg-gray-400" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        // Caso 5: No puede direccionarse (todo pendiente, rechazado, etc)
                        <div className="flex items-center justify-center">
                          {status === 'warning' ? (
                            // En junta - no clickeable, punto gris normal
                            <span 
                              className="h-3.5 w-3.5 rounded-full bg-gray-400"
                              title="Pendiente evaluación de junta - Intente más tarde"
                            />
                          ) : (
                            // Rechazado u otro - no clickeable
                            <span 
                              className="h-3.5 w-3.5 rounded-full bg-gray-400"
                              title="Tecnología rechazada - Contacte con administrador"
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end">
                        <div className="w-40 flex justify-center items-center gap-1">
                          <span className="inline-block h-7 w-7" />

                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                handlePrintTutela(tutela)
                                setActiveRow(String(tutela.NoTutela))
                              }}
                            >
                              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Guardar como PDF
                            </span>
                          </div>

                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedTutelaInfo(tutela)
                                setInfoModalOpen(true)
                                setActiveRow(String(tutela.NoTutela))
                              }}
                              title="Ver información del fallo y profesional"
                            >
                              <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Información fallo
                            </span>
                          </div>

                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedTutela(tutela)
                                setModalOpen(true)
                                setActiveRow(String(tutela.NoTutela))
                              }}
                              title="Ver tutela"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Ver
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Pag:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(Number(value))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-16 h-8 text-xs bg-white text-foreground border border-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs font-medium min-w-[50px] text-center">
            {page} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </>}

      <TutelaModal tutela={selectedTutela} open={modalOpen} onClose={() => setModalOpen(false)} />
      <TutelaInfoModal tutela={selectedTutelaInfo} open={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
      
      {/* Modales de direccionamiento */}
      {selectedForAcciones && (
        <AccionesModal
          prescripcion={selectedForAcciones}
          open={accionesModalOpen}
          initialFocus={accionesInitialFocus || undefined}
          onClose={() => {
            setAccionesModalOpen(false)
            setSelectedForAcciones(null)
            setAccionesInitialFocus(null)
            setAccionesFormOpen(false)
          }}
          credentials={credentials}
          onSuccess={handleAccionesSuccess}
          onFormVisibilityChange={setAccionesFormOpen}
        />
      )}

      {selectedForVer && (
        <DireccionamientoLecturaModal
          prescripcion={selectedForVer}
          open={verModalOpen}
          onClose={() => {
            setVerModalOpen(false)
            setSelectedForVer(null)
            setVerFormOpen(false)
          }}
          onFormVisibilityChange={setVerFormOpen}
          onRequestDireccionar={(presc: any, params: any) => openAccionesModalWithFocus(presc, params)}
          credentials={credentials}
        />
      )}

      {selectedForNoDireccionamiento && (
        <NoDireccionamientoLecturaModal
          prescripcion={selectedForNoDireccionamiento}
          open={noDireccionamientoModalOpen}
          onClose={() => {
            setNoDireccionamientoModalOpen(false)
            setSelectedForNoDireccionamiento(null)
            setNoDirFormOpen(false)
          }}
          credentials={credentials}
          onFormVisibilityChange={setNoDirFormOpen}
        />
      )}
    </div>
  )
}
