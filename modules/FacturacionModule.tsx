"use client"

import { useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, FileText, FileSpreadsheet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { FacturacionHeader } from "./module-facturacion/FacturacionHeader"
import { toast } from "sonner"
import type { MipresCredentials } from "@/models/credentials.model"
import type { Facturacion } from "@/models/mipres-sispro/facturacion/facturacion"
import { FacturacionSearchDate } from "./module-facturacion/FacturacionSearchDate"
import { FacturacionSearchPrescripcion } from "./module-facturacion/FacturacionSearchPrescripcion"
import { FacturacionTable, FacturacionPlantilla } from "@/components/mipres/component-facturacion"
import { FacturacionDetalleModal } from "@/components/mipres/component-facturacion/FacturacionDetalleView"
import {
  exceedsThreeMonthRange,
  getThreeMonthRangeErrorMessage,
  getTodayIsoLocal,
  getStartOfCurrentWeekMondayIsoLocal,
} from "@/lib/config/date-range"

interface FacturacionModuleProps {
  credentials: MipresCredentials
}

export function FacturacionModule({ credentials }: FacturacionModuleProps) {
  const hoy = getTodayIsoLocal()
  const inicioSemana = getStartOfCurrentWeekMondayIsoLocal()

  const [activeTab, setActiveTab] = useState("fecha")
  const [selectedFac, setSelectedFac] = useState<Facturacion | null>(null)
  const [detalleOpen, setDetalleOpen] = useState(false)

  // Estado tab fecha
  const [fechaInicio, setFechaInicio] = useState(inicioSemana)
  const [fechaFin, setFechaFin] = useState(hoy)
  const [resultsFecha, setResultsFecha] = useState<Facturacion[]>([])
  const [loadingFecha, setLoadingFecha] = useState(false)
  const [errorFecha, setErrorFecha] = useState<string | null>(null)
  const [loadingRango, setLoadingRango] = useState(false)
  const [rangoProgress, setRangoProgress] = useState(0)
  const [rangoInfo, setRangoInfo] = useState<string | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Datos facturados bulk check
  const [keysConDatosFecha, setKeysConDatosFecha] = useState<Set<string> | null>(null)
  const [idsConDatosFecha, setIdsConDatosFecha] = useState<Record<string, number> | null>(null)
  const [loadingDatosFecha, setLoadingDatosFecha] = useState(false)
  const [keysConDatosPresc, setKeysConDatosPresc] = useState<Set<string> | null>(null)
  const [idsConDatosPresc, setIdsConDatosPresc] = useState<Record<string, number> | null>(null)
  const [loadingDatosPresc, setLoadingDatosPresc] = useState(false)

  // Estado tab prescripción
  const [noPrescripcion, setNoPrescripcion] = useState("")
  const [resultsPresc, setResultsPresc] = useState<Facturacion[]>([])
  const [loadingPresc, setLoadingPresc] = useState(false)
  const [errorPresc, setErrorPresc] = useState<string | null>(null)

  const isConfigured = Boolean(
    credentials.nit &&
      (credentials.tokenAcceso || credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo)
  )

  const token =
    credentials.tokenAcceso ||
    credentials.tokenAccesoSubsidiado ||
    credentials.tokenAccesoContributivo ||
    ""

  const handleRegistrarDatos = async (fac: Facturacion) => {
    const params = new URLSearchParams({ nit: credentials.nit })
    if (token) params.set("tokenAcceso", token)

    const res = await fetch(`/api/mipres/datos-facturados?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID: fac.ID }),
    })

    const result = await res.json()

    if (!res.ok || !result.success) {
      toast.error(result.error || "Error al registrar datos facturado")
      throw new Error(result.error)
    }

    const rowKey = `${fac.NoPrescripcion}-${fac.ConTec}-${fac.NoEntrega}`
    setKeysConDatosFecha((prev) => new Set([...(prev ?? []), rowKey]))
    setKeysConDatosPresc((prev) => new Set([...(prev ?? []), rowKey]))
    toast.success("Datos facturado registrado correctamente")
  }

  const bulkQueryDatosFacturados = async (
    facturaciones: Facturacion[]
  ): Promise<{ keys: Set<string>; ids: Record<string, number> }> => {
    const uniquePresc = [...new Set(facturaciones.map((f) => f.NoPrescripcion))]
    const keysWithDatos = new Set<string>()
    const idsByKey: Record<string, number> = {}
    const CHUNK = 10

    for (let i = 0; i < uniquePresc.length; i += CHUNK) {
      const chunk = uniquePresc.slice(i, i + CHUNK)
      const results = await Promise.all(
        chunk.map(async (noPrescripcion) => {
          const params = new URLSearchParams({ nit: credentials.nit, noPrescripcion })
          if (token) params.set("tokenAcceso", token)
          try {
            const res = await fetch(`/api/mipres/datos-facturados?${params.toString()}`)
            return res.ok ? res.json() : { success: false, keys: [], idsByKey: {} }
          } catch {
            return { success: false, keys: [], idsByKey: {} }
          }
        })
      )
      for (const r of results) {
        if (r.success && Array.isArray(r.keys)) {
          for (const k of r.keys) keysWithDatos.add(k)
        }
        if (r.success && r.idsByKey && typeof r.idsByKey === "object") {
          Object.assign(idsByKey, r.idsByKey)
        }
      }
    }

    return { keys: keysWithDatos, ids: idsByKey }
  }

  const handleAnularDatos = async (fac: Facturacion, idDatosFacturado: number) => {
    const params = new URLSearchParams({ nit: credentials.nit })
    if (token) params.set("tokenAcceso", token)

    const res = await fetch(`/api/mipres/datos-facturados?${params.toString()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ IDDatosFacturado: idDatosFacturado }),
    })

    const result = await res.json()

    if (!res.ok || !result.success) {
      toast.error(result.error || "Error al anular datos facturado")
      throw new Error(result.error)
    }

    const rowKey = `${fac.NoPrescripcion}-${fac.ConTec}-${fac.NoEntrega}`
    setKeysConDatosFecha((prev) => {
      if (!prev) return prev
      const next = new Set(prev)
      next.delete(rowKey)
      return next
    })
    setKeysConDatosPresc((prev) => {
      if (!prev) return prev
      const next = new Set(prev)
      next.delete(rowKey)
      return next
    })
    setIdsConDatosFecha((prev) => {
      if (!prev) return prev
      const { [rowKey]: _omit, ...rest } = prev
      return rest
    })
    setIdsConDatosPresc((prev) => {
      if (!prev) return prev
      const { [rowKey]: _omit, ...rest } = prev
      return rest
    })
    toast.success("Datos facturado anulado correctamente")
  }

  const handleSearchFecha = async () => {
    if (!fechaInicio) return

    const esRango = Boolean(fechaFin && fechaFin !== fechaInicio)

    if (esRango && exceedsThreeMonthRange(fechaInicio, fechaFin)) {
      toast.error(getThreeMonthRangeErrorMessage())
      return
    }

    setLoadingFecha(true)
    setErrorFecha(null)
    setResultsFecha([])
    setKeysConDatosFecha(null)
    setIdsConDatosFecha(null)
    setLoadingDatosFecha(false)
    setRangoProgress(0)
    setRangoInfo(null)

    if (esRango) {
      setLoadingRango(true)
      setRangoProgress(10)
      setRangoInfo("Consultando rango de fechas en paralelo...")
      progressIntervalRef.current = setInterval(() => {
        setRangoProgress((prev) => (prev >= 85 ? prev : prev + Math.random() * 8))
      }, 500)
    }

    try {
      const params = new URLSearchParams({ nit: credentials.nit, tipo: esRango ? "rango" : "fecha" })
      if (token) params.set("tokenAcceso", token)
      if (esRango) {
        params.set("fechaInicio", fechaInicio)
        params.set("fechaFin", fechaFin)
      } else {
        params.set("fecha", fechaInicio)
      }

      const response = await fetch(`/api/mipres/facturacion?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        const data: Facturacion[] = Array.isArray(result.data) ? result.data : []
        setResultsFecha(data)
        if (esRango) {
          setRangoProgress(100)
          setRangoInfo(
            `Completado: ${data.length} registro${data.length !== 1 ? "s" : ""} encontrado${data.length !== 1 ? "s" : ""}`
          )
        }
        if (data.length > 0) {
          setLoadingDatosFecha(true)
          bulkQueryDatosFacturados(data)
            .then(({ keys, ids }) => {
              setKeysConDatosFecha(keys)
              setIdsConDatosFecha(ids)
            })
            .finally(() => setLoadingDatosFecha(false))
        }
      } else {
        setErrorFecha(result.error || "No se encontraron registros de facturación")
      }
    } catch {
      setErrorFecha("Error al consultar facturación")
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setLoadingFecha(false)
      setLoadingRango(false)
    }
  }

  const handleSearchPresc = async () => {
    setLoadingPresc(true)
    setErrorPresc(null)
    setResultsPresc([])
    setKeysConDatosPresc(null)
    setIdsConDatosPresc(null)
    setLoadingDatosPresc(false)

    try {
      const prescripcionFinal = noPrescripcion.trim()
      if (!prescripcionFinal) { setErrorPresc("Ingrese el número de prescripción"); return }

      const params = new URLSearchParams({ nit: credentials.nit, tipo: "prescripcion", noPrescripcion: prescripcionFinal })
      if (token) params.set("tokenAcceso", token)

      const response = await fetch(`/api/mipres/facturacion?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        const raw = Array.isArray(result.data) ? result.data : []
        const sorted = [...raw].sort((a, b) => {
          if (a.ConTec !== b.ConTec) return a.ConTec - b.ConTec
          return a.NoEntrega - b.NoEntrega
        })
        setResultsPresc(sorted)
        if (sorted.length > 0) {
          setLoadingDatosPresc(true)
          bulkQueryDatosFacturados(sorted)
            .then(({ keys, ids }) => {
              setKeysConDatosPresc(keys)
              setIdsConDatosPresc(ids)
            })
            .finally(() => setLoadingDatosPresc(false))
        }
      } else {
        setErrorPresc(result.error || "No se encontraron registros de facturación")
      }
    } catch {
      setErrorPresc("Error al consultar facturación")
    } finally {
      setLoadingPresc(false)
    }
  }

  return (
    <div className="space-y-6">
      {!detalleOpen && <FacturacionHeader isConfigured={isConfigured} />}

      {!detalleOpen && <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted h-auto gap-1">
          <TabsTrigger
            value="fecha"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Por Fecha
          </TabsTrigger>
          <TabsTrigger
            value="prescripcion"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileText className="h-4 w-4 mr-2" />
            Por Prescripción
          </TabsTrigger>
          <TabsTrigger
            value="plantilla"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Plantilla
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fecha">
          <div className="space-y-4">
            <FacturacionSearchDate
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              hoy={hoy}
              loading={loadingFecha}
              loadingRango={loadingRango}
              rangoProgress={rangoProgress}
              rangoInfo={rangoInfo}
              isConfigured={isConfigured}
              onFechaInicioChange={setFechaInicio}
              onFechaFinChange={setFechaFin}
              onSearch={handleSearchFecha}
            />
            {errorFecha && (
              <Alert variant="destructive">
                <AlertDescription>{errorFecha}</AlertDescription>
              </Alert>
            )}
            {!loadingFecha && resultsFecha.length === 0 && !errorFecha && (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">No hay Facturaciones para mostrar</p>
                </CardContent>
              </Card>
            )}
            {resultsFecha.length > 0 && (
              <FacturacionTable
                facturaciones={resultsFecha}
                keysConDatos={keysConDatosFecha ?? undefined}
                idsConDatos={idsConDatosFecha ?? undefined}
                loadingDatos={loadingDatosFecha}
                onRegistrar={handleRegistrarDatos}
                onAnular={handleAnularDatos}
                onOpenDetalle={(fac) => { setSelectedFac(fac); setDetalleOpen(true) }}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="prescripcion">
          <div className="space-y-4">
            <FacturacionSearchPrescripcion
              noPrescripcion={noPrescripcion}
              loading={loadingPresc}
              isConfigured={isConfigured}
              onNoPrescripcionChange={setNoPrescripcion}
              onSearch={handleSearchPresc}
            />
            {errorPresc && (
              <Alert variant="destructive">
                <AlertDescription>{errorPresc}</AlertDescription>
              </Alert>
            )}
            {!loadingPresc && resultsPresc.length === 0 && !errorPresc && (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">No hay Facturaciones para mostrar</p>
                </CardContent>
              </Card>
            )}
            {resultsPresc.length > 0 && (
              <FacturacionTable
                facturaciones={resultsPresc}
                keysConDatos={keysConDatosPresc ?? undefined}
                idsConDatos={idsConDatosPresc ?? undefined}
                loadingDatos={loadingDatosPresc}
                onRegistrar={handleRegistrarDatos}
                onAnular={handleAnularDatos}
                onOpenDetalle={(fac) => { setSelectedFac(fac); setDetalleOpen(true) }}
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="plantilla">
          <FacturacionPlantilla />
        </TabsContent>
      </Tabs>}

      <FacturacionDetalleModal
        facturacion={selectedFac}
        open={detalleOpen}
        onClose={() => {
          setDetalleOpen(false)
          setSelectedFac(null)
        }}
      />
    </div>
  )
}
