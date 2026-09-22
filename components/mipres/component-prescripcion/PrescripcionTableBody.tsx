import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { CategoryBadge } from "./CategoryBadge"
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
} from "lucide-react"
import type { Prescripcion } from "@/models/mipres-sispro/prescripcion"
import type { MipresCredentials } from "@/models/credentials.model"
import { Card } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
}: PrescripcionTableBodyProps) {
  const [activeRow, setActiveRow] = useState<string | null>(null)
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
    <Card className="overflow-hidden gap-0 py-0">
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex items-center justify-center gap-1.5">
                  <Hash className="h-3 w-3" />
                  Prescripción
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
                    setDateSort(
                      dateSort === "none" ? "desc" : dateSort === "desc" ? "asc" : "none"
                    )
                  }}
                  className="flex items-center justify-center gap-1.5 w-full hover:text-foreground transition-colors cursor-pointer"
                >
                  <Calendar className="h-3 w-3" />
                  Fecha de Prescripción
                  {dateSort === "none" && <ArrowUpDown className="h-3 w-3" />}
                  {dateSort === "asc" && <ArrowUp className="h-3 w-3" />}
                  {dateSort === "desc" && <ArrowDown className="h-3 w-3" />}
                </button>
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex items-center justify-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Estado de Prescripcion
                </div>
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                Tipo de regimen
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                Tecnologías prescritas
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex items-center justify-center gap-1.5">
                  Estado Junta
                  <Info className="h-3 w-3" />
                </div>
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
                        <span>Sin proceso</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
                        <span>Direccionamiento</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
                        <span>No direccionamiento</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" />
                        <span>Anulada</span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-4">
                <div className="flex justify-center">
                  <span className="inline-block w-40 text-center">Acciones</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody id="prescripcionesTableBody" className="divide-y">
            {displayed.map((presc: any, idx) => {
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
                  key={presc.NoPrescripcion ?? idx}
                  className={`transition-colors hover:bg-muted/30${isActive ? " bg-emerald-50 dark:bg-zinc-800/80" : ""}`}
                >
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span className="font-mono text-xs font-medium text-primary">
                        {presc.NoPrescripcion ?? "-"}
                      </span>
                      <span className="text-[10px] text-muted-foreground max-w-[160px] truncate">
                        {ambitoNombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex flex-col items-center justify-center leading-tight gap-1">
                      <span className="text-xs font-medium truncate max-w-[140px]">
                        {presc.PNPaciente} {presc.PAPaciente}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {presc.TipoIDPaciente || "-"} {presc.NroIDPaciente || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium">{presc.FPrescripcion?.split("T")[0]}</div>
                      <div className="text-[10px]">{presc.HPrescripcion || "-"}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
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
                  <td className="px-4 py-2.5 text-center">
                    <Badge
                      variant="secondary"
                      className={`text-[9px] h-4 px-1.5 whitespace-nowrap ${
                        presc.tipoRegimen === "Contributivo"
                          ? "bg-blue-100 text-blue-700"
                          : presc.tipoRegimen === "Subsidiado"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {presc.tipoRegimen || "Sin regimen"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex flex-nowrap gap-0.5 justify-center whitespace-nowrap">
                      <CategoryBadge
                        icon={Pill}
                        label="Med"
                        count={medCount}
                        colorClass="bg-emerald-100 text-emerald-700"
                      />
                      <CategoryBadge
                        icon={Stethoscope}
                        label="Proc"
                        count={procCount}
                        colorClass="bg-sky-100 text-sky-700"
                      />
                      <CategoryBadge
                        icon={Package}
                        label="Disp"
                        count={dispCount}
                        colorClass="bg-amber-100 text-amber-700"
                      />
                      <CategoryBadge
                        icon={Sparkles}
                        label="Nutr"
                        count={nutrCount}
                        colorClass="bg-rose-100 text-rose-700"
                      />
                      <CategoryBadge
                        icon={Activity}
                        label="Serv"
                        count={servCount}
                        colorClass="bg-violet-100 text-violet-700"
                      />
                      </div>
                      {presc.ipsSolicitanteNombre ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-block max-w-[260px] whitespace-nowrap text-[10px] text-green-700 font-medium text-center leading-tight hover:underline"
                            >
                              {presc.ipsSolicitanteNombre}
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
                  <td className="px-4 py-2.5 text-center">
                    <Popover onOpenChange={(open) => {
                      if (open) {
                        void loadJuntaProfesional(presc)
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-1"
                          aria-label="Abrir información de Junta Profesional"
                        >
                          {(() => {
                            const TYPE_LABEL: Record<string, string> = { med: "Med", proc: "Proc", disp: "Disp", nutr: "Nutr", serv: "Serv" }
                            const activeTypes = typeDetails.filter((td) => td.approved + td.pending + td.rejected > 0)
                            if (activeTypes.length === 0) {
                              return (
                                <span
                                  className={`h-3.5 w-3.5 rounded-full inline-block ${status === "error" ? "bg-red-500" : status === "warning" ? "bg-amber-500" : "bg-emerald-500"}`}
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
                                  className={`h-3.5 w-3.5 rounded-full inline-block ${ts === "error" ? "bg-red-500" : ts === "warning" ? "bg-amber-500" : "bg-emerald-500"}`}
                                  title={`${label}: ${ts === "error" ? "Rechazada por junta" : ts === "warning" ? "Pendiente evaluación" : "Aprobada"}`}
                                />
                              )
                            })
                          })()}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-4">
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
                  <td className="px-4 py-2.5 text-center">
                    {anulacionStatus[presc.NoPrescripcion] && canDireccionar && !hasNoDireccionamiento ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { openAccionesModal(presc); setActiveRow(rowKey); }}
                          title="Direccionamiento Anulado - Clic para reactivar"
                        >
                          <span className="h-3.5 w-3.5 rounded-full bg-gray-400" />
                        </Button>
                      </div>
                    ) : hasDireccionamiento &&
                    !hasNoDireccionamiento &&
                    !canDireccionarPrescripcion(presc).canDireccionar ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { openVerModal(presc); setActiveRow(rowKey); }}
                          title={
                            anulacionStatus[presc.NoPrescripcion]
                              ? "Direccionamiento Anulado - Sin proceso"
                              : "Direccionado - Clic para ver detalles"
                          }
                        >
                          <span
                            className={`h-3.5 w-3.5 rounded-full ${
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
                          className="h-7 w-7"
                          onClick={() => { openNoDireccionamientoModal(presc); setActiveRow(rowKey); }}
                          title="No Direccionamiento - Clic para ver detalles"
                        >
                          <span className="h-3.5 w-3.5 rounded-full bg-red-500" />
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
                              className="h-7 w-7"
                              onClick={() => { openVerModal(presc); setActiveRow(rowKey); }}
                              title={anulacionStatus[presc.NoPrescripcion] ? "Direccionamiento Anulado - Sin proceso" : "Direccionado - Ver detalles"}
                            >
                              <span
                                className={`h-3.5 w-3.5 rounded-full ${
                                  anulacionStatus[presc.NoPrescripcion] ? "bg-gray-400" : "bg-emerald-500"
                                }`}
                              />
                            </Button>
                            <span
                              className="h-3.5 w-3.5 rounded-full bg-gray-400"
                              title="En revisión de junta - No disponible para direccionar"
                            />
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { openVerModal(presc); setActiveRow(rowKey); }}
                            title={
                              anulacionStatus[presc.NoPrescripcion]
                                ? "Direccionamiento Anulado - Sin proceso"
                                : "Direccionado - Clic para ver detalles"
                            }
                          >
                            <span
                              className={`h-3.5 w-3.5 rounded-full ${
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
                              className="h-7 w-7"
                              onClick={() => { openAccionesModal(presc); setActiveRow(rowKey); }}
                              title="Direccionar tecnologías aprobadas"
                            >
                              <span className="h-3.5 w-3.5 rounded-full bg-gray-400" />
                            </Button>
                            <span
                              className="h-3.5 w-3.5 rounded-full bg-gray-400"
                              title="En revisión de junta - No disponible para direccionar"
                            />
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { openAccionesModal(presc); setActiveRow(rowKey); }}
                            title="Direccionar tecnologías"
                          >
                            <span className="h-3.5 w-3.5 rounded-full bg-gray-400" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        {canDireccionarPrescripcion(presc).status === "warning" ? (
                          <span
                            className="h-3.5 w-3.5 rounded-full bg-gray-400"
                            title="Pendiente evaluaciÃ³n de junta - Intente mÃ¡s tarde"
                          />
                        ) : (
                          <span
                            className="h-3.5 w-3.5 rounded-full bg-gray-400"
                            title="TecnologÃ­a rechazada - Contacte con administrador"
                          />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end">
                      <div className="w-40 flex justify-center items-center gap-1">
                        <div className="relative group">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { handlePrintPrescripcion(presc); setActiveRow(rowKey); }}
                          >
                            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                            Guardar como PDF
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
  )
}

