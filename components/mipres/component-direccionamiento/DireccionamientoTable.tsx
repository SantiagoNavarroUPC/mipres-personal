"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CategoryBadge } from "@/components/mipres/component-prescripcion/CategoryBadge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DireccionamientoModalAnular } from "./DireccionamientoViewAnular"
import { ProgramacionViewForm, getEstadoProgramacion } from "../component-programacion/ProgramacionViewForm"
import { ProgramacionLecturaModal } from "../component-programacion/ProgramacionLecturaView"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, X, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Pill, Stethoscope, Package as PackageIcon, Sparkles, Activity, Hash, Layers3, ShieldCheck, CalendarClock, Search, Boxes, Shield, Copy, Compass, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento"
import type { Programacion } from "@/models/mipres-sispro/programacion/programacion"
import type { MipresCredentials } from "@/models/credentials.model"
import { useEmpresaActual } from "@/lib/use-empresa-actual"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"

interface DireccionamientoTableProps {
  results: Direccionamiento[]
  credentials: MipresCredentials
  onView: (item: Direccionamiento) => void
  onAnularSuccess?: () => void
  onFormVisibilityChange?: (open: boolean) => void
}

function formatFechaDireccionamiento(value?: string) {
  if (!value) return { fecha: "-", hora: "-" }

  const [fechaParte, horaParte] = String(value).split("T")
  if (!horaParte) return { fecha: fechaParte, hora: "-" }

  return {
    fecha: fechaParte,
    hora: horaParte.split(".")[0] || "-",
  }
}

// Semáforo del grupo (mismo patrón que Prescripción): gris = sin programar,
// ámbar = parcial, verde = todo programado.
function getSemaforoProgramacion(programados: number, pendientes: number) {
  if (pendientes === 0) return { dot: "bg-emerald-500", title: "Programado - Clic para ver detalles" }
  if (programados === 0) return { dot: "bg-gray-400", title: "Sin programar - Clic para programar" }
  return { dot: "bg-amber-500", title: `Programación parcial (${programados}/${programados + pendientes}) - Clic para programar` }
}

