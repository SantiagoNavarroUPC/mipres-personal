"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ESTADOS_ENTREGA } from "@/models/constants"
import {
  Eye,
  Package,
  Calendar,
  User,
  Hash,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Info,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react"
import type { ReporteEntrega } from "@/models/mipres-sispro/reporte-entrega/reporte-entrega"
import type { Suministro } from "@/models/mipres-sispro/suministro/suministro"
import type { MipresCredentials } from "@/models/credentials.model"
import { ReporteEntregaLecturaModal } from "./ReporteEntregaLecturaView"
import { SuministroLecturaModal } from "../component-suministro/SuministroLecturaView"
import { DireccionamientoLecturaModal } from "../component-direccionamiento/DireccionamientoLecturaView"
import { CategoryBadge } from "@/components/mipres/component-prescripcion/CategoryBadge"
import { Pill, Stethoscope, Sparkles, Activity } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { toast as toastSonner } from "sonner"
import { secureStorageGetItem } from "@/lib/secure-storage"

interface ReporteEntregaTableProps {
  reportes: ReporteEntrega[]
  loading?: boolean
  onRefreshReportes?: () => Promise<void>
  onFormVisibilityChange?: (open: boolean) => void
}

function parseDateTime(value?: string | null) {
  if (!value) return 0
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value
  const ts = new Date(normalized).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  if (value.includes(" ")) return value.split(" ")[0] || "-"
  if (value.includes("T")) return value.split("T")[0] || "-"
  return value
}

function isReporteElegibleParaSuministro(reporte: ReporteEntrega) {
  const nowTs = Date.now()
  const fecRepTs = parseDateTime(reporte.FecRepEntrega)
  const isAnulado = Boolean(reporte.FecAnulacion)
  const hasEstadoEntregaValido = Number(reporte.EstadoEntrega) === 1
  const causaNoEntregaRaw = reporte.CausaNoEntrega
  const hasCausaNoEntrega =
    causaNoEntregaRaw !== null &&
    causaNoEntregaRaw !== undefined &&
    String(causaNoEntregaRaw).trim() !== ""

  return (
    Number(reporte.EstRepEntrega) === 1 &&
    hasEstadoEntregaValido &&
    fecRepTs > 0 &&
    fecRepTs < nowTs &&
    !isAnulado &&
    !hasCausaNoEntrega
  )
}

import { SuministroModalMasivos } from "../component-suministro/SuministroModalMasivos"

export function ReporteEntregaTable({ reportes, loading, onRefreshReportes, onFormVisibilityChange }: ReporteEntregaTableProps) {
  const { toast } = useToast()
  const [selectedReports, setSelectedReports] = useState<ReporteEntrega[]>([])
  const [selectedPrescripcion, setSelectedPrescripcion] = useState<string>("")
  const [selectedSuministros, setSelectedSuministros] = useState<Suministro[]>([])
  const [suministroReadOpen, setSuministroReadOpen] = useState(false)
  const [fetchingSuministroFor, setFetchingSuministroFor] = useState<string | null>(null)
  const [suministroFetchError, setSuministroFetchError] = useState<string>("")
  const [direccionamientoOpen, setDireccionamientoOpen] = useState(false)
  const [selectedDireccionamientoPrescripcion, setSelectedDireccionamientoPrescripcion] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [suministroMasivoModalOpen, setSuministroMasivoModalOpen] = useState(false)
  const [suministroMasivoGroup, setSuministroMasivoGroup] = useState<{ noPrescripcion: string, reports: ReporteEntrega[] } | null>(null)

  // ── Vista inline: estados de visibilidad ──
  const [reporteViewOpen, setReporteViewOpen] = useState(false)
  const [suministroReadViewOpen, setSuministroReadViewOpen] = useState(false)
  const [dirViewOpen, setDirViewOpen] = useState(false)
  const anyViewOpen = reporteViewOpen || suministroReadViewOpen || dirViewOpen

  useEffect(() => {
    onFormVisibilityChange?.(anyViewOpen)
  }, [anyViewOpen, onFormVisibilityChange])
  const [page, setPage] = useState(1)
  const [dateSort, setDateSort] = useState<"none" | "asc" | "desc">("none")
  const [pageSize, setPageSize] = useState<number>(10)
  const [filterText, setFilterText] = useState("")
  const [filterState, setFilterState] = useState<"all" | "vigente" | "vigente_con_anulaciones" | "anulado" | "con_suministro">("all")

  // Persistir filtros entre refreshes
  const FILTERS_KEY = "reporteEntrega_filters_v1"
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  const [activeRow, setActiveRow] = useState<string | null>(null)
  const [procesandoSuministroFor, setProcesandoSuministroFor] = useState<string | null>(null)

  const [credentials, setCredentials] = useState({ nit: "", token: "" })
  const [direccionamientoCredentials, setDireccionamientoCredentials] = useState<MipresCredentials>({
    nit: "",
    tokenAcceso: "",
  })

  useEffect(() => {
    // Intentar recuperar credenciales del almacenamiento local si existen
    // Esto es un fallback común
    const storedNit = localStorage.getItem("mipres_nit")
    const storedToken = localStorage.getItem("mipres_token")
    if (storedNit && storedToken) {
      setCredentials({ nit: storedNit, token: storedToken })
    }

    const savedCredentials = secureStorageGetItem("mipres_credentials")
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials)
        const nit = parsed?.nit || storedNit || ""
        const tokenAcceso = parsed?.tokenAcceso || parsed?.token || storedToken || ""
        setDireccionamientoCredentials({
          nit,
          tokenAcceso,
          tokenAccesoSubsidiado: parsed?.tokenAccesoSubsidiado || undefined,
          tokenAccesoContributivo: parsed?.tokenAccesoContributivo || undefined,
        })
      } catch {
        if (storedNit && storedToken) {
          setDireccionamientoCredentials({
            nit: storedNit,
            tokenAcceso: storedToken,
          })
        }
      }
    } else if (storedNit && storedToken) {
      setDireccionamientoCredentials({
        nit: storedNit,
        tokenAcceso: storedToken,
      })
    }
  }, [])

  const groupedReportes = useMemo(() => {
    if (!reportes) return []

    const groups = new Map<string, ReporteEntrega[]>()

    for (const rep of reportes) {
      const key = String(rep?.NoPrescripcion ?? "").trim()
      if (!key) continue
      const current = groups.get(key) ?? []
      current.push(rep)
      groups.set(key, current)
    }

    const result = Array.from(groups.entries()).map(([noPrescripcion, group]) => {
      const sorted = [...group].sort((a, b) => parseDateTime(b.FecRepEntrega) - parseDateTime(a.FecRepEntrega))
      const latestReport = sorted[0]
      return {
        noPrescripcion,
        reports: sorted,
        latestReport,
        count: sorted.length,
      }
    })

    if (dateSort === "none") return result

    return [...result].sort((a, b) => {
      const dateA = parseDateTime(a.latestReport?.FecRepEntrega)
      const dateB = parseDateTime(b.latestReport?.FecRepEntrega)
      return dateSort === "asc" ? dateA - dateB : dateB - dateA
    })
  }, [reportes, dateSort])

  // Keep current page if possible when data refreshes; clamp it to valid range
  useEffect(() => {
    const newPageCount = Math.max(1, Math.ceil((groupedReportes.length || 0) / pageSize))
    if (page > newPageCount) setPage(newPageCount)
  }, [groupedReportes.length, pageSize, page])

  // When user changes filters, reset to first page — but ignore this during initial restore
  useEffect(() => {
    if (!filtersInitialized) return
    setPage(1)
  }, [filterText, filterState, filtersInitialized])

  // Load saved filters on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTERS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw || "{}")
        if (parsed) {
          if (typeof parsed.page === "number") setPage(parsed.page)
          if (typeof parsed.pageSize === "number") setPageSize(parsed.pageSize)
          if (typeof parsed.filterText === "string") setFilterText(parsed.filterText)
          if (typeof parsed.filterState === "string") setFilterState(parsed.filterState)
          if (typeof parsed.dateSort === "string") setDateSort(parsed.dateSort)
        }
      }
    } catch (e) {
      // ignore parse errors
    } finally {
      setFiltersInitialized(true)
    }
  }, [])

  // Persist filters whenever they change
  useEffect(() => {
    if (!filtersInitialized) return
    try {
      const toSave = JSON.stringify({ page, pageSize, filterText, filterState, dateSort })
      localStorage.setItem(FILTERS_KEY, toSave)
    } catch {
      // ignore storage errors
    }
  }, [page, pageSize, filterText, filterState, dateSort, filtersInitialized])

  const filteredGroups = useMemo(() => {
    const text = filterText.trim().toLowerCase()
    return groupedReportes.filter(group => {
      const totalReports = group.reports.length
      const annulledCount = group.reports.filter(r => r.EstRepEntrega === 0 || r.FecAnulacion).length
      const isAllAnnulled = annulledCount === totalReports
      const isAnyAnnulled = annulledCount > 0

      // Filtro: con suministro (aquellos grupos que tengan al menos un reporte elegible)
      if (filterState === "con_suministro") {
        if (!group.reports.some(isReporteElegibleParaSuministro)) return false
      }

      // Estado filter
      if (filterState === "anulado" && !isAllAnnulled) return false
      if (filterState === "vigente" && isAnyAnnulled) return false
      if (filterState === "vigente_con_anulaciones" && !isAnyAnnulled) return false

      // Text filter: prescripción, tipoID or noID — buscar en todo el grupo (no sólo en el reporte más reciente)
      if (!text) return true
      if (String(group.noPrescripcion).toLowerCase().includes(text)) return true
      // Buscar dentro de cualquiera de los reportes del grupo
      return group.reports.some(r =>
        String(r?.TipoIDPaciente ?? "").toLowerCase().includes(text) ||
        String(r?.NoIDPaciente ?? "").toLowerCase().includes(text)
      )
    })
  }, [groupedReportes, filterText, filterState])

  const pageCount = Math.max(1, Math.ceil((filteredGroups.length || 0) / pageSize))

  const displayedGroups = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredGroups.slice(start, start + pageSize)
  }, [filteredGroups, page, pageSize])

  // Elegibles de todas las páginas filtradas, no solo la página visible:
  // el suministro masivo debe poder cubrir todo el resultado filtrado.
  const reportesElegiblesTodos = useMemo(() => {
    return filteredGroups.flatMap((group) => group.reports.filter(isReporteElegibleParaSuministro))
  }, [filteredGroups])

  const countDistinctConTec = (reports: ReporteEntrega[], tipo: string) => {
    return new Set(reports.filter(r => r.TipoTec === tipo).map(r => r.ConTec ?? 0)).size
  }

  const openModal = (group: { noPrescripcion: string, reports: ReporteEntrega[] }) => {
    setSelectedReports(group.reports)
    setSelectedPrescripcion(group.noPrescripcion)
    setModalOpen(true)
  }

  const handleHacerSuministro = (group: { noPrescripcion: string, reports: ReporteEntrega[] }) => {
    openModal(group)
  }

  const handleVerDireccionamiento = (group: { noPrescripcion: string, reports: ReporteEntrega[], latestReport: ReporteEntrega }) => {
    setSelectedDireccionamientoPrescripcion({
      NoPrescripcion: group.noPrescripcion,
      TipoIDPaciente: group.latestReport?.TipoIDPaciente,
      NoIDPaciente: group.latestReport?.NoIDPaciente,
    })
    setDireccionamientoOpen(true)
  }

  const handleHacerSuministroMasivo = () => {
    if (reportesElegiblesTodos.length === 0) {
      toast({
        title: "Sin reportes elegibles",
        description: "No hay reportes elegibles en el resultado filtrado para hacer suministro masivo.",
        variant: "destructive",
      })
      return
    }
    setSuministroMasivoGroup({
      noPrescripcion: `Masivo (todas las páginas)`,
      reports: reportesElegiblesTodos,
    })
    setSuministroMasivoModalOpen(true)
  }

  const handleAutoSuministro = async (group: { noPrescripcion: string; reports: ReporteEntrega[] }) => {
    const elegibles = group.reports.filter(isReporteElegibleParaSuministro)
    if (elegibles.length === 0) {
      toastSonner.error("No hay reportes elegibles para suministro")
      return
    }

    setProcesandoSuministroFor(group.noPrescripcion)
    const toastId = toastSonner.loading(`Procesando suministro...`)

    try {
      let nit = ""
      let token = ""

      if (typeof window !== "undefined") {
        nit = localStorage.getItem("mipres_nit") || ""
        token = localStorage.getItem("mipres_token") || ""
      }
      const saved = secureStorageGetItem("mipres_credentials")
      if (saved) {
        try {
          const p = JSON.parse(saved)
          nit = nit || p?.nit || ""
          token = token || p?.tokenAcceso || p?.token || ""
        } catch {}
      }

      if (!nit || !token) {
        toastSonner.error("Sin credenciales para procesar suministro", { id: toastId })
        return
      }

      // Obtener última entrega por tecnología desde direccionamientos
      const ultimaEntregaByTec = new Map<string, number>()
      try {
        const dirParams = new URLSearchParams({ nit, tokenAcceso: token, tipo: "prescripcion", noPrescripcion: group.noPrescripcion })
        const dirJson = await fetch(`/api/mipres/direccionamiento?${dirParams.toString()}`).then(r => r.json())
        const dirs = Array.isArray(dirJson?.data) ? dirJson.data : dirJson?.data ? [dirJson.data] : []
        for (const dir of dirs) {
          if (dir?.FecAnulacion) continue
          const key = `${String(dir.NoPrescripcion)}|${String(dir.TipoTec)}|${String(dir.ConTec)}`
          const noEntrega = Number(dir.NoEntrega || 0)
          if (noEntrega > (ultimaEntregaByTec.get(key) || 0)) ultimaEntregaByTec.set(key, noEntrega)
        }
      } catch {}

      let successCount = 0
      let errorCount = 0

      for (const reporte of elegibles) {
        try {
          const entregasRel = (group.reports || [])
            .filter(r => r.NoPrescripcion === reporte.NoPrescripcion && r.TipoTec === reporte.TipoTec && r.ConTec === reporte.ConTec && !r.FecAnulacion)
            .sort((a, b) => (a.NoEntrega || 0) - (b.NoEntrega || 0))
          const ultimaEntrega = entregasRel[entregasRel.length - 1]
          const dirKey = `${String(reporte.NoPrescripcion)}|${String(reporte.TipoTec)}|${String(reporte.ConTec)}`
          const ultDir = ultimaEntregaByTec.get(dirKey)
          const esUltima = ultDir !== undefined
            ? (Number(reporte.NoEntrega || 0) === Number(ultDir) ? 1 : 0)
            : (ultimaEntrega?.IDReporteEntrega === reporte.IDReporteEntrega ? 1 : 0)
          const hasCausa = reporte.CausaNoEntrega !== null && reporte.CausaNoEntrega !== undefined && String(reporte.CausaNoEntrega).trim() !== ""
          const entregaCompleta = reporte.EstadoEntrega === 1 && !hasCausa ? 1 : 0

          // Crear suministro
          const suministroResp = await fetch("/api/mipres/suministro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nit,
              tokenAcceso: token,
              body: {
                ID: reporte.ID,
                UltEntrega: esUltima,
                EntregaCompleta: entregaCompleta,
                CausaNoEntrega: reporte.CausaNoEntrega || 0,
                NoPrescripcionAsociada: null,
                ConTecAsociada: reporte.ConTec,
                CantTotEntregada: reporte.CantTotEntregada,
                NoLote: reporte.NoLote,
                ValorEntregado: reporte.ValorEntregado?.toString(),
              },
            }),
          })
          const suministroData = await suministroResp.json()

          if (suministroData.success) {
            successCount++
          } else {
            errorCount++
          }
        } catch {
          errorCount++
        }
      }

      if (successCount > 0) {
        toastSonner.success(
          `${successCount} suministro(s) procesado(s)${errorCount > 0 ? ` · ${errorCount} con error` : ""}`,
          { id: toastId }
        )
        if (onRefreshReportes) await onRefreshReportes()
      } else {
        toastSonner.error("No se pudo procesar el suministro", { id: toastId })
      }
    } catch {
      toastSonner.error("Error inesperado al procesar suministro", { id: toastId })
    } finally {
      setProcesandoSuministroFor(null)
    }
  }

  const handleVerSuministro = async (noPrescripcion: string) => {
    setSuministroReadOpen(false)
    setSelectedSuministros([])
    setFetchingSuministroFor(noPrescripcion)
    setSuministroFetchError("")

    try {
      let nit = credentials.nit
      let tokenAcceso = credentials.token
      let tokenAccesoSubsidiado = ""
      let tokenAccesoContributivo = ""

      const savedCredentials = secureStorageGetItem("mipres_credentials")
      if (savedCredentials) {
        try {
          const parsed = JSON.parse(savedCredentials)
          nit = nit || parsed?.nit || ""
          tokenAcceso = tokenAcceso || parsed?.tokenAcceso || parsed?.token || ""
          tokenAccesoSubsidiado = parsed?.tokenAccesoSubsidiado || ""
          tokenAccesoContributivo = parsed?.tokenAccesoContributivo || ""
        } catch {
          // ignore parse errors
        }
      }

      if (!nit || (!tokenAcceso && !(tokenAccesoSubsidiado && tokenAccesoContributivo))) {
        setSuministroFetchError("No hay credenciales para consultar suministro")
        toast({
          title: "Sin credenciales",
          description: "No hay credenciales para consultar suministro.",
          variant: "destructive",
        })
        return
      }

      const queryParams = new URLSearchParams({
        nit,
        tipo: "prescripcion",
        noPrescripcion,
      })

      if (tokenAcceso) queryParams.set("tokenAcceso", tokenAcceso)
      if (tokenAccesoSubsidiado) queryParams.set("tokenAccesoSubsidiado", tokenAccesoSubsidiado)
      if (tokenAccesoContributivo) queryParams.set("tokenAccesoContributivo", tokenAccesoContributivo)

      const response = await fetch(`/api/mipres/suministro?${queryParams.toString()}`)
      const result = await response.json()

      if (!response.ok || !result?.success) {
        setSuministroFetchError(result?.error || "No se pudo consultar suministro")
        return
      }

      const suministros: Suministro[] = Array.isArray(result.data)
        ? result.data
        : result.data
          ? [result.data]
          : []

      const targetPrescripcion = String(noPrescripcion).trim()
      const suministrosMismaPrescripcion = suministros.filter((s) =>
        String(s?.NoPrescripcionAsociada ?? "").trim() === targetPrescripcion
      )

      if (suministrosMismaPrescripcion.length === 0) {
        const message = "El reporte de entrega no tiene suministros"
        setSuministroFetchError(message)
        toast({
          title: "Sin suministros",
          description: message,
          variant: "destructive",
        })
        return
      }

      setSelectedSuministros(suministrosMismaPrescripcion)
      setSelectedPrescripcion(noPrescripcion)
      setSuministroReadOpen(true)
    } catch {
      setSuministroFetchError("Error al consultar suministro")
      toast({
        title: "Error",
        description: "Error al consultar suministro",
        variant: "destructive",
      })
    } finally {
      setFetchingSuministroFor(null)
    }
  }

  if (!reportes || reportes.length === 0) {
    if (loading) {
      return (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-3 animate-pulse">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-muted-foreground">Cargando reportes...</p>
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
          <p className="text-base font-medium text-muted-foreground">No se encontraron reportes de entrega</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Intenta con otros criterios de búsqueda</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Vistas inline (fuera del bloque de ocultamiento) ── */}
      {selectedReports.length > 0 && (
        <ReporteEntregaLecturaModal
          reportes={selectedReports}
          open={modalOpen}
          onClose={() => { setModalOpen(false); setReporteViewOpen(false) }}
          noPrescripcion={selectedPrescripcion}
          onFormVisibilityChange={setReporteViewOpen}
          onSuccess={async () => {
            setModalOpen(false)
            setReporteViewOpen(false)
            if (onRefreshReportes) await onRefreshReportes()
          }}
        />
      )}

      {selectedSuministros.length > 0 && (
        <SuministroLecturaModal
          suministros={selectedSuministros}
          open={suministroReadOpen}
          onClose={() => { setSuministroReadOpen(false); setSelectedSuministros([]); setSuministroReadViewOpen(false) }}
          noPrescripcion={selectedPrescripcion}
          onFormVisibilityChange={setSuministroReadViewOpen}
        />
      )}

      {selectedDireccionamientoPrescripcion && (
        <DireccionamientoLecturaModal
          prescripcion={selectedDireccionamientoPrescripcion}
          open={direccionamientoOpen}
          onClose={() => { setDireccionamientoOpen(false); setSelectedDireccionamientoPrescripcion(null); setDirViewOpen(false) }}
          credentials={direccionamientoCredentials}
          tipo="prescripcion"
          onFormVisibilityChange={setDirViewOpen}
        />
      )}

      {/* ── Contenido tabla (oculto cuando una vista está abierta) ── */}
      {!anyViewOpen && <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Reportes Entrega</h3>
          <Badge variant="secondary" className="text-xs">
            {filteredGroups.length}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Buscar N° prescripción o paciente"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="h-8 px-3 text-xs border rounded-md w-[220px] bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <Select value={filterState} onValueChange={(v: any) => setFilterState(v)}>
            <SelectTrigger className="w-[220px] h-8 text-xs bg-white text-foreground border border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Estado: Todos</SelectItem>
              <SelectItem value="vigente">Estado: Vigente</SelectItem>
              <SelectItem value="vigente_con_anulaciones">Estado: Vigente con anulaciones</SelectItem>
              <SelectItem value="anulado">Estado: Anulado</SelectItem>
              <SelectItem value="con_suministro">Con suministro</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs bg-white text-foreground border border-input hover:bg-muted/40"
            onClick={handleHacerSuministroMasivo}
            disabled={reportesElegiblesTodos.length === 0}
            title="Hacer suministro masivo (incluye todas las páginas del resultado filtrado)"
          >
            <Plus className="h-4 w-4 mr-1" />
            Hacer suministro masivo ({reportesElegiblesTodos.length})
          </Button>
        </div>
      </div>

      {suministroFetchError && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {suministroFetchError}
        </div>
      )}
      {/* pagination moved into header */}

      <Card className="overflow-hidden gap-0 py-0">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4 pl-8">
                  <div className="flex items-center gap-1.5 justify-start">
                    <Hash className="h-3 w-3" />
                    Prescripción
                  </div>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4 pl-8">
                  <div className="flex items-center gap-1.5 justify-start">
                    <User className="h-3 w-3" />
                    Paciente
                  </div>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDateSort(
                        dateSort === "none" ? "desc" : dateSort === "desc" ? "asc" : "none"
                      )
                    }}
                    className="flex items-center justify-center gap-1.5 w-full hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Calendar className="h-3 w-3" />
                    Fecha Último Reporte
                    {dateSort === "none" && <ArrowUpDown className="h-3 w-3" />}
                    {dateSort === "asc" && <ArrowUp className="h-3 w-3" />}
                    {dateSort === "desc" && <ArrowDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <Package className="h-3 w-3" />
                    Reportes
                  </div>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  Tecnologías
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  Estado Entrega
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y text-justify">
              {displayedGroups.map((group) => {
                const totalReports = group.reports.length
                const annulledCount = group.reports.filter(r => r.EstRepEntrega === 0 || r.FecAnulacion).length
                const hasEligibleForSuministro = group.reports.some(isReporteElegibleParaSuministro)
                const isAllAnnulled = annulledCount === totalReports
                const isAnyAnnulled = annulledCount > 0
                const showSuministro = hasEligibleForSuministro

                const isActive = activeRow === group.noPrescripcion
                return (
                  <tr
                    key={group.noPrescripcion}
                    className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}
                  >
                    <td className="px-4 py-2.5 text-left align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-primary pl-4">
                          {group.noPrescripcion}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-left align-middle">
                      <span className="text-xs font-mono font-medium max-w-[140px] inline-block">
                        {group.latestReport?.TipoIDPaciente} - {group.latestReport?.NoIDPaciente}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="text-xs text-muted-foreground">
                        <div className="font-medium">{formatDate(group.latestReport?.FecRepEntrega)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant="secondary" className="text-[10px] h-5 px-2">
                        {group.count} {group.count === 1 ? "Reporte" : "Reportes"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {(() => {
                        const techSet = new Set(group.reports.map(r => `${r.TipoTec || ""}-${r.ConTec ?? 0}`))
                        const techCount = techSet.size
                        return (
                          <div className="flex gap-0.5 justify-center whitespace-nowrap">
                            <CategoryBadge icon={Pill} label="Med" count={countDistinctConTec(group.reports, 'M')} colorClass="bg-emerald-100 text-emerald-700" />
                            <CategoryBadge icon={Stethoscope} label="Proc" count={countDistinctConTec(group.reports, 'P')} colorClass="bg-sky-100 text-sky-700" />
                            <CategoryBadge icon={Package} label="Disp" count={countDistinctConTec(group.reports, 'D')} colorClass="bg-amber-100 text-amber-700" />
                            <CategoryBadge icon={Sparkles} label="Nutr" count={countDistinctConTec(group.reports, 'N')} colorClass="bg-rose-100 text-rose-700" />
                            <CategoryBadge icon={Activity} label="Serv" count={countDistinctConTec(group.reports, 'S')} colorClass="bg-violet-100 text-violet-700" />
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isAllAnnulled ? (
                        <Badge variant="destructive" className="h-5 px-2 text-[10px]">Anulado</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`h-5 px-2 text-[10px] ${isAnyAnnulled ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                        >
                          {isAnyAnnulled ? "Vigente con anulaciones" : "Vigente"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {/* Slot 1: Ver direccionamiento (o placeholder) */}
                        {true ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="group relative h-7 w-7"
                            onClick={() => { handleVerDireccionamiento(group); setActiveRow(group.noPrescripcion); }}
                            title="Ver direccionamiento"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Ver direccionamiento
                            </span>
                          </Button>
                        ) : (
                          <div className="h-7 w-7" aria-hidden />
                        )}

                        {/* Slot 2: Ver reporte (or placeholder) */}
                        {true ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="group relative h-7 w-7"
                            onClick={() => { openModal(group); setActiveRow(group.noPrescripcion); }}
                            title="Ver reporte de entrega"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              Ver reporte de entrega
                            </span>
                          </Button>
                        ) : (
                          <div className="h-7 w-7" aria-hidden />
                        )}

                        {/* Slot 3: Ver suministro (shows loading/placeholder if none) */}
                        {true ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="group relative h-7 w-7"
                            onClick={() => { handleVerSuministro(group.noPrescripcion); setActiveRow(group.noPrescripcion); }}
                            disabled={fetchingSuministroFor === group.noPrescripcion}
                            title={fetchingSuministroFor === group.noPrescripcion ? "Buscando suministro" : "Ver suministro"}
                          >
                            <Package className="h-3.5 w-3.5" />
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              {fetchingSuministroFor === group.noPrescripcion ? "Buscando..." : "Ver suministro"}
                            </span>
                          </Button>
                        ) : (
                          <div className="h-7 w-7" aria-hidden />
                        )}

                        {/* Slot 4: Hacer suministro automático */}
                        {showSuministro ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="group relative h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => { handleAutoSuministro(group); setActiveRow(group.noPrescripcion); }}
                            disabled={!!procesandoSuministroFor}
                            title="Hacer suministro"
                          >
                            {procesandoSuministroFor === group.noPrescripcion
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Plus className="h-3.5 w-3.5" />
                            }
                            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              {procesandoSuministroFor === group.noPrescripcion ? "Procesando..." : "Hacer suministro"}
                            </span>
                          </Button>
                        ) : (
                          <div className="h-7 w-7" aria-hidden />
                        )}
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
          onChange={e => {
            setPageSize(Number(e.target.value))
            setPage(1)
            // @ts-ignore
            window && window.scrollTo && window.scrollTo({ top: 0, behavior: "smooth" })
          }}
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

      {suministroMasivoGroup && (
        <SuministroModalMasivos
          open={suministroMasivoModalOpen}
          onClose={() => setSuministroMasivoModalOpen(false)}
          reportes={suministroMasivoGroup.reports}
          noPrescripcion={suministroMasivoGroup.noPrescripcion}
          credentials={credentials}
          onSuccess={async () => {
            if (onRefreshReportes) await onRefreshReportes()
          }}
        />
      )}
      </>}
    </div>
  )
}
