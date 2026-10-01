"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Truck,
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
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Entrega } from "@/models/mipres-sispro/entrega/entrega"
import type { MipresCredentials } from "@/models/credentials.model"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento/direccionamiento"
import {
  EntregaLecturaModal,
  getEstadoEntregaClass,
  getEstadoEntregaLabel,
} from "./EntregaLecturaView"
import { DireccionamientoLecturaModal } from "@/components/mipres/component-direccionamiento/DireccionamientoLecturaView"
import { CategoryBadge } from "@/components/mipres/component-prescripcion/CategoryBadge"
import { secureStorageGetItem } from "@/lib/secure-storage"

interface EntregaTableProps {
  entregas: Entrega[]
  loading?: boolean
  credentials?: MipresCredentials
  onFormVisibilityChange?: (open: boolean) => void
}

type TechCountByTipo = { M: number; P: number; D: number; N: number; S: number }
type EstadoFilter = "all" | "0" | "1" | "2"

interface EntregaGroup {
  noPrescripcion: string
  entregas: Entrega[]
  latestEntrega?: Entrega
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

export function EntregaTable({ entregas, loading, credentials, onFormVisibilityChange }: EntregaTableProps) {
  const [page, setPage] = useState(1)
  const [selectedEntregas, setSelectedEntregas] = useState<Entrega[]>([])
  const [selectedPrescripcion, setSelectedPrescripcion] = useState<string>("")

  // View open states
  const [entregaViewOpen, setEntregaViewOpen] = useState(false)
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

  const anyViewOpen = entregaViewOpen || dirViewOpen

  useEffect(() => {
    onFormVisibilityChange?.(anyViewOpen)
  }, [anyViewOpen, onFormVisibilityChange])

  const parseDateTime = (value?: string | null) => {
    if (!value) return 0
    const normalized = value.includes(" ") ? value.replace(" ", "T") : value
    const ts = new Date(normalized).getTime()
    return Number.isFinite(ts) ? ts : 0
  }

  const groupedEntregas = useMemo<EntregaGroup[]>(() => {
    if (!entregas) return []

    const groups = new Map<string, Entrega[]>()

    for (const prog of entregas) {
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
        entregas: sorted,
        latestEntrega: sorted[0],
        count: sorted.length,
      }
    })

    if (dateSort === "none") {
      return result.sort((a, b) => (b.latestEntrega?.ID || 0) - (a.latestEntrega?.ID || 0))
    }

    return [...result].sort((a, b) => {
      const dateA = parseDateTime(a.latestEntrega?.FecEntrega)
      const dateB = parseDateTime(b.latestEntrega?.FecEntrega)
      return dateSort === "asc" ? dateA - dateB : dateB - dateA
    })
  }, [entregas, dateSort])

  const filteredGroups = useMemo(() => {
    const q = String(filterPrescripcion || "").trim().toLowerCase()
    return groupedEntregas.filter((g) => {
      const matchesPrescripcion = !q || String(g.noPrescripcion || "").toLowerCase().includes(q)
      if (!matchesPrescripcion) return false

      if (filterEstado !== "all") {
        return g.entregas.some((p) => String(p.EstEntrega ?? "") === filterEstado)
      }

      return true
    })
  }, [groupedEntregas, filterPrescripcion, filterEstado])

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

  useEffect(() => { setPage(1) }, [groupedEntregas.length, filterPrescripcion, filterEstado, dateSort])

  const openModal = (group: EntregaGroup) => {
    setSelectedEntregas(group.entregas)
    setSelectedPrescripcion(group.noPrescripcion)
    setModalOpen(true)
    setActiveRow(group.noPrescripcion)
  }

  const handleVerDireccionamiento = (group: EntregaGroup) => {
    const sample = group.latestEntrega || group.entregas[0]
    setSelectedDireccionamientoPrescripcion({
      NoPrescripcion: group.noPrescripcion,
      TipoIDPaciente: sample?.TipoIDPaciente,
      NoIDPaciente: sample?.NoIDPaciente,
    })
    setDireccionamientoOpen(true)
    setActiveRow(group.noPrescripcion)
  }

  if (!entregas || entregas.length === 0) {
    return (
      <Card className="border-dashed">
        <div className="flex flex-col items-center justify-center py-12">
          <div className={`rounded-full bg-muted p-3 mb-3${loading ? " animate-pulse" : ""}`}>
            <Truck className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">
            {loading ? "Cargando entregas..." : "No se encontraron entregas"}
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
              <Truck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Entregas</h3>
              <Badge variant="secondary" className="text-xs">{filteredTotal}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-[210px] group">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  placeholder="Buscar N° prescripción..."
                  value={filterPrescripcion}
                  onChange={(e) => setFilterPrescripcion(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-white dark:bg-card pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/70 shadow-2xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground/40"
                />
                {filterPrescripcion && (
                  <button
                    type="button"
                    onClick={() => setFilterPrescripcion("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              <Select
                value={filterEstado}
                onValueChange={(val: any) => setFilterEstado(val as EstadoFilter)}
              >
                <SelectTrigger className="w-[155px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Estado: Todos</SelectItem>
                  <SelectItem value="1">Activo</SelectItem>
                  <SelectItem value="2">Procesado</SelectItem>
                  <SelectItem value="0">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="overflow-hidden gap-0 py-0 rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-xs">
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/20 bg-primary text-white whitespace-nowrap">
                    <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <Hash className="h-3.5 w-3.5 text-white shrink-0" />
                        <span>No. Prescripción</span>
                      </div>
                    </th>
                    <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <Truck className="h-3.5 w-3.5 text-white shrink-0" />
                        <span>Entregas</span>
                      </div>
                    </th>
                    <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">Tecnologías</th>
                    <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">Estado Último</th>
                    <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                      <button
                        type="button"
                        onClick={() => setDateSort(dateSort === "none" ? "desc" : dateSort === "desc" ? "asc" : "none")}
                        className="flex items-center justify-center gap-1.5 w-full hover:text-white/80 transition-colors cursor-pointer text-white whitespace-nowrap"
                      >
                        <span>Fecha Entrega</span>
                        {dateSort === "none" && <ArrowUpDown className="h-3.5 w-3.5 text-white/70 shrink-0" />}
                        {dateSort === "asc" && <ArrowUp className="h-3.5 w-3.5 text-white shrink-0" />}
                        {dateSort === "desc" && <ArrowDown className="h-3.5 w-3.5 text-white shrink-0" />}
                      </button>
                    </th>
                    <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap w-24 sm:w-28">
                      <span>Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 dark:divide-border/40">
                  {displayedGroups.map((group) => {
                    const techCount = techCountsByPrescripcion[group.noPrescripcion] || { M: 0, P: 0, D: 0, N: 0, S: 0 }
                    const isActive = activeRow === group.noPrescripcion
                    const estado = group.latestEntrega?.EstEntrega
                    return (
                      <tr key={group.noPrescripcion} className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}>
                        <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center">
                          <span className="font-mono text-xs font-medium text-primary">
                            {group.noPrescripcion}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                          <Badge variant="secondary" className="text-[10px] h-5 px-2">
                            {group.count} {group.count === 1 ? "Registro" : "Registros"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center hidden xl:table-cell">
                          <div className="flex gap-0.5 justify-center whitespace-nowrap">
                            <CategoryBadge icon={Pill} label="Med" count={techCount.M} colorClass="bg-emerald-100 text-emerald-700" />
                            <CategoryBadge icon={Stethoscope} label="Proc" count={techCount.P} colorClass="bg-sky-100 text-sky-700" />
                            <CategoryBadge icon={Package} label="Disp" count={techCount.D} colorClass="bg-amber-100 text-amber-700" />
                            <CategoryBadge icon={Sparkles} label="Nutr" count={techCount.N} colorClass="bg-rose-100 text-rose-700" />
                            <CategoryBadge icon={Activity} label="Serv" count={techCount.S} colorClass="bg-violet-100 text-violet-700" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                          <Badge variant="outline" className={`h-5 px-2 text-[10px] ${getEstadoEntregaClass(estado)}`}>
                            {getEstadoEntregaLabel(estado)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground font-mono">
                            {group.latestEntrega?.FecEntrega || "N/A"}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center align-middle">
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
                              title="Ver entrega"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                Ver entrega
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border/80 dark:border-border/60 bg-white/70 dark:bg-card/75 backdrop-blur-xl shadow-2xs">
            {/* Info summary */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Mostrando</span>
              <span className="font-semibold text-foreground">
                {filteredTotal === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredTotal)}
              </span>
              <span>de</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-[11px] tabular-nums">
                {filteredTotal}
              </span>
              <span>registros</span>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Filas:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[68px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  title="Primera página"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
                  disabled={page <= 1}
                  onClick={() => setPage(Math.max(1, page - 1))}
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="px-2.5 h-8 flex items-center justify-center rounded-lg border border-border/80 bg-white dark:bg-card text-xs font-semibold tabular-nums text-foreground shadow-2xs">
                  <span className="text-primary">{page}</span>
                  <span className="mx-1 text-muted-foreground/60">/</span>
                  <span className="text-muted-foreground">{pageCount}</span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
                  disabled={page >= pageCount}
                  onClick={() => setPage(Math.min(pageCount, page + 1))}
                  title="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
                  disabled={page >= pageCount}
                  onClick={() => setPage(pageCount)}
                  title="Última página"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Vistas inline — fuera del bloque !anyViewOpen */}

      <EntregaLecturaModal
        entregas={selectedEntregas}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEntregaViewOpen(false) }}
        noPrescripcion={selectedPrescripcion}
        onFormVisibilityChange={setEntregaViewOpen}
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
