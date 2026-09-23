"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CalendarClock,
  Package,
  ArrowLeft,
  ArrowRight,
  FileText,
  Eye,
  Hash,
  Pill,
  Stethoscope,
  Sparkles,
  Activity,
} from "lucide-react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Programacion } from "@/models/mipres-sispro/programacion/programacion"
import type { MipresCredentials } from "@/models/credentials.model"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento/direccionamiento"
import {
  ProgramacionLecturaModal,
  getEstadoProgramacionClass,
  getEstadoProgramacionLabel,
} from "./ProgramacionLecturaView"
import { DireccionamientoLecturaModal } from "@/components/mipres/component-direccionamiento/DireccionamientoLecturaView"
import { CategoryBadge } from "@/components/mipres/component-prescripcion/CategoryBadge"
import { secureStorageGetItem } from "@/lib/secure-storage"

interface ProgramacionTableProps {
  programaciones: Programacion[]
  loading?: boolean
  credentials?: MipresCredentials
  onFormVisibilityChange?: (open: boolean) => void
}

type TechCountByTipo = { M: number; P: number; D: number; N: number; S: number }
type EstadoFilter = "all" | "0" | "1" | "2"

interface ProgramacionGroup {
  noPrescripcion: string
  programaciones: Programacion[]
  latestProgramacion?: Programacion
  count: number
}

