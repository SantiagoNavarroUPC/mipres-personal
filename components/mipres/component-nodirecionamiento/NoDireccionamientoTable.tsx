"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { NoDireccionamiento } from "@/models/mipres-sispro/no_direccionamiento/no_direccionamiento"
import {
  CAUSAS_NO_ENTREGAS,
  ESTADOS_TECNOLOGIAS,
  TIPOS_DOCUMENTO,
  TIPOS_TECNOLOGIAS,
} from "@/models/constants"
import type { MipresCredentials } from "@/models/credentials.model"
import { Badge } from "@/components/ui/badge"
import { CategoryBadge } from "@/components/mipres/component-prescripcion/CategoryBadge"
import { Pill, Stethoscope, Package, Sparkles, Activity, Hash, User, ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react"
import { NoDireccionamientoLecturaModal } from "./NoDireccionamientoLecturaView"

interface NoDireccionamientoTableProps {
  results: NoDireccionamiento[]
  credentials: MipresCredentials
  onAnularSuccess?: (idNoDireccionamiento: string) => void
  onFormVisibilityChange?: (open: boolean) => void
}

export function NoDireccionamientoTable({ results, credentials, onAnularSuccess, onFormVisibilityChange }: NoDireccionamientoTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchPrescripcion, setSearchPrescripcion] = useState("")
  const [filterTipoTec, setFilterTipoTec] = useState("todos")
  const [verModalOpen, setVerModalOpen] = useState(false)
  const [verPrescripcion, setVerPrescripcion] = useState<any | null>(null)
  const [noDirFormOpen, setNoDirFormOpen] = useState(false)
  const [anularModalOpen, setAnularModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)
  const [activeRow, setActiveRow] = useState<string | null>(null)

  const getTipoTecLabel = (tipoTec: string) => {
    // Try TIPOS_TECNOLOGIAS first (usually "M", "P", "D", "N", "S")
    const tipoLabel = TIPOS_TECNOLOGIAS[tipoTec as keyof typeof TIPOS_TECNOLOGIAS]
    if (tipoLabel) return tipoLabel

    // Try ESTADOS_TECNOLOGIAS (usually numeric strings "1", "2", "3", "4")
    const estadoLabel = ESTADOS_TECNOLOGIAS[Number(tipoTec) as keyof typeof ESTADOS_TECNOLOGIAS]
    if (estadoLabel) return estadoLabel

    return tipoTec
  }

  const filteredRows = useMemo(() => {
    let filtered = [...(results || [])]

    if (searchPrescripcion.trim()) {
      filtered = filtered.filter((row) =>
        row.NoPrescripcion?.toLowerCase().includes(searchPrescripcion.toLowerCase())
      )
    }

    if (filterTipoTec !== "todos") {
      // filter by presence of that tipo in the prescripcion's tech counts
      filtered = filtered.filter((row) => {
        const presc = row.NoPrescripcion || ""
        const counts = techCountsByPrescripcion[presc]
        return counts ? counts[filterTipoTec as keyof typeof counts] > 0 : false
      })
    }

    return filtered
  }, [results, searchPrescripcion, filterTipoTec])

  const filteredTotal = filteredRows.length
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize))

  const displayed = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const techCountsByPrescripcion = useMemo(() => {
    const map: Record<string, { M: number; P: number; D: number; N: number; S: number }> = {}
    const groups: Record<string, { M: Set<number>; P: Set<number>; D: Set<number>; N: Set<number>; S: Set<number> }> = {}

    for (const r of results || []) {
      const presc = String(r.NoPrescripcion || "").trim()
      if (!presc) continue
      if (!groups[presc]) {
        groups[presc] = { M: new Set(), P: new Set(), D: new Set(), N: new Set(), S: new Set() }
      }
      if ((r as any).FecAnulacion) continue
      const tipo = String(r.TipoTec || "")
      const con = Number((r as any).ConTec || 0)
      if (tipo && con > 0 && (groups[presc] as any)[tipo] !== undefined) {
        ;(groups[presc] as any)[tipo].add(con)
      }
    }

    for (const [presc, sets] of Object.entries(groups)) {
      map[presc] = { M: sets.M.size, P: sets.P.size, D: sets.D.size, N: sets.N.size, S: sets.S.size }
    }
    return map
  }, [results])

  useEffect(() => {
    setPage(1)
  }, [results, pageSize, searchPrescripcion, filterTipoTec])

  useEffect(() => {
    onFormVisibilityChange?.(noDirFormOpen)
  }, [noDirFormOpen, onFormVisibilityChange])

  const openVerModal = (noPrescripcion: string) => {
    setVerPrescripcion({
      NoPrescripcion: noPrescripcion,
      PNPaciente: "",
      PAPaciente: "",
      medicamentos: [],
      procedimientos: [],
      productosNutricionales: [],
      serviciosComplementarios: [],
      dispositivos: [],
    })
    setVerModalOpen(true)
  }

  const openAnularModal = (idNoDireccionamiento?: number) => {
    if (!idNoDireccionamiento) {
      toast.error("No se puede anular: falta ID No Direccionamiento")
      return
    }
    setSelectedId(String(idNoDireccionamiento))
    setAnularModalOpen(true)
  }

  const handleConfirmAnular = async () => {
    const token =
      credentials.tokenAccesoSubsidiado ||
      credentials.tokenAcceso ||
      credentials.tokenAccesoContributivo ||
      ""

    if (!credentials.nit || !token || !selectedId) {
      toast.error("Error: Credenciales incompletas")
      return
    }

    setAnulando(true)
    try {
      const response = await fetch("/api/mipres/no-direccionamiento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit: credentials.nit,
          tokenAcceso: token,
          idNoDireccionamiento: selectedId,
        }),
      })

      const result = await response.json()

      if (response.ok && result?.success) {
        toast.success("No Direccionamiento anulado")
        onAnularSuccess?.(selectedId)
        setAnularModalOpen(false)
        setSelectedId(null)
      } else {
        toast.error(result?.error || "Error al anular no direccionamiento")
      }
    } catch {
      toast.error("Error al anular no direccionamiento")
    } finally {
      setAnulando(false)
    }
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
      {verPrescripcion && (
        <NoDireccionamientoLecturaModal
          open={verModalOpen}
          onClose={() => {
            setVerModalOpen(false)
            setVerPrescripcion(null)
            setNoDirFormOpen(false)
          }}
          prescripcion={verPrescripcion}
          credentials={credentials}
          onFormVisibilityChange={setNoDirFormOpen}
        />
      )}

      {!noDirFormOpen && <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">No Direccionamientos</h3>
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
                  <div className="flex items-center justify-center gap-1.5">
                    <User className="h-3 w-3" />
                    Paciente
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3 w-3" />
                    Causal No Entrega
                  </div>
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-4">
                  <div className="flex justify-end">
                    <span className="inline-block w-28 text-center">Acciones</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.map((row, index) => {
                const rowKey = String(row.IDNODireccionamiento || `${row.NoPrescripcion || "-"}-${index}`)
                const isActive = activeRow === rowKey
                return (
                  <tr
                    key={rowKey}
                    className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}
                  >
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="font-mono text-xs font-medium text-primary">
                          {row.NoPrescripcion}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {getTipoTecLabel(String(row.TipoTec || ""))}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex gap-0.5 justify-center whitespace-nowrap">
                        <CategoryBadge icon={Pill} label="Med" count={techCountsByPrescripcion[row.NoPrescripcion]?.M || 0} colorClass="bg-emerald-100 text-emerald-700" />
                        <CategoryBadge icon={Stethoscope} label="Proc" count={techCountsByPrescripcion[row.NoPrescripcion]?.P || 0} colorClass="bg-sky-100 text-sky-700" />
                        <CategoryBadge icon={Package} label="Disp" count={techCountsByPrescripcion[row.NoPrescripcion]?.D || 0} colorClass="bg-amber-100 text-amber-700" />
                        <CategoryBadge icon={Sparkles} label="Nutr" count={techCountsByPrescripcion[row.NoPrescripcion]?.N || 0} colorClass="bg-rose-100 text-rose-700" />
                        <CategoryBadge icon={Activity} label="Serv" count={techCountsByPrescripcion[row.NoPrescripcion]?.S || 0} colorClass="bg-violet-100 text-violet-700" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-[10px] text-muted-foreground">
                          {TIPOS_DOCUMENTO[row.TipoIDPaciente as keyof typeof TIPOS_DOCUMENTO] || row.TipoIDPaciente}
                        </span>
                        <span className="text-xs font-medium">{row.NoIDPaciente}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        {CAUSAS_NO_ENTREGAS[row.CausaNoEntrega as keyof typeof CAUSAS_NO_ENTREGAS] || row.CausaNoEntrega}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end">
                        <div className="w-28 flex justify-center items-center gap-1">
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { openVerModal(row.NoPrescripcion); setActiveRow(rowKey); }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Ver
                            </span>
                          </div>

                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => { openAnularModal(row.IDNODireccionamiento); setActiveRow(rowKey); }}
                              disabled={!row.IDNODireccionamiento}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Anular
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

      <Dialog open={anularModalOpen} onOpenChange={setAnularModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Anular No Direccionamiento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que quieres anular el No Direccionamiento <span className="font-mono font-medium">{selectedId}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAnularModalOpen(false)}
              disabled={anulando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmAnular}
              disabled={anulando}
            >
              {anulando ? "Anulando..." : "Anular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>}
    </div>
  )
}
