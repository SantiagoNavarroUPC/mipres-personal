"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  ArrowLeft,
  ArrowRight,
  X,
  FileText,
  Eye,
  Hash,
  Pill,
  Stethoscope,
  Sparkles,
  Activity,
  ClipboardCheck
} from "lucide-react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Suministro } from "@/models/mipres-sispro/suministro/suministro"
import type { MipresCredentials } from "@/models/credentials.model"
import { SuministroAnularModal } from "./SuministroAnularModal"
import { SuministroLecturaModal } from "./SuministroLecturaView"
import { DireccionamientoLecturaModal } from "@/components/mipres/component-direccionamiento/DireccionamientoLecturaView"
import { ReporteEntregaLecturaModal } from "@/components/mipres/component-reporte-entrega/ReporteEntregaLecturaView"
import type { ReporteEntrega } from "@/models/mipres-sispro/reporte-entrega/reporte-entrega"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento/direccionamiento"
import { CategoryBadge } from "@/components/mipres/component-prescripcion/CategoryBadge"
import { secureStorageGetItem } from "@/lib/secure-storage"

interface SuministroTableProps {
  suministros: Suministro[]
  loading?: boolean
  credentials?: MipresCredentials
  onRefresh?: () => Promise<void>
  onFormVisibilityChange?: (open: boolean) => void
}

