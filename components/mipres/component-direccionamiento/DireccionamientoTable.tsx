"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CategoryBadge } from "@/components/mipres/component-prescripcion/CategoryBadge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DireccionamientoModalAnular } from "./DireccionamientoViewAnular"
import { DireccionamientoModalProgramar } from "./DireccionamientoModalProgramar"
import { ChevronLeft, ChevronRight, Eye, X, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Pill, Stethoscope, Package as PackageIcon, Sparkles, Activity, Hash, Layers3, ShieldCheck, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento"
import type { MipresCredentials } from "@/models/credentials.model"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface DireccionamientoTableProps {
  results: Direccionamiento[]
  credentials: MipresCredentials
  onView: (item: Direccionamiento) => void
  onAnularSuccess?: () => void
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

export function DireccionamientoTable({ results, credentials, onView, onAnularSuccess }: DireccionamientoTableProps) {
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
      techCounts,
      hasDuplicates,
      duplicateDeliveries: Array.from(duplicateDeliveries).sort(),
    }
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [anularModalOpen, setAnularModalOpen] = useState(false)
  const [selectedItemsForAnular, setSelectedItemsForAnular] = useState<Direccionamiento[]>([])
  const [programarModalOpen, setProgramarModalOpen] = useState(false)
  const [selectedItemForProgramar, setSelectedItemForProgramar] = useState<Direccionamiento | null>(null)
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false)
  const { esIPS: mostrarProgramacion } = useEmpresaActual()

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

  useEffect(() => {
    setPage(1)
  }, [results, pageSize, searchPrescripcion, filterTipoTec, regimenFilter, dateSort, showDuplicatesOnly])

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
          <h3 className="font-semibold text-base">Direccionamientos</h3>
          <Badge variant="secondary" className="text-xs">
            {filteredTotal}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Buscar N° prescripción"
            value={searchPrescripcion}
            onChange={(e) => setSearchPrescripcion(e.target.value)}
            className="h-8 px-3 text-xs border rounded-md w-[180px] bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Select value={filterTipoTec} onValueChange={setFilterTipoTec}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-white text-foreground border border-input">
              <SelectValue />
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
          <Select value={regimenFilter} onValueChange={(value: any) => setRegimenFilter(value)}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-white text-foreground border border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Régimen: Todos</SelectItem>
              <SelectItem value="Contributivo">Régimen: Contributivo</SelectItem>
              <SelectItem value="Subsidiado">Régimen: Subsidiado</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
             <label className="text-xs flex items-center gap-1 cursor-pointer select-none bg-muted px-2 py-1.5 rounded-md border hover:bg-muted/80 transition-colors">
               <input 
                 type="checkbox" 
                 checked={showDuplicatesOnly}
                 onChange={(e) => setShowDuplicatesOnly(e.target.checked)}
                 className="accent-primary h-3 w-3"
               />
               Solo Duplicados
             </label>
           </div>
        </div>
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex items-center justify-center gap-1.5">
                  <Hash className="h-3 w-3" />
                  No. Prescripción
                </div>
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">Tecnologías</th>
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
                  Fecha de Direccionamiento
                  {dateSort === "none" && <ArrowUpDown className="h-3 w-3" />}
                  {dateSort === "asc" && <ArrowUp className="h-3 w-3" />}
                  {dateSort === "desc" && <ArrowDown className="h-3 w-3" />}
                </button>
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">Tipo de regimen</th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex items-center justify-center gap-1.5">
                  <Layers3 className="h-3 w-3" />
                  Direccionamientos
                </div>
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" />
                  Estado de Anulación
                </div>
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex justify-end">
                  <span className={`inline-block text-center ${mostrarProgramacion ? "w-36" : "w-28"}`}>Acciones</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayed.map((row, idx) => {
              const rowKey = `${row.noPrescripcion}-${row.tipoRegimen || 'nom'}`
              const isActive = activeRow === rowKey
              const { fecha, hora } = formatFechaDireccionamiento(row.fechaFinal)
              return (
                <tr key={`${row.noPrescripcion}-${idx}`} className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex flex-col gap-1">
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
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex gap-0.5 justify-center whitespace-nowrap">
                      <CategoryBadge icon={Pill} label="Med" count={(row as any).techCounts?.M || 0} colorClass="bg-emerald-100 text-emerald-700" />
                      <CategoryBadge icon={Stethoscope} label="Proc" count={(row as any).techCounts?.P || 0} colorClass="bg-sky-100 text-sky-700" />
                      <CategoryBadge icon={PackageIcon} label="Disp" count={(row as any).techCounts?.D || 0} colorClass="bg-amber-100 text-amber-700" />
                      <CategoryBadge icon={Sparkles} label="Nutr" count={(row as any).techCounts?.N || 0} colorClass="bg-rose-100 text-rose-700" />
                      <CategoryBadge icon={Activity} label="Serv" count={(row as any).techCounts?.S || 0} colorClass="bg-violet-100 text-violet-700" />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium">{fecha}</div>
                      <div className="text-[10px]">{hora}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] h-5 ${
                        row.tipoRegimen === "Contributivo"
                          ? "bg-blue-100 text-blue-700"
                          : row.tipoRegimen === "Subsidiado"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.tipoRegimen || "Sin regimen"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-sm font-medium">{row.total}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge
                      variant={row.last.FecAnulacion ? "destructive" : "default"}
                      className={`text-[10px] h-5 ${row.last.FecAnulacion ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                    >
                      {row.last.FecAnulacion ? "Anulada" : "Vigente"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end">
                      <div className={`flex justify-center items-center gap-1 ${mostrarProgramacion ? "w-36" : "w-28"}`}>
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

                        {mostrarProgramacion && !row.last.FecAnulacion && (
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary"
                              onClick={() => { setSelectedItemForProgramar(row.last); setProgramarModalOpen(true); setActiveRow(rowKey); }}
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                            </Button>
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Programar
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
            {page} / {filteredPageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={page >= filteredPageCount}
            onClick={() => setPage((p) => Math.min(filteredPageCount, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DireccionamientoModalAnular
        open={anularModalOpen}
        onClose={() => setAnularModalOpen(false)}
        items={selectedItemsForAnular}
        credentials={credentials}
        onSuccess={onAnularSuccess}
      />

      {mostrarProgramacion && (
        <DireccionamientoModalProgramar
          open={programarModalOpen}
          onClose={() => setProgramarModalOpen(false)}
          item={selectedItemForProgramar}
          credentials={credentials}
        />
      )}
    </div>
  )
}
