import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { CategoryBadge } from "./CategoryBadge"
import { InfoMobileModal } from "./InfoMobileModal"
import { AMBITOS_ATENCION, MODALIDAD } from "@/models/constants"
import { getArray } from "./utils"
import {
  Hash,
  User,
  Calendar,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  Pill,
  Stethoscope,
  Package,
  Sparkles,
  Info,
  Search,
  Building2,
} from "lucide-react"
import type { Prescripcion } from "@/models/mipres-sispro/prescripcion"
import type { MipresCredentials } from "@/models/credentials.model"
import { Card } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type JuntaProfesionalItem = {
  NoPrescripcion?: string
  FPrescripcion?: string
  TipoTecnologia?: string
  Consecutivo?: number
  EstJM?: number
  CodEntProc?: string
  Observaciones?: string
  JustificacionTecnica?: string
  Modalidad?: string
  NoActa?: string
  FechaActa?: string
  FProceso?: string
  TipoIDPaciente?: string
  NroIDPaciente?: string
  CodEntJM?: string
}

interface PrescripcionTableBodyProps {
  displayed: any[]
  allFiltered: any[]
  dateSort: "none" | "asc" | "desc"
  setDateSort: (value: "none" | "asc" | "desc") => void
  direccionamientoStatus: Record<string, boolean>
  noDireccionamientoStatus: Record<string, boolean>
  noDireccionamientoNoAnuladoStatus: Record<string, boolean>
  anulacionStatus: Record<string, boolean>
  openVerModal: (presc: any) => void
  openNoDireccionamientoModal: (presc: any) => void
  openAccionesModal: (presc: any) => void
  handlePrintPrescripcion: (presc: Prescripcion) => void
  credentials: MipresCredentials
  regimenFilter?: "todos" | "Contributivo" | "Subsidiado"
  setRegimenFilter?: (value: "todos" | "Contributivo" | "Subsidiado") => void
  estJmFilter?: "todos" | "aprobada" | "pendiente" | "rechazada"
  setEstJmFilter?: (value: "todos" | "aprobada" | "pendiente" | "rechazada") => void
  direccionamientoFilter?: "todos" | "direccionado" | "no-direccionado" | "no-direccionamiento"
  setDireccionamientoFilter?: (value: "todos" | "direccionado" | "no-direccionado" | "no-direccionamiento") => void
}

function canDireccionarPrescripcion(presc: any) {
  const tecsByType = {
    med: getArray(presc, "medicamentos"),
    proc: getArray(presc, "procedimientos"),
    disp: getArray(presc, "dispositivos"),
    nutr: getArray(presc, "productosNutricionales"),
    serv: getArray(presc, "serviciosComplementarios"),
  }

  const typeStates: Record<string, { approved: number; pending: number; rejected: number }> = {}
  let totalApproved = 0
  let totalPending = 0
  let totalRejected = 0
  let typesWithTechs = 0
  const typeDetailsArray: Array<{ type: string; approved: number; pending: number; rejected: number }> = []

  for (const [type, techs] of Object.entries(tecsByType)) {
    if (!Array.isArray(techs) || techs.length === 0) continue

    typesWithTechs++
    const approved = techs.filter((t: any) => t.EstJM === 1 || t.EstJM === 3).length
    const pending = techs.filter((t: any) => t.EstJM === 2).length
    const rejected = techs.filter((t: any) => t.EstJM === 4).length

    typeStates[type] = { approved, pending, rejected }
    typeDetailsArray.push({ type, approved, pending, rejected })
    totalApproved += approved
    totalPending += pending
    totalRejected += rejected
  }

  if (totalRejected > 0) {
    return { canDireccionar: false, status: "error" as const, typeDetails: typeDetailsArray }
  }

  let isDifferentTypePartial = false
  let hasMultipleTypesWithContent = typesWithTechs > 1
  let hasApprovedInAnyType = false
  let hasPendingInAnyType = false

  for (const state of Object.values(typeStates)) {
    const { approved, pending, rejected } = state
    const totalOfType = approved + pending + rejected

    if (approved > 0) hasApprovedInAnyType = true
    if (pending > 0) hasPendingInAnyType = true

    if (totalOfType > 1 && (pending > 0 || rejected > 0) && approved > 0) {
      return { canDireccionar: false, status: "warning" as const, typeDetails: typeDetailsArray }
    }
  }

  if (hasMultipleTypesWithContent && hasApprovedInAnyType && hasPendingInAnyType) {
    isDifferentTypePartial = true
  }

  if (totalApproved > 0) {
    return {
      canDireccionar: true,
      status: totalPending > 0 ? "warning" as const : "success" as const,
      hasApproved: true,
      hasPending: totalPending > 0,
      isDifferentTypePartial,
      typeDetails: typeDetailsArray,
    }
  }

  if (totalPending > 0) {
    return { canDireccionar: false, status: "warning" as const, typeDetails: typeDetailsArray }
  }

  return { canDireccionar: true, status: "success" as const, typeDetails: typeDetailsArray }
}