export function SuministroTable({ suministros, loading, credentials, onRefresh, onFormVisibilityChange }: SuministroTableProps) {
  type TechCountByTipo = { M: number; P: number; D: number; N: number; S: number }

  const [page, setPage] = useState(1)
  const [selectedSuministros, setSelectedSuministros] = useState<Suministro[]>([])
  const [selectedPrescripcion, setSelectedPrescripcion] = useState<string>("")

  // View open states
  const [suministroViewOpen, setSuministroViewOpen] = useState(false)
  const [anularViewOpen, setAnularViewOpen] = useState(false)
  const [dirViewOpen, setDirViewOpen] = useState(false)
  const [reporteViewOpen, setReporteViewOpen] = useState(false)

  // Data for each view
  const [modalOpen, setModalOpen] = useState(false)
  const [anularModalOpen, setAnularModalOpen] = useState(false)
  const [anularGroup, setAnularGroup] = useState<{ noPrescripcion: string; suministros: Suministro[] } | null>(null)
  const [direccionamientoOpen, setDireccionamientoOpen] = useState(false)
  const [selectedDireccionamientoPrescripcion, setSelectedDireccionamientoPrescripcion] = useState<any>(null)
  const [reportesModalOpen, setReportesModalOpen] = useState(false)
  const [selectedReportesForModal, setSelectedReportesForModal] = useState<ReporteEntrega[]>([])
  const [direccionamientoCredentials, setDireccionamientoCredentials] = useState<MipresCredentials>({
    nit: "",
    tokenAcceso: "",
  })

  const [pageSize, setPageSize] = useState<number>(10)
  const [activeRow, setActiveRow] = useState<string | null>(null)
  const [filterPrescripcion, setFilterPrescripcion] = useState<string>("")
  const [filterUltEntrega, setFilterUltEntrega] = useState<"all" | "with_last_delivery">("all")
  const [dateSort, setDateSort] = useState<"none" | "asc" | "desc">("none")
  const [techCountsByPrescripcion, setTechCountsByPrescripcion] = useState<Record<string, TechCountByTipo>>({})

  const anyViewOpen = suministroViewOpen || anularViewOpen || dirViewOpen || reporteViewOpen

  useEffect(() => {
    onFormVisibilityChange?.(anyViewOpen)
  }, [anyViewOpen, onFormVisibilityChange])

  const parseDateTime = (value?: string | null) => {
    if (!value) return 0
    const normalized = value.includes(" ") ? value.replace(" ", "T") : value
    const ts = new Date(normalized).getTime()
    return Number.isFinite(ts) ? ts : 0
  }

  const groupedSuministros = useMemo(() => {
    if (!suministros) return []

    const groups = new Map<string, Suministro[]>()

    for (const sum of suministros) {
      const key = String(sum?.NoPrescripcionAsociada ?? "").trim()
      if (!key) continue
      const current = groups.get(key) ?? []
      current.push(sum)
      groups.set(key, current)
    }

    const result = Array.from(groups.entries()).map(([noPrescripcion, group]) => {
      const sorted = [...group].sort((a, b) => (b.ID || 0) - (a.ID || 0))
      const latestSuministro = sorted[0]
      return {
        noPrescripcion,
        suministros: sorted,
        latestSuministro,
        count: sorted.length,
      }
    })

    if (dateSort === "none") {
      return result.sort((a, b) => (b.latestSuministro?.ID || 0) - (a.latestSuministro?.ID || 0))
    }

    return [...result].sort((a, b) => {
      const dateA = parseDateTime(a.latestSuministro?.FecSuministro)
      const dateB = parseDateTime(b.latestSuministro?.FecSuministro)
      return dateSort === "asc" ? dateA - dateB : dateB - dateA
    })
  }, [suministros, dateSort])

  const filteredGroups = useMemo(() => {
    const q = String(filterPrescripcion || "").trim().toLowerCase()
    return groupedSuministros.filter((g) => {
      const matchesPrescripcion = !q || String(g.noPrescripcion || "").toLowerCase().includes(q)
      if (!matchesPrescripcion) return false

      if (filterUltEntrega === "with_last_delivery") {
        return g.suministros.some((s) => Number((s as any).UltEntrega || 0) === 1)
      }

      return true
    })
  }, [groupedSuministros, filterPrescripcion, filterUltEntrega])

  const filteredTotal = filteredGroups.length
  const pageCount = Math.max(1, Math.ceil((filteredGroups.length || 0) / pageSize))

  const displayedGroups = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredGroups.slice(start, start + pageSize)
  }, [filteredGroups, page, pageSize])

  useEffect(() => {
    let cancelled = false

    const toArray = (data: any): Direccionamiento[] => {
      if (Array.isArray(data)) return data
      if (data && typeof data === "object") return [data]
      return []
    }

    const readCredentials = () => {
      let nit = credentials?.nit || ""
      let tokenAcceso = credentials?.tokenAcceso || ""
      let tokenAccesoSubsidiado = credentials?.tokenAccesoSubsidiado || ""
      let tokenAccesoContributivo = credentials?.tokenAccesoContributivo || ""

      const storedNit = localStorage.getItem("mipres_nit") || ""
      const storedToken = localStorage.getItem("mipres_token") || ""

      if (!nit) nit = storedNit
      if (!tokenAcceso) tokenAcceso = storedToken

      const savedCredentials = secureStorageGetItem("mipres_credentials")
      if (savedCredentials) {
        try {
          const parsed = JSON.parse(savedCredentials)
          nit = nit || parsed?.nit || ""
          tokenAcceso = tokenAcceso || parsed?.tokenAcceso || parsed?.token || ""
          tokenAccesoSubsidiado = tokenAccesoSubsidiado || parsed?.tokenAccesoSubsidiado || ""
          tokenAccesoContributivo = tokenAccesoContributivo || parsed?.tokenAccesoContributivo || ""
        } catch {}
      }

      return { nit, tokenAcceso, tokenAccesoSubsidiado, tokenAccesoContributivo }
    }

    const fetchTechCounts = async () => {
      const { nit, tokenAcceso, tokenAccesoSubsidiado, tokenAccesoContributivo } = readCredentials()

      if (!nit || (!tokenAcceso && !tokenAccesoSubsidiado && !tokenAccesoContributivo)) return

      const prescripciones = displayedGroups.map((group) => group.noPrescripcion)
      if (prescripciones.length === 0) return

      const entries = await Promise.all(
        prescripciones.map(async (noPrescripcion) => {
          try {
            const params = new URLSearchParams({ nit, tipo: "prescripcion", noPrescripcion })

            if (tokenAcceso) params.set("tokenAcceso", tokenAcceso)
            if (tokenAccesoSubsidiado) params.set("tokenAccesoSubsidiado", tokenAccesoSubsidiado)
            if (tokenAccesoContributivo) params.set("tokenAccesoContributivo", tokenAccesoContributivo)

            const response = await fetch(`/api/mipres/direccionamiento?${params.toString()}`)
            const result = await response.json()

            const direccionamientos = toArray(result?.data).filter((d) => !d?.FecAnulacion)

            const byTipo = {
              M: new Set<number>(),
              P: new Set<number>(),
              D: new Set<number>(),
              N: new Set<number>(),
              S: new Set<number>(),
            }

            for (const d of direccionamientos) {
              const tipo = String(d?.TipoTec || "") as keyof typeof byTipo
              const conTec = Number(d?.ConTec || 0)
              if (tipo in byTipo && Number.isFinite(conTec) && conTec > 0) {
                byTipo[tipo].add(conTec)
              }
            }

            return [noPrescripcion, { M: byTipo.M.size, P: byTipo.P.size, D: byTipo.D.size, N: byTipo.N.size, S: byTipo.S.size }] as const
          } catch {
            return [noPrescripcion, { M: 0, P: 0, D: 0, N: 0, S: 0 } as TechCountByTipo] as const
          }
        })
      )

      if (cancelled) return

      setTechCountsByPrescripcion((prev) => {
        const next = { ...prev }
        for (const [prescripcion, counts] of entries) {
          next[prescripcion] = counts
        }
        return next
      })
    }

    fetchTechCounts()
    return () => { cancelled = true }
  }, [displayedGroups, credentials?.nit, credentials?.tokenAcceso, credentials?.tokenAccesoSubsidiado, credentials?.tokenAccesoContributivo])

  useEffect(() => {
    const storedNit = localStorage.getItem("mipres_nit") || ""
    const storedToken = localStorage.getItem("mipres_token") || ""

    let nit = credentials?.nit || storedNit || ""
    let tokenAcceso = credentials?.tokenAcceso || storedToken || ""
    let tokenAccesoSubsidiado = credentials?.tokenAccesoSubsidiado || ""
    let tokenAccesoContributivo = credentials?.tokenAccesoContributivo || ""

    const savedCredentials = secureStorageGetItem("mipres_credentials")
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials)
        nit = nit || parsed?.nit || ""
        tokenAcceso = tokenAcceso || parsed?.tokenAcceso || parsed?.token || ""
        tokenAccesoSubsidiado = tokenAccesoSubsidiado || parsed?.tokenAccesoSubsidiado || ""
        tokenAccesoContributivo = tokenAccesoContributivo || parsed?.tokenAccesoContributivo || ""
      } catch {}
    }

    setDireccionamientoCredentials({
      nit,
      tokenAcceso,
      tokenAccesoSubsidiado: tokenAccesoSubsidiado || undefined,
      tokenAccesoContributivo: tokenAccesoContributivo || undefined,
    })
  }, [credentials?.nit, credentials?.tokenAcceso, credentials?.tokenAccesoSubsidiado, credentials?.tokenAccesoContributivo])

  useEffect(() => { setPage(1) }, [groupedSuministros.length])
  useEffect(() => { setPage(1) }, [filterPrescripcion])
  useEffect(() => { setPage(1) }, [filterUltEntrega])
  useEffect(() => { setPage(1) }, [dateSort])

  const openModal = (group: { noPrescripcion: string; suministros: Suministro[] }) => {
    setSelectedSuministros(group.suministros)
    setSelectedPrescripcion(group.noPrescripcion)
    setModalOpen(true)
    setActiveRow(group.noPrescripcion)
  }

  const openAnularModal = (group: { noPrescripcion: string; suministros: Suministro[] }) => {
    setAnularGroup(group)
    setSelectedPrescripcion(group.noPrescripcion)
    setAnularModalOpen(true)
    setActiveRow(group.noPrescripcion)
  }

  const handleVerDireccionamiento = (group: { noPrescripcion: string; suministros: Suministro[]; latestSuministro?: Suministro }) => {
    const sample = group.latestSuministro || group.suministros[0]
    setSelectedDireccionamientoPrescripcion({
      NoPrescripcion: group.noPrescripcion,
      TipoIDPaciente: sample?.TipoIDPaciente,
      NoIDPaciente: sample?.NoIDPaciente,
    })
    setDireccionamientoOpen(true)
    setActiveRow(group.noPrescripcion)
  }

  const handleVerReporte = async (group: { noPrescripcion: string; suministros: Suministro[] }) => {
    const fallbackReports: ReporteEntrega[] = group.suministros.map((s) => ({
      ID: (s as any).ID ?? 0,
      IDReporteEntrega: (s as any).IDReporteEntrega ?? 0,
      NoPrescripcion: s.NoPrescripcionAsociada ?? "",
      TipoTec: s.TipoTec ?? "",
      ConTec: s.ConTecAsociada ?? 0,
      TipoIDPaciente: s.TipoIDPaciente ?? "",
      NoIDPaciente: s.NoIDPaciente ?? "",
      NoEntrega: s.NoEntrega ?? 0,
      EstadoEntrega: s.EstadoEntrega ?? 1,
      CausaNoEntrega: (s as any).CausaNoEntrega ?? null,
      ValorEntregado: Number((s as any).ValorEntregado) || 0,
      CodTecEntregado: String(
        (s as any).CodTecEntregado ??
        (s as any).CodSerTecAEntregar ??
        (s as any).CodTecnologiaEntregada ??
        (s as any).CodTec ??
        ""
      ).trim(),
      CantTotEntregada: s.CantTotEntregada ?? "",
      NoLote: s.NoLote ?? null,
      FecEntrega: s.FecEntrega ?? s.FecSuministro ?? "",
      FecRepEntrega: s.FecEntrega ?? s.FecSuministro ?? "",
      EstRepEntrega: (s as any).EstRepEntrega ?? 1,
      FecAnulacion: s.FecAnulacion ?? null,
      tipoRegimen: (s as any).tipoRegimen,
    }))

    let reportsToShow = fallbackReports

    try {
      const nit = direccionamientoCredentials?.nit || ""
      const tokenCandidates = [
        direccionamientoCredentials?.tokenAcceso,
        direccionamientoCredentials?.tokenAccesoSubsidiado,
        direccionamientoCredentials?.tokenAccesoContributivo,
      ].filter((token, index, arr) => !!token && arr.indexOf(token) === index) as string[]

      if (nit && tokenCandidates.length > 0) {
        for (const tokenAcceso of tokenCandidates) {
          const params = new URLSearchParams({
            nit,
            tipo: "prescripcion",
            noPrescripcion: group.noPrescripcion,
            tokenAcceso,
          })

          const response = await fetch(`/api/mipres/reporte-entrega?${params.toString()}`)
          const result = await response.json()

          if (!response.ok || !result?.success) continue

          const apiData = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : []
          if (apiData.length === 0) continue

          reportsToShow = apiData.map((r: any) => ({
            ID: r?.ID ?? 0,
            IDReporteEntrega: r?.IDReporteEntrega ?? 0,
            NoPrescripcion: r?.NoPrescripcion ?? group.noPrescripcion,
            TipoTec: r?.TipoTec ?? "",
            ConTec: r?.ConTec ?? 0,
            TipoIDPaciente: r?.TipoIDPaciente ?? "",
            NoIDPaciente: r?.NoIDPaciente ?? "",
            NoEntrega: r?.NoEntrega ?? 0,
            EstadoEntrega: r?.EstadoEntrega ?? 1,
            CausaNoEntrega: r?.CausaNoEntrega ?? null,
            ValorEntregado: Number(r?.ValorEntregado) || 0,
            CodTecEntregado: String(
              r?.CodTecEntregado ??
              r?.CodSerTecAEntregar ??
              r?.CodTecnologiaEntregada ??
              r?.CodTec ??
              ""
            ).trim(),
            CantTotEntregada: r?.CantTotEntregada ?? "",
            NoLote: r?.NoLote ?? null,
            FecEntrega: r?.FecEntrega ?? "",
            FecRepEntrega: r?.FecRepEntrega ?? "",
            EstRepEntrega: r?.EstRepEntrega ?? 1,
            FecAnulacion: r?.FecAnulacion ?? null,
            tipoRegimen: r?.tipoRegimen,
          }))
          break
        }
      }
    } catch {
      // use fallback
    }

    const dedupMap = new Map<string, ReporteEntrega>()
    for (const reporte of reportsToShow) {
      const key = `${String(reporte.IDReporteEntrega ?? "")}-${String(reporte.TipoTec ?? "")}-${Number(reporte.ConTec ?? 0)}-${Number(reporte.NoEntrega ?? 0)}`
      dedupMap.set(key, reporte)
    }

    setSelectedReportesForModal(Array.from(dedupMap.values()))
    setSelectedPrescripcion(group.noPrescripcion)
    setReportesModalOpen(true)
    setActiveRow(group.noPrescripcion)
  }

  if (!suministros || suministros.length === 0) {
    if (loading) {
      return (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-3 animate-pulse">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-muted-foreground">Cargando suministros...</p>
          </div>
        </Card>
      )
    }
    return (
      <Card className="border-dashed">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">No se encontraron suministros</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Intenta con otros criterios de búsqueda</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">

      {/* Tabla: solo visible cuando no hay vista abierta */}
      {!anyViewOpen && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Suministros</h3>
              <Badge variant="secondary" className="text-xs">{filteredTotal}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={filterPrescripcion}
                onChange={(e) => setFilterPrescripcion(e.target.value)}
                placeholder="Filtrar por prescripción"
                className="h-8 px-3 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ width: 220 }}
              />
              {filterPrescripcion && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilterPrescripcion("")}>
                  <Hash className="h-4 w-4" />
                </Button>
              )}
              <select
                value={filterUltEntrega}
                onChange={(e) => setFilterUltEntrega(e.target.value as "all" | "with_last_delivery")}
                className="h-8 px-2 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ width: 180 }}
              >
                <option value="all">Todos</option>
                <option value="with_last_delivery">Con última entrega</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden gap-0 py-0">
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4 pl-8">
                      <div className="flex items-center gap-1.5 justify-start">
                        <FileText className="h-3 w-3" />
                        Prescripción
                      </div>
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Package className="h-3 w-3" />
                        Suministros
                      </div>
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">Tecnologías</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">Estado Último</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setDateSort(dateSort === "none" ? "desc" : dateSort === "desc" ? "asc" : "none")}
                        className="flex items-center justify-center gap-1.5 w-full hover:text-foreground transition-colors cursor-pointer"
                      >
                        Fecha Suministro
                        {dateSort === "none" && <ArrowUpDown className="h-3 w-3" />}
                        {dateSort === "asc" && <ArrowUp className="h-3 w-3" />}
                        {dateSort === "desc" && <ArrowDown className="h-3 w-3" />}
                      </button>
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-justify">
                  {displayedGroups.map((group) => {
                    const techCount = techCountsByPrescripcion[group.noPrescripcion] || { M: 0, P: 0, D: 0, N: 0, S: 0 }
                    const isActive = activeRow === group.noPrescripcion
                    return (
                      <tr key={group.noPrescripcion} className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}>
                        <td className="px-4 py-2.5 text-left align-middle">
                          <span className="font-mono text-xs font-medium text-primary pl-4">
                            {group.noPrescripcion}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="secondary" className="text-[10px] h-5 px-2">
                            {group.count} {group.count === 1 ? "Registro" : "Registros"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex gap-0.5 justify-center whitespace-nowrap">
                            <CategoryBadge icon={Pill} label="Med" count={techCount.M} colorClass="bg-emerald-100 text-emerald-700" />
                            <CategoryBadge icon={Stethoscope} label="Proc" count={techCount.P} colorClass="bg-sky-100 text-sky-700" />
                            <CategoryBadge icon={Package} label="Disp" count={techCount.D} colorClass="bg-amber-100 text-amber-700" />
                            <CategoryBadge icon={Sparkles} label="Nutr" count={techCount.N} colorClass="bg-rose-100 text-rose-700" />
                            <CategoryBadge icon={Activity} label="Serv" count={techCount.S} colorClass="bg-violet-100 text-violet-700" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={`h-5 px-2 text-[10px] ${
                              group.latestSuministro?.EntregaCompleta === 1
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {group.latestSuministro?.EntregaCompleta === 1 ? "Completa" : "Parcial"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs text-muted-foreground font-mono">
                            {group.latestSuministro?.FecSuministro || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="group relative h-7 w-7"
                              onClick={() => handleVerDireccionamiento(group)}
                              title="Ver direccionamiento"
                            >
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                Ver direccionamiento
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="group relative h-7 w-7"
                              onClick={() => handleVerReporte(group)}
                              title="Ver reporte"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" />
                              <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                Ver reporte
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="group relative h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => openModal(group)}
                              title="Ver suministro"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                Ver suministro
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="group relative h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openAnularModal(group)}
                              title="Anular"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                Anular
                              </span>
                            </Button>
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
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="h-8 px-2 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ width: 60 }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium min-w-[50px] text-center">
              {page} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pageCount}
              onClick={() => setPage(Math.min(pageCount, page + 1))}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Vistas inline — fuera del bloque !anyViewOpen */}

      <SuministroLecturaModal
        suministros={selectedSuministros}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSuministroViewOpen(false) }}
        noPrescripcion={selectedPrescripcion}
        onFormVisibilityChange={setSuministroViewOpen}
        onRefresh={onRefresh}
      />

      <ReporteEntregaLecturaModal
        reportes={selectedReportesForModal}
        open={reportesModalOpen}
        onClose={() => { setReportesModalOpen(false); setReporteViewOpen(false) }}
        noPrescripcion={selectedPrescripcion}
        forceShowCausaNoEntrega={true}
        onFormVisibilityChange={setReporteViewOpen}
      />

      {selectedDireccionamientoPrescripcion && (
        <DireccionamientoLecturaModal
          prescripcion={selectedDireccionamientoPrescripcion}
          open={direccionamientoOpen}
          onClose={() => {
            setDireccionamientoOpen(false)
            setDirViewOpen(false)
            setSelectedDireccionamientoPrescripcion(null)
          }}
          credentials={direccionamientoCredentials}
          tipo="prescripcion"
          hideAnuladosOnLoad={true}
          onFormVisibilityChange={setDirViewOpen}
        />
      )}

      {anularGroup && (
        <SuministroAnularModal
          open={anularModalOpen}
          onClose={() => { setAnularModalOpen(false); setAnularViewOpen(false) }}
          suministros={anularGroup.suministros}
          noPrescripcion={anularGroup.noPrescripcion}
          credentials={credentials || { nit: "" }}
          onRefresh={onRefresh}
          onFormVisibilityChange={setAnularViewOpen}
        />
      )}

    </div>
  )
}