export function DireccionamientoTable({
  results,
  credentials,
  onView,
  onAnularSuccess,
  onFormVisibilityChange,
}: DireccionamientoTableProps) {
  const grouped = new Map<string, { items: Direccionamiento[]; total: number; last: Direccionamiento }>()

  results.forEach((item) => {
    const key = `${item.NoPrescripcion || "SIN-PRESCRIPCION"}|${item.tipoRegimen || "SinRegimen"}`
    const existing = grouped.get(key)
    if (existing) {
      existing.items.push(item)
      existing.total = existing.items.length
      existing.last = item
      grouped.set(key, existing)
    } else {
      grouped.set(key, { items: [item], total: 1, last: item })
    }
  })

  const rows = Array.from(grouped.entries()).map(([key, data]) => {
    const [noPrescripcion, tipoRegimen] = key.split("|")

    const byTipo: Record<string, Set<number>> = {
      M: new Set(),
      P: new Set(),
      D: new Set(),
      N: new Set(),
      S: new Set(),
    }

    const entregaCounts = new Map<string, number>()
    const duplicateDeliveries = new Set<string>()

    for (const d of data.items) {
      if (d?.FecAnulacion) continue
      const tipo = String(d?.TipoTec || "") as keyof typeof byTipo
      const con = Number(d?.ConTec || 0)
      const entrega = Number(d?.NoEntrega || 0)

      if (tipo && byTipo[tipo] !== undefined && con > 0) {
        byTipo[tipo].add(con)
      }

      // Detectar duplicados entre direccionamientos vigentes:
      // combinacion TipoTec + ConTec + NoEntrega + NoSubEntrega debe ser unica.
      // IMPORTANTE: Los items con FecAnulacion ya se filtraron arriba (if (d?.FecAnulacion) continue)
      if (entrega > 0) {
        const subEntrega = Number(d?.NoSubEntrega || 0)
        const key = `${tipo}-${con}-${entrega}-${subEntrega}`
        const currentCount = entregaCounts.get(key) || 0
        entregaCounts.set(key, currentCount + 1)
      }
    }

    for (const [key, count] of entregaCounts.entries()) {
      if (count > 1) {
        const [tipo, con, entrega, subEntrega] = key.split("-")
        const subText = Number(subEntrega) > 0 ? `.${subEntrega}` : ""
        duplicateDeliveries.add(`${tipo}${con}-${entrega}${subText} x${count}`)
      }
    }

    const hasDuplicatesFromBackend = data.items.some((d: any) => d?.esDuplicado === true)
    const hasDuplicates = hasDuplicatesFromBackend || duplicateDeliveries.size > 0

    const programacion = { programados: 0, pendientes: 0 }
    for (const d of data.items) {
      const estado = getEstadoProgramacion(d)
      if (estado === "programado") programacion.programados++
      else if (estado === "pendiente") programacion.pendientes++
    }

    const techCounts = {
      M: byTipo.M.size,
      P: byTipo.P.size,
      D: byTipo.D.size,
      N: byTipo.N.size,
      S: byTipo.S.size,
    }

    return {
      noPrescripcion,
      tipoRegimen,
      fechaFinal: data.last.FecDireccionamiento,
      total: data.total,
      last: data.last,
      items: data.items,
      programacion,
      techCounts,
      hasDuplicates,
      duplicateDeliveries: Array.from(duplicateDeliveries).sort(),
    }
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [anularModalOpen, setAnularModalOpen] = useState(false)
  const [selectedItemsForAnular, setSelectedItemsForAnular] = useState<Direccionamiento[]>([])
  const [programarViewOpen, setProgramarViewOpen] = useState(false)
  const [selectedItemsForProgramar, setSelectedItemsForProgramar] = useState<Direccionamiento[]>([])
  const [lecturaViewOpen, setLecturaViewOpen] = useState(false)
  const [lecturaProgramaciones, setLecturaProgramaciones] = useState<Programacion[]>([])
  const [lecturaNoPrescripcion, setLecturaNoPrescripcion] = useState("")
  const [loadingProgPresc, setLoadingProgPresc] = useState<string | null>(null)
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false)
  const { puedeProgramar: mostrarProgramacion } = useEmpresaActual()
  const { fetchProgramaciones } = useMipresQueryClient()

  const isAnyProgramacionViewOpen = programarViewOpen || lecturaViewOpen
  useEffect(() => {
    onFormVisibilityChange?.(isAnyProgramacionViewOpen)
  }, [isAnyProgramacionViewOpen, onFormVisibilityChange])

  const [searchPrescripcion, setSearchPrescripcion] = useState("")
  const [filterTipoTec, setFilterTipoTec] = useState("todos")
  const [regimenFilter, setRegimenFilter] = useState<"todos" | "Contributivo" | "Subsidiado">("todos")
  const [dateSort, setDateSort] = useState<"none" | "asc" | "desc">("none")
  const [activeRow, setActiveRow] = useState<string | null>(null)

  const total = rows.length

  const filteredRows = useMemo(() => {
    let filtered = [...rows]

    // Filtrar por duplicados
    if (showDuplicatesOnly) {
      filtered = filtered.filter((row) => row.hasDuplicates)
    }

    // Filtrar por número de prescripción
    if (searchPrescripcion.trim()) {
      filtered = filtered.filter((row) =>
        row.noPrescripcion?.toLowerCase().includes(searchPrescripcion.toLowerCase())
      )
    }

    // Filtrar por tipo de tecnología (usando techCounts)
    if (filterTipoTec !== "todos") {
      filtered = filtered.filter((row) => (row as any).techCounts?.[filterTipoTec] > 0)
    }

    // Filtrar por régimen
    if (regimenFilter !== "todos") {
      filtered = filtered.filter((row) => row.tipoRegimen === regimenFilter)
    }

    // Ordenar por fecha de direccionamiento
    if (dateSort !== "none") {
      const dateCopy = [...filtered]
      dateCopy.sort((a, b) => {
        const dateA = new Date(a.fechaFinal || "").getTime()
        const dateB = new Date(b.fechaFinal || "").getTime()

        if (dateSort === "asc") {
          return dateA - dateB
        } else {
          return dateB - dateA
        }
      })
      return dateCopy
    }

    return filtered
  }, [rows, searchPrescripcion, filterTipoTec, regimenFilter, dateSort, showDuplicatesOnly])

  const filteredTotal = filteredRows.length
  const filteredPageCount = Math.max(1, Math.ceil(filteredTotal / pageSize))

  const displayed = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const handleAnularClick = (noPrescripcion: string, tipoRegimen?: string) => {
    // Filtrar los items vigentes para anular
    const items = results.filter((item) => {
      const samePresc = item.NoPrescripcion === noPrescripcion
      const sameRegimen = tipoRegimen
        ? item.tipoRegimen === tipoRegimen
        : true
      return samePresc && sameRegimen && !item.FecAnulacion
    })
    
    setSelectedItemsForAnular(items)
    setAnularModalOpen(true)
  }

  const handleSemaforoClick = async (row: (typeof rows)[0]) => {
    setActiveRow(`${row.noPrescripcion}|${row.tipoRegimen || "SinRegimen"}`)
    const isVerde = row.programacion.pendientes === 0 && row.programacion.programados > 0

    if (isVerde) {
      setLoadingProgPresc(row.noPrescripcion)
      try {
        const progs = await fetchProgramaciones(credentials, "prescripcion", {
          noPrescripcion: row.noPrescripcion,
        })

        if (progs && progs.length > 0) {
          setLecturaProgramaciones(progs)
          setLecturaNoPrescripcion(row.noPrescripcion)
          setLecturaViewOpen(true)
          return
        }
      } catch (err) {
        console.warn("fetchProgramaciones falló, intentando construir desde datos de direccionamiento:", err)
      } finally {
        setLoadingProgPresc(null)
      }

      // Fallback con los datos del direccionamiento si la consulta no retornó registros
      const fallbackProgs: Programacion[] = row.items
        .filter((d) => !d.FecAnulacion)
        .map((d: any) => ({
          ID: d.ID || d.IDDireccionamiento || 0,
          IDProgramacion: d.IDProgramacion || d.ID || 0,
          NoPrescripcion: d.NoPrescripcion,
          TipoTec: d.TipoTec,
          ConTec: d.ConTec,
          TipoIDPaciente: d.TipoIDPaciente,
          NoIDPaciente: d.NoIDPaciente,
          NoEntrega: d.NoEntrega,
          FecMaxEnt: d.FecMaxEnt,
          TipoIDSedeProv: d.TipoIDProv || d.TipoIDSedeProv || "NI",
          NoIDSedeProv: d.NoIDProv || d.NoIDSedeProv || "",
          CodSedeProv: d.CodSedeProv || "PROV007189",
          CodSerTecAEntregar: d.CodSerTecAEntregar,
          CantTotAEntregar: d.CantTotAEntregar,
          FecProgramacion: d.FecProgramacion || d.FecDireccionamiento || "",
          EstProgramacion: 2,
          FecAnulacion: d.FecAnulacion || null,
        }))

      if (fallbackProgs.length > 0) {
        setLecturaProgramaciones(fallbackProgs)
        setLecturaNoPrescripcion(row.noPrescripcion)
        setLecturaViewOpen(true)
      } else {
        toast.error("No se encontraron registros de programación para esta prescripción.")
      }
    } else {
      setSelectedItemsForProgramar(row.items)
      setProgramarViewOpen(true)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [results, pageSize, searchPrescripcion, filterTipoTec, regimenFilter, dateSort, showDuplicatesOnly])

  if (lecturaViewOpen) {
    return (
      <ProgramacionLecturaModal
        open={lecturaViewOpen}
        onClose={() => {
          setLecturaViewOpen(false)
          setLecturaProgramaciones([])
          setLecturaNoPrescripcion("")
        }}
        programaciones={lecturaProgramaciones}
        noPrescripcion={lecturaNoPrescripcion}
        onFormVisibilityChange={onFormVisibilityChange}
      />
    )
  }

  if (programarViewOpen && selectedItemsForProgramar.length > 0) {
    return (
      <ProgramacionViewForm
        items={selectedItemsForProgramar}
        credentials={credentials}
        onClose={() => {
          setProgramarViewOpen(false)
          setSelectedItemsForProgramar([])
        }}
        onSuccess={() => {
          onAnularSuccess?.()
        }}
        onFormVisibilityChange={onFormVisibilityChange}
      />
    )
  }

  if (!results || results.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">No hay resultados para mostrar</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Direccionamientos</h3>
          <Badge variant="secondary" className="text-xs">
            {filteredTotal}
          </Badge>
          {regimenFilter !== "todos" && (
            <Badge
              variant="outline"
              className="text-[11px] h-6 px-2 bg-primary/10 border-primary/30 text-primary cursor-pointer gap-1 select-none hover:bg-primary/20"
              onClick={() => setRegimenFilter("todos")}
              title="Quitar filtro de régimen"
            >
              <span>Régimen: {regimenFilter}</span>
              <span className="font-bold text-xs">×</span>
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[190px] group">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Buscar N° prescripción..."
              value={searchPrescripcion}
              onChange={(e) => setSearchPrescripcion(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-white dark:bg-card pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/70 shadow-2xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground/40"
            />
            {searchPrescripcion && (
              <button
                type="button"
                onClick={() => setSearchPrescripcion("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <Select value={filterTipoTec} onValueChange={setFilterTipoTec}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <Boxes className="size-3.5 text-primary shrink-0" />
                <span className="truncate"><SelectValue /></span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tipo: Todos</SelectItem>
              <SelectItem value="M">Tipo: Medicamentos</SelectItem>
              <SelectItem value="P">Tipo: Procedimientos</SelectItem>
              <SelectItem value="D">Tipo: Dispositivos</SelectItem>
              <SelectItem value="N">Tipo: Nutricionales</SelectItem>
              <SelectItem value="S">Tipo: Servicios</SelectItem>
            </SelectContent>
          </Select>

          <label className="text-xs flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-card px-2.5 h-8 rounded-lg border border-input hover:border-primary/50 text-foreground transition-colors shadow-2xs">
            <Copy className="size-3.5 text-primary shrink-0" />
            <input 
              type="checkbox" 
              checked={showDuplicatesOnly}
              onChange={(e) => setShowDuplicatesOnly(e.target.checked)}
              className="accent-primary h-3.5 w-3.5 rounded"
            />
            <span>Solo Duplicados</span>
          </label>
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
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">Tecnologías</th>
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                <button
                  type="button"
                  onClick={() => {
                    setDateSort((prev) => 
                      prev === "none" ? "desc" : prev === "desc" ? "asc" : "none"
                    )
                  }}
                  className="flex items-center justify-center gap-1.5 w-full hover:text-white/80 transition-colors cursor-pointer text-white whitespace-nowrap"
                >
                  <Calendar className="h-3.5 w-3.5 text-white shrink-0" />
                  <span>Fecha de Direccionamiento</span>
                  {dateSort === "none" && <ArrowUpDown className="h-3.5 w-3.5 text-white/70 shrink-0" />}
                  {dateSort === "asc" && <ArrowUp className="h-3.5 w-3.5 text-white shrink-0" />}
                  {dateSort === "desc" && <ArrowDown className="h-3.5 w-3.5 text-white shrink-0" />}
                </button>
              </th>
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden xl:table-cell">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer group text-white whitespace-nowrap ${
                        regimenFilter !== "todos"
                          ? "bg-white/20 font-semibold"
                          : "hover:bg-white/15"
                      }`}
                      title="Filtrar por régimen"
                    >
                      <span>Régimen</span>
                      {regimenFilter !== "todos" && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-white text-primary font-semibold shadow-xs shrink-0 whitespace-nowrap">
                          {regimenFilter}
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRegimenFilter("todos")
                            }}
                            className="ml-0.5 hover:opacity-75 cursor-pointer font-bold"
                            title="Quitar filtro"
                          >
                            ×
                          </span>
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[160px]">
                    <DropdownMenuItem
                      onClick={() => setRegimenFilter("todos")}
                      className={`cursor-pointer ${regimenFilter === "todos" ? "font-semibold bg-accent" : ""}`}
                    >
                      Todos los regímenes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setRegimenFilter("Contributivo")}
                      className={`cursor-pointer ${regimenFilter === "Contributivo" ? "font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-blue-500 mr-2 shrink-0" />
                      Contributivo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setRegimenFilter("Subsidiado")}
                      className={`cursor-pointer ${regimenFilter === "Subsidiado" ? "font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-emerald-500 mr-2 shrink-0" />
                      Subsidiado
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <Layers3 className="h-3.5 w-3.5 text-white shrink-0" />
                  <span>Direccionamientos</span>
                </div>
              </th>
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <ShieldCheck className="h-3.5 w-3.5 text-white shrink-0" />
                  <span>Estado de Anulación</span>
                </div>
              </th>
              {mostrarProgramacion && (
                <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-1 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <CalendarClock className="h-3.5 w-3.5 text-white shrink-0" />
                    <span>Programación</span>
                  </div>
                </th>
              )}
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap w-24 sm:w-28">
                <span>Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 dark:divide-border/40">
            {displayed.map((row, idx) => {
              const rowKey = `${row.noPrescripcion}-${row.tipoRegimen || 'nom'}`
              const isActive = activeRow === rowKey
              const { fecha, hora } = formatFechaDireccionamiento(row.fechaFinal)
              return (
                <tr key={`${row.noPrescripcion}-${idx}`} className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center">
                    <div className="flex flex-col gap-1 items-center justify-center">
                      <span className="font-mono text-xs font-medium text-primary text-center">
                        {row.noPrescripcion}
                      </span>
                      {row.hasDuplicates && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Badge variant="destructive" className="w-fit h-4 px-1 text-[9px] whitespace-nowrap">
                            Duplicados
                          </Badge>
                          {(row as any).duplicateDeliveries?.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="w-fit h-4 px-1 text-[9px] whitespace-nowrap border-red-200 text-red-700 bg-red-50">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {row.tipoRegimen && (
                        <Badge
                          variant="secondary"
                          onClick={() => {
                            setRegimenFilter(row.tipoRegimen === regimenFilter ? "todos" : (row.tipoRegimen as any))
                          }}
                          title={`Filtrar por régimen ${row.tipoRegimen}`}
                          className={`hidden sm:inline-flex xl:hidden text-[9px] h-4.5 px-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all select-none ${
                            row.tipoRegimen === "Contributivo"
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200/80 dark:bg-blue-900/50 dark:text-blue-300"
                              : row.tipoRegimen === "Subsidiado"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200/80 dark:bg-emerald-900/50 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.tipoRegimen}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center hidden xl:table-cell">
                    <div className="flex gap-0.5 justify-center whitespace-nowrap">
                      <CategoryBadge icon={Pill} label="Med" count={(row as any).techCounts?.M || 0} colorClass="bg-emerald-100 text-emerald-700" />
                      <CategoryBadge icon={Stethoscope} label="Proc" count={(row as any).techCounts?.P || 0} colorClass="bg-sky-100 text-sky-700" />
                      <CategoryBadge icon={PackageIcon} label="Disp" count={(row as any).techCounts?.D || 0} colorClass="bg-amber-100 text-amber-700" />
                      <CategoryBadge icon={Sparkles} label="Nutr" count={(row as any).techCounts?.N || 0} colorClass="bg-rose-100 text-rose-700" />
                      <CategoryBadge icon={Activity} label="Serv" count={(row as any).techCounts?.S || 0} colorClass="bg-violet-100 text-violet-700" />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium">{fecha}</div>
                      <div className="text-[10px]">{hora}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center hidden xl:table-cell">
                    <Badge
                      variant="secondary"
                      onClick={() => {
                        if (row.tipoRegimen) {
                          setRegimenFilter(row.tipoRegimen === regimenFilter ? "todos" : row.tipoRegimen as any)
                        }
                      }}
                      title={row.tipoRegimen ? `Filtrar por régimen ${row.tipoRegimen}` : undefined}
                      className={`text-[10px] h-5 cursor-pointer hover:scale-105 active:scale-95 transition-all select-none ${
                        row.tipoRegimen === "Contributivo"
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200/80 dark:bg-blue-900/50 dark:text-blue-300"
                          : row.tipoRegimen === "Subsidiado"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200/80 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.tipoRegimen || "Sin regimen"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    <span className="text-sm font-medium">{row.total}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    <Badge
                      variant={row.last.FecAnulacion ? "destructive" : "default"}
                      className={`text-[10px] h-5 ${row.last.FecAnulacion ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                    >
                      {row.last.FecAnulacion ? "Anulada" : "Vigente"}
                    </Badge>
                  </td>
                  {mostrarProgramacion && (
                    <td className="px-1 sm:px-4 py-1.5 sm:py-2.5 text-center hidden sm:table-cell">
                      {row.programacion.programados + row.programacion.pendientes > 0 ? (
                        (() => {
                          const semaforo = getSemaforoProgramacion(row.programacion.programados, row.programacion.pendientes)
                          const isLoadingThis = loadingProgPresc === row.noPrescripcion
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7 relative"
                                disabled={isLoadingThis}
                                onClick={() => handleSemaforoClick(row)}
                                title={semaforo.title}
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                ) : (
                                  <span className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full ${semaforo.dot}`} />
                                )}
                              </Button>
                            </div>
                          )
                        })()
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-gray-300 dark:bg-zinc-600" title="Sin direccionamientos vigentes" />
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center">
                    <div className="flex items-center justify-center">
                      <div className="flex justify-center items-center gap-1">
                        {mostrarProgramacion && (
                          <div className="sm:hidden flex items-center justify-center">
                            {row.programacion.programados + row.programacion.pendientes > 0 ? (
                              (() => {
                                const semaforo = getSemaforoProgramacion(row.programacion.programados, row.programacion.pendientes)
                                const isLoadingThis = loadingProgPresc === row.noPrescripcion
                                return (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 relative"
                                    disabled={isLoadingThis}
                                    onClick={() => handleSemaforoClick(row)}
                                    title={semaforo.title}
                                  >
                                    {isLoadingThis ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    ) : (
                                      <span className={`h-2.5 w-2.5 rounded-full ${semaforo.dot}`} />
                                    )}
                                  </Button>
                                )
                              })()
                            ) : (
                              <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-zinc-600 inline-block m-2" title="Sin direccionamientos vigentes" />
                            )}
                          </div>
                        )}

                        <div className="relative group">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { onView(row.last); setActiveRow(rowKey); }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                            Ver
                          </span>
                        </div>

                        {!row.last.FecAnulacion && (
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => { handleAnularClick(row.noPrescripcion, row.tipoRegimen); setActiveRow(rowKey); }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Anular
                            </span>
                          </div>
                        )}

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
              <span className="text-muted-foreground">{filteredPageCount}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
              disabled={page >= filteredPageCount}
              onClick={() => setPage(Math.min(filteredPageCount, page + 1))}
              title="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white dark:bg-card border-input hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-2xs"
              disabled={page >= filteredPageCount}
              onClick={() => setPage(filteredPageCount)}
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DireccionamientoModalAnular
        open={anularModalOpen}
        onClose={() => setAnularModalOpen(false)}
        items={selectedItemsForAnular}
        credentials={credentials}
        onSuccess={onAnularSuccess}
      />


    </div>
  )
}