export function PrescripcionTableBody({
  displayed,
  allFiltered,
  dateSort,
  setDateSort,
  direccionamientoStatus,
  noDireccionamientoStatus,
  noDireccionamientoNoAnuladoStatus,
  anulacionStatus,
  openVerModal,
  openNoDireccionamientoModal,
  openAccionesModal,
  handlePrintPrescripcion,
  credentials,
  regimenFilter = "todos",
  setRegimenFilter,
  estJmFilter = "todos",
  setEstJmFilter,
  direccionamientoFilter = "todos",
  setDireccionamientoFilter,
}: PrescripcionTableBodyProps) {
  const [activeRow, setActiveRow] = useState<string | null>(null)
  const [selectedPacienteForModal, setSelectedPacienteForModal] = useState<any>(null)
  const [juntaDataByNoPrescripcion, setJuntaDataByNoPrescripcion] = useState<Record<string, JuntaProfesionalItem[]>>({})
  const [juntaLoadingByNoPrescripcion, setJuntaLoadingByNoPrescripcion] = useState<Record<string, boolean>>({})
  const [juntaErrorByNoPrescripcion, setJuntaErrorByNoPrescripcion] = useState<Record<string, string | null>>({})
  const resolveTokenParamForPrescripcion = (
    presc: any
  ): { key: "tokenSubsidiado" | "tokenContributivo"; value: string } | null => {
    const preferContributivo = presc?.tipoRegimen === "Contributivo"
    const preferSubsidiado = presc?.tipoRegimen === "Subsidiado"
    const tokenSubsidiado = String(credentials.tokenSubsidiado || "").trim()
    const tokenContributivo = String(credentials.tokenContributivo || "").trim()

    if (preferContributivo) {
      if (tokenContributivo) return { key: "tokenContributivo", value: tokenContributivo }
      if (tokenSubsidiado) return { key: "tokenSubsidiado", value: tokenSubsidiado }
      return null
    }

    if (preferSubsidiado) {
      if (tokenSubsidiado) return { key: "tokenSubsidiado", value: tokenSubsidiado }
      if (tokenContributivo) return { key: "tokenContributivo", value: tokenContributivo }
      return null
    }

    if (tokenSubsidiado) return { key: "tokenSubsidiado", value: tokenSubsidiado }
    if (tokenContributivo) return { key: "tokenContributivo", value: tokenContributivo }
    return null
  }

  const normalizeJuntaProfesional = (data: unknown): JuntaProfesionalItem[] => {
    if (!data) return []
    if (Array.isArray(data)) return data as JuntaProfesionalItem[]
    if (typeof data === "object") {
      const record = data as { root?: unknown; data?: unknown; juntaProfesional?: unknown }
      if (Array.isArray(record.root)) return record.root as JuntaProfesionalItem[]
      if (Array.isArray(record.data)) return record.data as JuntaProfesionalItem[]
      if (Array.isArray(record.juntaProfesional)) return record.juntaProfesional as JuntaProfesionalItem[]
    }
    return [data as JuntaProfesionalItem]
  }

  const loadJuntaProfesional = async (presc: any) => {
    const noPrescripcion = String(presc?.NoPrescripcion || "").trim()
    if (!noPrescripcion || juntaLoadingByNoPrescripcion[noPrescripcion] || juntaDataByNoPrescripcion[noPrescripcion]) return

    const tokenParam = resolveTokenParamForPrescripcion(presc)
    if (!credentials.nit || !tokenParam?.value) {
      setJuntaErrorByNoPrescripcion((prev) => ({
        ...prev,
        [noPrescripcion]: "Falta NIT o token para consultar Junta Profesional",
      }))
      return
    }

    setJuntaLoadingByNoPrescripcion((prev) => ({ ...prev, [noPrescripcion]: true }))
    setJuntaErrorByNoPrescripcion((prev) => ({ ...prev, [noPrescripcion]: null }))

    try {
      const qp = new URLSearchParams({
        nit: credentials.nit,
        noPrescripcion,
      })
      qp.set(tokenParam.key, tokenParam.value)

      const endpoint = `/api/mipres/junta-profesionales?${qp.toString()}`
      const response = await fetch(endpoint)
      const result = await response.json()

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Error HTTP ${response.status}`)
      }

      setJuntaDataByNoPrescripcion((prev) => ({
        ...prev,
        [noPrescripcion]: normalizeJuntaProfesional(result.data),
      }))
    } catch (error) {
      setJuntaErrorByNoPrescripcion((prev) => ({
        ...prev,
        [noPrescripcion]: error instanceof Error ? error.message : "Error desconocido",
      }))
    } finally {
      setJuntaLoadingByNoPrescripcion((prev) => ({ ...prev, [noPrescripcion]: false }))
    }
  }

  const renderJuntaContent = (presc: any) => {
    const noPrescripcion = String(presc?.NoPrescripcion || "")
    const loading = Boolean(juntaLoadingByNoPrescripcion[noPrescripcion])
    const error = juntaErrorByNoPrescripcion[noPrescripcion]
    const items = juntaDataByNoPrescripcion[noPrescripcion] || []

    if (loading) {
      return <div className="text-xs text-muted-foreground">Cargando Junta Profesional...</div>
    }

    if (error) {
      return <div className="text-xs text-red-600">{error}</div>
    }

    if (items.length === 0) {
      return <div className="text-xs text-muted-foreground">Sin información de Junta Profesional.</div>
    }

    return (
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {items.map((item, index) => {
          return (
            <div key={`${item.NoPrescripcion || noPrescripcion}-${item.Consecutivo || index}`} className="rounded-md border p-3 space-y-2 bg-background/60">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div><span className="font-medium text-foreground">Modalidad:</span> {(() => {
                  const key = Number(item.Modalidad);
                  return key in MODALIDAD ? MODALIDAD[key as keyof typeof MODALIDAD] : "-";
                })()}</div>
                <div><span className="font-medium text-foreground">Acta:</span> {item.NoActa || "-"}</div>
                <div><span className="font-medium text-foreground">Fecha acta:</span> {item.FechaActa || "-"}</div>
                <div><span className="font-medium text-foreground">Proceso:</span> {item.FProceso || "-"}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="overflow-hidden gap-0 py-0 rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-xs">
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-primary/20 bg-primary text-white whitespace-nowrap">
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-1.5 py-2 sm:px-3 sm:py-3 whitespace-nowrap">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
                  <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white shrink-0" />
                  <span>Prescripción</span>
                </div>
              </th>
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-1 py-2 sm:px-3 sm:py-3 whitespace-nowrap">
                <div className="flex items-center justify-center whitespace-nowrap">
                  <User className="h-3 w-3 text-white shrink-0 sm:hidden" />
                  <span className="hidden sm:inline">Paciente</span>
                </div>
              </th>
              <th className="text-center text-xs font-semibold text-white px-3 py-3 whitespace-nowrap hidden xl:table-cell">
                <button
                  type="button"
                  onClick={() => {
                    setDateSort(
                      dateSort === "none" ? "desc" : dateSort === "desc" ? "asc" : "none"
                    )
                  }}
                  className="flex items-center justify-center gap-1.5 w-full hover:text-white/80 transition-colors cursor-pointer text-white whitespace-nowrap"
                >
                  <Calendar className="h-3.5 w-3.5 text-white shrink-0" />
                  <span className="whitespace-nowrap">Fecha de Prescripción</span>
                  {dateSort === "none" && <ArrowUpDown className="h-3.5 w-3.5 text-white/70 shrink-0" />}
                  {dateSort === "asc" && <ArrowUp className="h-3.5 w-3.5 text-white shrink-0" />}
                  {dateSort === "desc" && <ArrowDown className="h-3.5 w-3.5 text-white shrink-0" />}
                </button>
              </th>
              <th className="text-center text-xs font-semibold text-white px-3 py-3 whitespace-nowrap hidden xl:table-cell">
                <span className="whitespace-nowrap">Estado de Prescripción</span>
              </th>
              <th className="text-center text-xs font-semibold text-white px-3 py-3 whitespace-nowrap hidden xl:table-cell">
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
                      <span className="whitespace-nowrap">Régimen</span>
                      {regimenFilter !== "todos" && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-white text-primary font-semibold shadow-xs shrink-0 whitespace-nowrap">
                          {regimenFilter}
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRegimenFilter?.("todos")
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
                      onClick={() => setRegimenFilter?.("todos")}
                      className={`cursor-pointer ${regimenFilter === "todos" ? "font-semibold bg-accent" : ""}`}
                    >
                      Todos los regímenes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setRegimenFilter?.("Contributivo")}
                      className={`cursor-pointer ${regimenFilter === "Contributivo" ? "font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-blue-500 mr-2 shrink-0" />
                      Contributivo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setRegimenFilter?.("Subsidiado")}
                      className={`cursor-pointer ${regimenFilter === "Subsidiado" ? "font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-emerald-500 mr-2 shrink-0" />
                      Subsidiado
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="text-center text-xs font-semibold text-white px-2.5 py-3 whitespace-nowrap hidden xl:table-cell">
                <span className="whitespace-nowrap">Tecnologías</span>
              </th>
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-1 py-2 sm:px-2 sm:py-3 whitespace-nowrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-md transition-colors cursor-pointer group text-white whitespace-nowrap ${
                        estJmFilter !== "todos"
                          ? "bg-white/20 font-semibold"
                          : "hover:bg-white/15"
                      }`}
                      title="Filtrar por estado de junta profesional"
                    >
                      <span className="hidden sm:inline whitespace-nowrap">Estado Junta</span>
                      <span className="sm:hidden whitespace-nowrap">Junta</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[160px]">
                    <DropdownMenuItem
                      onClick={() => setEstJmFilter?.("todos")}
                      className={`cursor-pointer ${estJmFilter === "todos" ? "font-semibold bg-accent" : ""}`}
                    >
                      Todos los estados JM
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEstJmFilter?.("aprobada")}
                      className={`cursor-pointer ${estJmFilter === "aprobada" ? "font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-emerald-500 mr-2 shrink-0" />
                      Aprobada
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEstJmFilter?.("pendiente")}
                      className={`cursor-pointer ${estJmFilter === "pendiente" ? "font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-amber-500 mr-2 shrink-0" />
                      Pendiente
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEstJmFilter?.("rechazada")}
                      className={`cursor-pointer ${estJmFilter === "rechazada" ? "font-semibold bg-red-50 text-red-700 dark:bg-red-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-red-500 mr-2 shrink-0" />
                      Rechazada
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-1 py-2 sm:px-2 sm:py-3 whitespace-nowrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-md transition-colors cursor-pointer group text-white whitespace-nowrap ${
                        direccionamientoFilter !== "todos"
                          ? "bg-white/20 font-semibold"
                          : "hover:bg-white/15"
                      }`}
                      title="Filtrar por direccionamiento"
                    >
                      <span className="hidden sm:inline whitespace-nowrap">Direccionamiento</span>
                      <span className="sm:hidden whitespace-nowrap">Direcc.</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[180px]">
                    <DropdownMenuItem
                      onClick={() => setDireccionamientoFilter?.("todos")}
                      className={`cursor-pointer ${direccionamientoFilter === "todos" ? "font-semibold bg-accent" : ""}`}
                    >
                      Todos los estados
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDireccionamientoFilter?.("direccionado")}
                      className={`cursor-pointer ${direccionamientoFilter === "direccionado" ? "font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-emerald-500 mr-2 shrink-0" />
                      Direccionado
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDireccionamientoFilter?.("no-direccionado")}
                      className={`cursor-pointer ${direccionamientoFilter === "no-direccionado" ? "font-semibold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-gray-400 mr-2 shrink-0" />
                      Sin Proceso
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDireccionamientoFilter?.("no-direccionamiento")}
                      className={`cursor-pointer ${direccionamientoFilter === "no-direccionamiento" ? "font-semibold bg-red-50 text-red-700 dark:bg-red-950/40" : ""}`}
                    >
                      <span className="size-2 rounded-full bg-red-500 mr-2 shrink-0" />
                      No Direccionamiento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="text-center text-[11px] sm:text-xs font-semibold text-white px-1 py-2 sm:px-2 sm:py-3 whitespace-nowrap w-10 sm:w-16">
                <span className="hidden sm:inline">Acciones</span>
                <span className="sm:hidden">Acc.</span>
              </th>
            </tr>
          </thead>
          <tbody id="prescripcionesTableBody" className="divide-y divide-border/60 dark:divide-border/40">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 text-primary shadow-xs">
                      <Search className="size-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No se encontraron prescripciones</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No hay registros que coincidan con los filtros aplicados en este momento.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayed.map((presc: any, idx) => {
              const medCount = getArray(presc, "medicamentos").length
              const procCount = getArray(presc, "procedimientos").length
              const dispCount = getArray(presc, "dispositivos").length
              const nutrCount = getArray(presc, "productosNutricionales").length
              const servCount = getArray(presc, "serviciosComplementarios").length

              const { canDireccionar, status, isDifferentTypePartial, typeDetails } =
                canDireccionarPrescripcion(presc)
              const hasDireccionamiento = Boolean(
                presc.direccionada || direccionamientoStatus[presc.NoPrescripcion]
              )
              const hasNoDireccionamiento = Boolean(
                noDireccionamientoStatus[presc.NoPrescripcion]
              )

              const rowKey = String(presc.NoPrescripcion ?? idx)
              const isActive = activeRow === rowKey
              const ambitoCode = String(presc.CodAmbAte ?? presc.Ambito ?? "").trim() as keyof typeof AMBITOS_ATENCION
              const ambitoNombre = AMBITOS_ATENCION[ambitoCode] || "Sin ambito"

              return (
                <tr
                  key={rowKey}
                  className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}
                >
                  <td className="px-1.5 py-1.5 sm:px-3 sm:py-2.5 text-center">
                    <div className="inline-flex flex-col items-center justify-center leading-tight gap-0.5 text-center">
                      <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-tight text-primary">
                        {presc.NoPrescripcion ?? "-"}
                      </span>
                      <span className="hidden sm:inline-block text-[10px] text-muted-foreground max-w-[130px] truncate" title={ambitoNombre}>
                        {ambitoNombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-1 py-1.5 sm:px-3 sm:py-2.5 text-center">
                    {/* Vista Mobile: Solo icono de usuario con botón para abrir modal */}
                    <div className="sm:hidden flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPacienteForModal(presc)}
                        className="p-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                        title={`Ver detalles de ${presc.PNPaciente || ""} ${presc.PAPaciente || ""}`}
                      >
                        <User className="size-3.5" />
                      </button>
                    </div>

                    {/* Vista Desktop / Tablet (sm+): Información del paciente */}
                    <div
                      className="hidden sm:inline-flex flex-col items-center justify-center leading-tight gap-0.5 text-center mx-auto"
                      title={`${presc.PNPaciente || ""} ${presc.PAPaciente || ""}`}
                    >
                      <span className="text-xs font-medium truncate max-w-[160px] text-foreground">
                        {presc.PNPaciente} {presc.PAPaciente}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {presc.TipoIDPaciente || "-"} {presc.NroIDPaciente || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center hidden xl:table-cell">
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium">{presc.FPrescripcion?.split("T")[0]}</div>
                      <div className="text-[10px]">{presc.HPrescripcion || "-"}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center hidden xl:table-cell">
                    <Badge
                      variant={presc.EstPres === 4 ? "default" : "destructive"}
                      className={`text-[9px] h-4 px-1.5 whitespace-nowrap ${
                        presc.EstPres === 4
                          ? "bg-emerald-500 hover:bg-emerald-600"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {presc.EstPres === 4
                        ? "Activo"
                        : presc.EstPres === 2
                        ? "Anulado"
                        : `Estado ${presc.EstPres}`}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-center hidden xl:table-cell">
                    <Badge
                      variant="secondary"
                      onClick={() => {
                        if (presc.tipoRegimen && setRegimenFilter) {
                          setRegimenFilter(presc.tipoRegimen === regimenFilter ? "todos" : presc.tipoRegimen)
                        }
                      }}
                      className={`text-[9px] h-4 px-1.5 whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                        presc.tipoRegimen === "Contributivo"
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300"
                          : presc.tipoRegimen === "Subsidiado"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={presc.tipoRegimen ? `Clic para filtrar por ${presc.tipoRegimen}` : undefined}
                    >
                      {presc.tipoRegimen || "Sin regimen"}
                    </Badge>
                  </td>
                  <td className="px-2.5 py-2.5 hidden xl:table-cell">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex flex-nowrap gap-0.5 justify-center whitespace-nowrap">
                      <CategoryBadge
                        icon={Pill}
                        label="Med"
                        count={medCount}
                        colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      />
                      <CategoryBadge
                        icon={Stethoscope}
                        label="Proc"
                        count={procCount}
                        colorClass="bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                      />
                      <CategoryBadge
                        icon={Package}
                        label="Disp"
                        count={dispCount}
                        colorClass="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      />
                      <CategoryBadge
                        icon={Sparkles}
                        label="Nutr"
                        count={nutrCount}
                        colorClass="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      />
                      <CategoryBadge
                        icon={Activity}
                        label="Serv"
                        count={servCount}
                        colorClass="bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                      />
                      </div>
                      {presc.ipsSolicitanteNombre ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-1 max-w-[200px] text-[10px] text-emerald-700 dark:text-emerald-400 font-medium text-center leading-tight hover:underline truncate"
                              title={presc.ipsSolicitanteNombre}
                            >
                              <Building2 className="size-2.5 shrink-0 opacity-70" />
                              <span className="truncate">{presc.ipsSolicitanteNombre}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-3">
                            <div className="space-y-2">
                              {presc.CodDxPpal && (
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Diagnóstico Principal</p>
                                  <p className="text-xs font-medium">{presc.CodDxPpal}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">IPS</p>
                                <p className="text-xs font-medium">{presc.TipoIDIPS} - {presc.NroIDIPS}</p>
                                <p className="text-xs font-medium">{presc.ipsSolicitanteNombre}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Profesional de la Salud</p>
                                {(presc.PNProfS || presc.PAProfS) && (
                                  <p className="text-xs font-medium">{`${presc.PNProfS || ""} ${presc.PAProfS || ""}`.trim()}</p>
                                )}
                                {presc.RegProfS && (
                                  <p className="text-xs font-medium">Registro Profesional {presc.RegProfS}</p>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-1 py-1.5 sm:px-2 sm:py-2.5 text-center">
                    <Popover onOpenChange={(open) => {
                      if (open) {
                        void loadJuntaProfesional(presc)
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-0.5 sm:gap-1"
                          aria-label="Abrir información de Junta Profesional"
                        >
                          {(() => {
                            const TYPE_LABEL: Record<string, string> = { med: "Med", proc: "Proc", disp: "Disp", nutr: "Nutr", serv: "Serv" }
                            const activeTypes = typeDetails.filter((td) => td.approved + td.pending + td.rejected > 0)
                            if (activeTypes.length === 0) {
                              return (
                                <span
                                  className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full inline-block ${status === "error" ? "bg-red-500" : status === "warning" ? "bg-amber-500" : "bg-emerald-500"}`}
                                  title={status === "error" ? "Tecnología rechazada por junta" : status === "warning" ? "Pendiente evaluación junta" : "Tecnología aprobada"}
                                />
                              )
                            }
                            return activeTypes.map((td) => {
                              const ts = td.rejected > 0 ? "error" : td.pending > 0 ? "warning" : "success"
                              const label = TYPE_LABEL[td.type] || td.type
                              return (
                                <span
                                  key={td.type}
                                  className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full inline-block ${ts === "error" ? "bg-red-500" : ts === "warning" ? "bg-amber-500" : "bg-emerald-500"}`}
                                  title={`${label}: ${ts === "error" ? "Rechazada por junta" : ts === "warning" ? "Pendiente evaluación" : "Aprobada"}`}
                                />
                              )
                            })
                          })()}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[88vw] sm:w-96 p-3 sm:p-4 max-w-[360px] sm:max-w-none">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Junta Profesional</p>
                            <p className="text-sm font-medium">{presc.NoPrescripcion}</p>
                          </div>
                          {renderJuntaContent(presc)}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td className="px-1 py-1.5 sm:px-4 sm:py-2.5 text-center">
                    {anulacionStatus[presc.NoPrescripcion] && canDireccionar && !hasNoDireccionamiento ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => { openAccionesModal(presc); setActiveRow(rowKey); }}
                          title="Direccionamiento Anulado - Clic para reactivar"
                        >
                          <span className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-gray-400" />
                        </Button>
                      </div>
                    ) : hasDireccionamiento &&
                    !hasNoDireccionamiento &&
                    !canDireccionarPrescripcion(presc).canDireccionar ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => { openVerModal(presc); setActiveRow(rowKey); }}
                          title={
                            anulacionStatus[presc.NoPrescripcion]
                              ? "Direccionamiento Anulado - Sin proceso"
                              : "Direccionado - Clic para ver detalles"
                          }
                        >
                          <span
                            className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full ${
                              anulacionStatus[presc.NoPrescripcion]
                                ? "bg-gray-400"
                                : "bg-emerald-500"
                            }`}
                          />
                        </Button>
                      </div>
                    ) : hasNoDireccionamiento ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => { openNoDireccionamientoModal(presc); setActiveRow(rowKey); }}
                          title="No Direccionamiento - Clic para ver detalles"
                        >
                          <span className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-red-500" />
                        </Button>
                      </div>
                    ) : hasDireccionamiento && canDireccionar ? (
                      <div className="flex items-center justify-center gap-1">
                        {canDireccionarPrescripcion(presc).isDifferentTypePartial &&
                        canDireccionarPrescripcion(presc).typeDetails &&
                        canDireccionarPrescripcion(presc).typeDetails.length >= 2 ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7"
                              onClick={() => { openVerModal(presc); setActiveRow(rowKey); }}
                              title={anulacionStatus[presc.NoPrescripcion] ? "Direccionamiento Anulado - Sin proceso" : "Direccionado - Ver detalles"}
                            >
                              <span
                                className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full ${
                                  anulacionStatus[presc.NoPrescripcion] ? "bg-gray-400" : "bg-emerald-500"
                                }`}
                              />
                            </Button>
                            <span
                              className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-gray-400"
                              title="En revisión de junta - No disponible para direccionar"
                            />
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-7 sm:w-7"
                            onClick={() => { openVerModal(presc); setActiveRow(rowKey); }}
                            title={
                              anulacionStatus[presc.NoPrescripcion]
                                ? "Direccionamiento Anulado - Sin proceso"
                                : "Direccionado - Clic para ver detalles"
                            }
                          >
                            <span
                              className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full ${
                                anulacionStatus[presc.NoPrescripcion]
                                  ? "bg-gray-400"
                                  : "bg-emerald-500"
                              }`}
                            />
                          </Button>
                        )}
                      </div>
                    ) : canDireccionar ? (
                      <div className="flex items-center justify-center gap-1">
                        {canDireccionarPrescripcion(presc).isDifferentTypePartial &&
                        canDireccionarPrescripcion(presc).typeDetails &&
                        canDireccionarPrescripcion(presc).typeDetails.length >= 2 ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7"
                              onClick={() => { openAccionesModal(presc); setActiveRow(rowKey); }}
                              title="Direccionar tecnologías aprobadas"
                            >
                              <span className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-gray-400" />
                            </Button>
                            <span
                              className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-gray-400"
                              title="En revisión de junta - No disponible para direccionar"
                            />
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-7 sm:w-7"
                            onClick={() => { openAccionesModal(presc); setActiveRow(rowKey); }}
                            title="Direccionar tecnologías"
                          >
                            <span className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-gray-400" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        {canDireccionarPrescripcion(presc).status === "warning" ? (
                          <span
                            className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-gray-400"
                            title="Pendiente evaluación de junta - Intente más tarde"
                          />
                        ) : (
                          <span
                            className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-gray-400"
                            title="Tecnología rechazada - Contacte con administrador"
                          />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-1 py-1.5 sm:px-2 sm:py-2.5 text-center w-10 sm:w-16">
                    <div className="flex justify-center items-center">
                      <div className="relative group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => { handlePrintPrescripcion(presc); setActiveRow(rowKey); }}
                          title="Guardar como PDF"
                        >
                          <Printer className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                        </Button>
                        <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10">
                          Guardar como PDF
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            }))}
          </tbody>
        </table>
      </div>

      {selectedPacienteForModal && (
        <InfoMobileModal
          prescripcion={selectedPacienteForModal}
          open={Boolean(selectedPacienteForModal)}
          onClose={() => setSelectedPacienteForModal(null)}
        />
      )}
    </Card>
  )
}

