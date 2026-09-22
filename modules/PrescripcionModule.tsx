"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, User, FileText, RefreshCw, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PrescripcionTable } from "@/components/mipres/component-prescripcion/PrescripcionTable"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import {
  exceedsThreeMonthRange,
  getStartOfCurrentWeekMondayIsoLocal,
  getThreeMonthRangeErrorMessage,
  getTodayIsoLocal,
} from "@/lib/config/date-range"
import type { MipresCredentials } from "@/models/credentials.model"
import type { Prescripcion, NovedadPrescripcion } from "@/models/mipres-sispro/prescripcion"
import {
  PrescripcionHeader,
  PrescripcionSearchDate,
  PrescripcionSearchPatient,
  PrescripcionSearchNumber,
  PrescripcionSearchNovedades,
} from "./module-prescripcion"
import { NovedadesTable } from "@/components/mipres/component-prescripcion/NovedadesTable"

interface PrescripcionModuleProps {
  credentials: MipresCredentials
}

interface ApiResponse {
  success: boolean
  data?: any[]
  total?: number
  error?: string
  details?: string
  rango?: { fechaInicio: string; fechaFin: string }
}

export function PrescripcionModule({ credentials }: PrescripcionModuleProps) {
  const hoy = getTodayIsoLocal()
  const inicioSemana = getStartOfCurrentWeekMondayIsoLocal()
  const [fechaInicio, setFechaInicio] = useState(inicioSemana)
  const [fechaFin, setFechaFin] = useState(hoy)
  const [tipoDoc, setTipoDoc] = useState("")
  const [numDoc, setNumDoc] = useState("")
  const [noPresc, setNoPresc] = useState("")
  const [fechaNov, setFechaNov] = useState("")
  const [fechaPac, setFechaPac] = useState("")
  const [fechaFinPac, setFechaFinPac] = useState("") // Fecha fin opcional para busqueda por paciente
  const [loading, setLoading] = useState(false)
  const [loadingRango, setLoadingRango] = useState(false)
  const [rangoProgress, setRangoProgress] = useState(0)
  const [rangoInfo, setRangoInfo] = useState<string | null>(null)
  const [results, setResults] = useState<Prescripcion[] | NovedadPrescripcion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [direccionamientoFormOpen, setDireccionamientoFormOpen] = useState(false)
  const [queryType, setQueryType] = useState<string>("fecha")
  const [activeTab, setActiveTab] = useState("fecha")
  
  const { fetchPrescripciones, invalidatePrescripciones } = useMipresQueryClient()

  // Limpiar resultados y errores al cambiar de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setResults([])
    setError(null)
    setRangoProgress(0)
    setRangoInfo(null)
  }

  const handleSearchPaciente = async () => {
    if (!credentials.nit || !credentials.tokenSubsidiado || !credentials.tokenContributivo) {
      setError("Por favor configure las credenciales (NIT y Tokens raw) en el modulo de Configuracion")
      return
    }

    if (!credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
      setError("Por favor valide credenciales para obtener los tokens de acceso (Subsidiado y Contributivo)")
      return
    }

    if (!numDoc) {
      setError("Ingrese numero de documento")
      return
    }

    const fechaInicial = String(fechaPac || "").trim()
    const fechaFinal = String(fechaFinPac || "").trim()
    const usarBusquedaSinFechas = !fechaInicial && !fechaFinal
    const esRango = !usarBusquedaSinFechas && !!fechaFinal

    if (!usarBusquedaSinFechas && !tipoDoc) {
      setError("Ingrese tipo de documento")
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setQueryType("paciente")
    setRangoProgress(0)
    setRangoInfo(null)

    let progressInterval: ReturnType<typeof setInterval> | null = null

    if (esRango) {
      setLoadingRango(true)
      setRangoProgress(10)
      setRangoInfo("Consultando historial del paciente en hilos paralelos...")
      progressInterval = setInterval(() => {
        setRangoProgress((prev) => (prev >= 85 ? prev : prev + Math.random() * 8))
      }, 500)
    }

    try {
      if (usarBusquedaSinFechas) {
        const response = await fetch(
          `/api/mipres/prescripciones/prescripciones-por-paciente?numero_documento=${encodeURIComponent(numDoc.trim())}`
        )

        const payload = await response.json()
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || "No se pudieron obtener prescripciones por paciente")
        }

        const numerosPrescripcion: string[] = Array.isArray(payload?.data)
          ? payload.data.map((n: unknown) => String(n || "").trim()).filter(Boolean)
          : []

        if (numerosPrescripcion.length === 0) {
          setResults([])
          toast.info("No se encontraron prescripciones para el documento consultado")
          return
        }

        const unicos: string[] = Array.from(new Set(numerosPrescripcion))
        const consultas = await Promise.allSettled(
          unicos.map((noPrescripcion) =>
            fetchPrescripciones(credentials, "numero", { noPrescripcion })
          )
        )

        const merged = consultas
          .filter((item): item is PromiseFulfilledResult<Prescripcion[]> => item.status === "fulfilled")
          .flatMap((item) => item.value)

        const dedup = new Map<string, Prescripcion>()
        merged.forEach((presc) => {
          const key = `${presc.NoPrescripcion || ""}-${presc.tipoRegimen || ""}`
          if (!dedup.has(key)) dedup.set(key, presc)
        })

        const finalResults = Array.from(dedup.values())
        setResults(finalResults)
        toast.success(`Se encontraron ${finalResults.length} prescripciones por documento`)
        return
      }

      let params: Record<string, string> = { tipoDoc, numDoc }

      if (esRango) {
        if (exceedsThreeMonthRange(fechaInicial, fechaFinal)) {
          const rangeError = getThreeMonthRangeErrorMessage()
          toast.error(rangeError)
          throw new Error(rangeError)
        }

        if (fechaFinal < fechaInicial) {
          throw new Error("La fecha final no puede ser menor a la fecha inicial")
        }

        params = { ...params, fechaInicio: fechaInicial, fechaFin: fechaFinal }
      } else {
        params = { ...params, fecha: fechaInicial }
      }

      // Usar "paciente-rango" si es por paciente con fechas múltiples
      // "paciente" si es fecha única
      const tipoConsulta = esRango ? "paciente-rango" : "paciente"
      
      const result = await fetchPrescripciones(credentials, tipoConsulta as any, params as any)
      setResults(result)

      if (esRango) {
        setRangoProgress(100)
        setRangoInfo("Consulta finalizada")
        if (result.length > 1) {
          toast.info(`Se encontraron ${result.length} prescripciones para este paciente en el rango seleccionado.`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de conexion con el servidor"
      setError(msg)
      const errWithDetails = err as { details?: { subsidiado?: string; contributivo?: string } }
      if (errWithDetails?.details) {
        // Show details if provided (subsidiado / contributivo)
        try {
          const details = errWithDetails.details
          if (details.subsidiado) toast.error(details.subsidiado)
          if (details.contributivo) toast.error(details.contributivo)
        } catch {
          // ignore
        }
      }
    } finally {
      if (progressInterval) clearInterval(progressInterval)
      setLoading(false)
      setLoadingRango(false)
      setTimeout(() => {
        setRangoProgress(0)
        setRangoInfo(null)
      }, 1000)
    }
  }

  /**
   * Busqueda generica para numero y novedades.
   */
  const handleSearch = async (type: string) => {
    if (!credentials.nit || !credentials.tokenSubsidiado || !credentials.tokenContributivo) {
      setError("Por favor configure las credenciales (NIT y Tokens raw) en el modulo de Configuracion")
      return
    }

    if (!credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
      setError("Por favor valide credenciales para obtener los tokens de acceso (Subsidiado y Contributivo)")
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setQueryType(type)

    try {
      let params: Record<string, string> = {}

      switch (type) {
        case "numero":
          if (!noPresc) {
            setError("Ingrese el numero de prescripcion")
            setLoading(false)
            return
          }
          params = { noPrescripcion: noPresc }
          break
        case "novedades":
          if (!fechaNov) {
            setError("Ingrese la fecha de novedades")
            setLoading(false)
            return
          }
          params = { fecha: fechaNov }
          break
      }

      // Usar fetchPrescripciones de TanStack Query (cachea automáticamente)
      const result = await fetchPrescripciones(credentials, type as any, params as any)
      setResults(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de conexion con el servidor"
      setError(msg)
      const errWithDetails = err as { details?: { subsidiado?: string; contributivo?: string } }
      if (errWithDetails?.details) {
        try {
          const details = errWithDetails.details
          if (details.subsidiado) toast.error(details.subsidiado)
          if (details.contributivo) toast.error(details.contributivo)
        } catch {}
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Busqueda por fecha. Siempre usa /api/mipres/prescripciones/rango.
   * - Solo fechaInicio: 1 peticion al API de MIPRES (fecha unica).
   * - fechaInicio + fechaFin: N peticiones en hilos (5 concurrentes).
   * Toda la logica de generar rango, validar y ejecutar en chunks esta en el controller.
   */
  const handleSearchFecha = async () => {
    if (!credentials.nit || !credentials.tokenSubsidiado || !credentials.tokenContributivo) {
      setError("Por favor configure las credenciales (NIT y Tokens raw) en el modulo de Configuracion")
      return
    }

    if (!credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
      setError("Por favor valide credenciales para obtener los tokens de acceso (Subsidiado y Contributivo)")
      return
    }

    if (!fechaInicio) {
      setError("Ingrese la fecha de inicio")
      return
    }

    const esRango = !!fechaFin

    if (esRango && exceedsThreeMonthRange(fechaInicio, fechaFin)) {
      const rangeError = getThreeMonthRangeErrorMessage()
      setError(rangeError)
      toast.error(rangeError)
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setQueryType("fecha")
    setRangoProgress(0)
    setRangoInfo(null)

    let progressInterval: ReturnType<typeof setInterval> | null = null

    if (esRango) {
      setLoadingRango(true)
      setRangoProgress(10)
      setRangoInfo("Consultando rango de fechas en hilos paralelos...")
      progressInterval = setInterval(() => {
        setRangoProgress((prev) => (prev >= 85 ? prev : prev + Math.random() * 8))
      }, 500)
    }

    try {
      // Si solo fechaInicio -> tipo=fecha con fecha=fechaInicio
      // Si ambas -> tipo=rango con fechaInicio y fechaFin
      const tipo = esRango ? "rango" : "fecha"
      const params = esRango
        ? { fechaInicio, fechaFin }
        : { fecha: fechaInicio }

      // Usar fetchPrescripciones de TanStack Query (cachea automáticamente)
      const result = await fetchPrescripciones(credentials, tipo as any, params as any)

      if (progressInterval) clearInterval(progressInterval)
      if (esRango) setRangoProgress(95)

      setResults(result)

      if (esRango) {
        setRangoProgress(100)
        const total = result.length
        setRangoInfo(
          `Completado: ${total} prescripcion${total !== 1 ? "es" : ""} encontrada${total !== 1 ? "s" : ""}`
        )
      }
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval)
      const msg = err instanceof Error ? err.message : "Error de conexion con el servidor"
      setError(msg)
      const errWithDetails = err as { details?: { subsidiado?: string; contributivo?: string } }
      if (errWithDetails?.details) {
        try {
          const details = errWithDetails.details
          if (details.subsidiado) toast.error(details.subsidiado)
          if (details.contributivo) toast.error(details.contributivo)
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false)
      setLoadingRango(false)
    }
  }

  const refreshAfterDireccionamiento = async () => {
    if (!credentials.nit || !credentials.tokenSubsidiado || !credentials.tokenContributivo) {
      return
    }

    if (!credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
      return
    }

    let tipo: "fecha" | "paciente" | "numero" | "rango" | "novedades" = "fecha"
    let params: Record<string, string> = {}

    if (queryType === "fecha") {
      const esRango = Boolean(fechaFin)
      tipo = esRango ? "rango" : "fecha"
      params = esRango ? { fechaInicio, fechaFin } : { fecha: fechaInicio }
    } else if (queryType === "paciente") {
      if (!fechaPac || !tipoDoc || !numDoc) return
      tipo = "paciente"
      params = { fecha: fechaPac, tipoDoc, numDoc }
    } else if (queryType === "numero") {
      if (!noPresc) return
      tipo = "numero"
      params = { noPrescripcion: noPresc }
    } else if (queryType === "novedades") {
      if (!fechaNov) return
      tipo = "novedades"
      params = { fecha: fechaNov }
    }

    setError(null)

    try {
      await invalidatePrescripciones(credentials.nit)
      const result = await fetchPrescripciones(credentials, tipo as any, params as any)
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion con el servidor")
    }
  }

  const isConfigured = credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo

  return (
    <div className="space-y-6">
      {!direccionamientoFormOpen && <PrescripcionHeader isConfigured={!!isConfigured} />}

      {!direccionamientoFormOpen && <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted h-auto gap-1">
          <TabsTrigger value="fecha" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            Por Fecha
          </TabsTrigger>
          <TabsTrigger value="paciente" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4 mr-2" />
            Por Paciente
          </TabsTrigger>
          <TabsTrigger value="numero" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-4 w-4 mr-2" />
            Por Numero
          </TabsTrigger>
          <TabsTrigger value="novedades" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <RefreshCw className="h-4 w-4 mr-2" />
            Novedades
          </TabsTrigger>
        </TabsList>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <TabsContent value="fecha">
          <PrescripcionSearchDate
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            hoy={hoy}
            loading={loading}
            loadingRango={loadingRango}
            rangoProgress={rangoProgress}
            rangoInfo={rangoInfo}
            isConfigured={!!isConfigured}
            onFechaInicioChange={setFechaInicio}
            onFechaFinChange={setFechaFin}
            onSearch={handleSearchFecha}
          />
        </TabsContent>

        <TabsContent value="paciente">
          <PrescripcionSearchPatient
            fechaPac={fechaPac}
            fechaFinPac={fechaFinPac}
            tipoDoc={tipoDoc}
            numDoc={numDoc}
            loading={loading}
            loadingRango={loadingRango}
            rangoProgress={rangoProgress}
            rangoInfo={rangoInfo}
            isConfigured={!!isConfigured}
            onFechaPacChange={setFechaPac}
            onFechaFinPacChange={setFechaFinPac}
            onTipoDocChange={setTipoDoc}
            onNumDocChange={setNumDoc}
            onSearch={handleSearchPaciente}
          />
        </TabsContent>

        <TabsContent value="numero">
          <PrescripcionSearchNumber
            noPresc={noPresc}
            loading={loading}
            isConfigured={!!isConfigured}
            onNoPrescChange={setNoPresc}
            onSearch={() => handleSearch("numero")}
          />
        </TabsContent>

        <TabsContent value="novedades">
          <PrescripcionSearchNovedades
            fechaNov={fechaNov}
            loading={loading}
            isConfigured={!!isConfigured}
            onFechaNovChange={setFechaNov}
            onSearch={() => handleSearch("novedades")}
          />
        </TabsContent>
      </Tabs>}

      {!direccionamientoFormOpen && loading && !loadingRango && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Consultando MIPRES...</span>
        </div>
      )}

      {!direccionamientoFormOpen && !loading && results.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No hay resultados para mostrar</p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <>
          {queryType === "novedades" ? (
            <NovedadesTable novedades={results as NovedadPrescripcion[]} />
          ) : (
            <PrescripcionTable
              prescripciones={results as Prescripcion[]}
              credentials={credentials}
              onRefreshAfterDireccionamiento={refreshAfterDireccionamiento}
              onDireccionamientoFormOpen={setDireccionamientoFormOpen}
            />
          )}
        </>
      )}
    </div>
  )
}