function readStoredCredentials(credentials?: MipresCredentials) {
  let nit = credentials?.nit || ""
  let tokenAcceso = credentials?.tokenAcceso || ""
  let tokenAccesoSubsidiado = credentials?.tokenAccesoSubsidiado || ""
  let tokenAccesoContributivo = credentials?.tokenAccesoContributivo || ""

  if (!nit) nit = localStorage.getItem("mipres_nit") || ""
  if (!tokenAcceso) tokenAcceso = localStorage.getItem("mipres_token") || ""

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

export function ProgramacionTable({ programaciones, loading, credentials, onFormVisibilityChange }: ProgramacionTableProps) {
  const [page, setPage] = useState(1)
  const [selectedProgramaciones, setSelectedProgramaciones] = useState<Programacion[]>([])
  const [selectedPrescripcion, setSelectedPrescripcion] = useState<string>("")

  // View open states
  const [programacionViewOpen, setProgramacionViewOpen] = useState(false)
  const [dirViewOpen, setDirViewOpen] = useState(false)

  // Data for each view
  const [modalOpen, setModalOpen] = useState(false)
  const [direccionamientoOpen, setDireccionamientoOpen] = useState(false)
  const [selectedDireccionamientoPrescripcion, setSelectedDireccionamientoPrescripcion] = useState<any>(null)
  const [direccionamientoCredentials, setDireccionamientoCredentials] = useState<MipresCredentials>({
    nit: "",
    tokenAcceso: "",
  })

  const [pageSize, setPageSize] = useState<number>(10)
  const [activeRow, setActiveRow] = useState<string | null>(null)
  const [filterPrescripcion, setFilterPrescripcion] = useState<string>("")
  const [filterEstado, setFilterEstado] = useState<EstadoFilter>("all")
  const [dateSort, setDateSort] = useState<"none" | "asc" | "desc">("none")
  const [techCountsByPrescripcion, setTechCountsByPrescripcion] = useState<Record<string, TechCountByTipo>>({})

  const anyViewOpen = programacionViewOpen || dirViewOpen

  useEffect(() => {
    onFormVisibilityChange?.(anyViewOpen)
  }, [anyViewOpen, onFormVisibilityChange])

  const parseDateTime = (value?: string | null) => {
    if (!value) return 0
    const normalized = value.includes(" ") ? value.replace(" ", "T") : value
    const ts = new Date(normalized).getTime()
    return Number.isFinite(ts) ? ts : 0
  }

  const groupedProgramaciones = useMemo<ProgramacionGroup[]>(() => {
    if (!programaciones) return []

    const groups = new Map<string, Programacion[]>()

    for (const prog of programaciones) {
      const key = String(prog?.NoPrescripcion ?? "").trim()
      if (!key) continue
      const current = groups.get(key) ?? []
      current.push(prog)
      groups.set(key, current)
    }

    const result = Array.from(groups.entries()).map(([noPrescripcion, group]) => {
      const sorted = [...group].sort((a, b) => (b.ID || 0) - (a.ID || 0))
      return {
        noPrescripcion,
        programaciones: sorted,
        latestProgramacion: sorted[0],
        count: sorted.length,
      }
    })

    if (dateSort === "none") {
      return result.sort((a, b) => (b.latestProgramacion?.ID || 0) - (a.latestProgramacion?.ID || 0))
    }

    return [...result].sort((a, b) => {
      const dateA = parseDateTime(a.latestProgramacion?.FecProgramacion)
      const dateB = parseDateTime(b.latestProgramacion?.FecProgramacion)
      return dateSort === "asc" ? dateA - dateB : dateB - dateA
    })
  }, [programaciones, dateSort])

  const filteredGroups = useMemo(() => {
    const q = String(filterPrescripcion || "").trim().toLowerCase()
    return groupedProgramaciones.filter((g) => {
      const matchesPrescripcion = !q || String(g.noPrescripcion || "").toLowerCase().includes(q)
      if (!matchesPrescripcion) return false

      if (filterEstado !== "all") {
        return g.programaciones.some((p) => String(p.EstProgramacion ?? "") === filterEstado)
      }

      return true
    })
  }, [groupedProgramaciones, filterPrescripcion, filterEstado])

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

    const fetchTechCounts = async () => {
      const { nit, tokenAcceso, tokenAccesoSubsidiado, tokenAccesoContributivo } = readStoredCredentials(credentials)

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
    const { nit, tokenAcceso, tokenAccesoSubsidiado, tokenAccesoContributivo } = readStoredCredentials(credentials)

    setDireccionamientoCredentials({
      nit,
      tokenAcceso,
      tokenAccesoSubsidiado: tokenAccesoSubsidiado || undefined,
      tokenAccesoContributivo: tokenAccesoContributivo || undefined,
    })
  }, [credentials?.nit, credentials?.tokenAcceso, credentials?.tokenAccesoSubsidiado, credentials?.tokenAccesoContributivo])

  useEffect(() => { setPage(1) }, [groupedProgramaciones.length, filterPrescripcion, filterEstado, dateSort])

  const openModal = (group: ProgramacionGroup) => {
    setSelectedProgramaciones(group.programaciones)
    setSelectedPrescripcion(group.noPrescripcion)
    setModalOpen(true)
    setActiveRow(group.noPrescripcion)
  }

  const handleVerDireccionamiento = (group: ProgramacionGroup) => {
    const sample = group.latestProgramacion || group.programaciones[0]
    setSelectedDireccionamientoPrescripcion({
      NoPrescripcion: group.noPrescripcion,
      TipoIDPaciente: sample?.TipoIDPaciente,
      NoIDPaciente: sample?.NoIDPaciente,
    })
    setDireccionamientoOpen(true)
    setActiveRow(group.noPrescripcion)
  }

  if (!programaciones || programaciones.length === 0) {
    return (
      <Card className="border-dashed">
        <div className="flex flex-col items-center justify-center py-12">
          <div className={`rounded-full bg-muted p-3 mb-3${loading ? " animate-pulse" : ""}`}>
            <CalendarClock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">
            {loading ? "Cargando programaciones..." : "No se encontraron programaciones"}
          </p>
          {!loading && (
            <p className="text-sm text-muted-foreground/70 mt-1">Intenta con otros criterios de búsqueda</p>
          )}
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
              <CalendarClock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Programaciones</h3>
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
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as EstadoFilter)}
                className="h-8 px-2 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ width: 180 }}
              >
                <option value="all">Todos los estados</option>
                <option value="1">Activo</option>
                <option value="2">Procesado</option>
                <option value="0">Anulado</option>
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
                        <CalendarClock className="h-3 w-3" />
                        Programaciones
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
                        Fecha Programación
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
                    const estado = group.latestProgramacion?.EstProgramacion
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
                          <Badge variant="outline" className={`h-5 px-2 text-[10px] ${getEstadoProgramacionClass(estado)}`}>
                            {getEstadoProgramacionLabel(estado)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs text-muted-foreground font-mono">
                            {group.latestProgramacion?.FecProgramacion || "N/A"}
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
                              className="group relative h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => openModal(group)}
                              title="Ver programación"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                Ver programación
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

      <ProgramacionLecturaModal
        programaciones={selectedProgramaciones}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setProgramacionViewOpen(false) }}
        noPrescripcion={selectedPrescripcion}
        onFormVisibilityChange={setProgramacionViewOpen}
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

    </div>
  )
}
