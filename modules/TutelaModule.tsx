"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, User, FileText, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { MipresCredentials } from "@/models/credentials.model"
import type { Tutela } from "@/models/mipres-sispro/tutela/tutela"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import {
  exceedsThreeMonthRange,
  getStartOfCurrentWeekMondayIsoLocal,
  getThreeMonthRangeErrorMessage,
  getTodayIsoLocal,
} from "@/lib/config/date-range"
import { TutelaTable } from "@/components/mipres/component-tutela/TutelaTable"
import {
  TutelaHeader,
  TutelaSearchDate,
  TutelaSearchPatient,
  TutelaSearchNumber,
  TutelaSearchNovedades,
} from "./module-tutela"
import { TutelaNovedadesTable } from "@/components/mipres/component-tutela/TutelaNovedadesTable"

interface TutelasModuleProps {
  credentials: MipresCredentials
}

export function TutelasModule({ credentials }: TutelasModuleProps) {
  const hoy = getTodayIsoLocal()
  const inicioSemana = getStartOfCurrentWeekMondayIsoLocal()

  const [fechaInicio, setFechaInicio] = useState(inicioSemana)
  const [fechaFin, setFechaFin] = useState(hoy)
  const [fechaPac, setFechaPac] = useState("")
  const [fechaFinPac, setFechaFinPac] = useState("") // Fecha fin opcional para busqueda por paciente
  const [fechaNov, setFechaNov] = useState("")
  const [tipoDoc, setTipoDoc] = useState("")
  const [numDoc, setNumDoc] = useState("")
  const [noTutela, setNoTutela] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingRango, setLoadingRango] = useState(false)
  const [rangoProgress, setRangoProgress] = useState(0)
  const [rangoInfo, setRangoInfo] = useState<string | null>(null)
  const [results, setResults] = useState<Tutela[] | any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [queryType, setQueryType] = useState<string>("fecha")
  const [activeTab, setActiveTab] = useState("fecha")
  const [direccionamientoFormOpen, setDireccionamientoFormOpen] = useState(false)

  const { fetchTutelas } = useMipresQueryClient()

  const isConfigured = Boolean(credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo)

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setResults([])
    setError(null)
    setRangoProgress(0)
    setRangoInfo(null)
  }

  const handleSearchPaciente = async () => {
    if (!isConfigured) {
      setError("Por favor configure las credenciales (NIT y Tokens raw) en el modulo de Configuracion")
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
          `/api/mipres/tutelas/tutelas-por-paciente?numero_documento=${encodeURIComponent(numDoc.trim())}`
        )

        const raw = await response.text()
        let payload: any = null
        try {
          payload = raw ? JSON.parse(raw) : null
        } catch {
          payload = { success: false, error: "Respuesta invalida del servidor", details: raw }
        }

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || "No se pudieron obtener tutelas por paciente")
        }

        const numerosTutela: string[] = Array.isArray(payload?.data)
          ? payload.data.map((n: unknown) => String(n || "").trim()).filter(Boolean)
          : []

        if (numerosTutela.length === 0) {
          setResults([])
          toast.info("No se encontraron tutelas para el documento consultado")
          return
        }

        const unicos: string[] = Array.from(new Set(numerosTutela))
        const merged: Tutela[] = []

        for (const numeroTutela of unicos) {
          const tutelasPorNumero = await fetchTutelas(credentials, "numero", { noTutela: numeroTutela })
          merged.push(...(tutelasPorNumero as Tutela[]))
        }

        const dedup = new Map<string, Tutela>()
        merged.forEach((tutela) => {
          const key = `${tutela.NoTutela || ""}-${tutela.tipoRegimen || ""}`
          if (!dedup.has(key)) dedup.set(key, tutela)
        })

        const finalResults = Array.from(dedup.values())
        setResults(finalResults)
        toast.success(`Se encontraron ${finalResults.length} tutelas por documento`)
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
      
      const result = await fetchTutelas(credentials, tipoConsulta as any, params as any)
      setResults(result)

      if (esRango) {
        setRangoProgress(100)
        setRangoInfo("Consulta finalizada")
        if (result.length > 1) {
          toast.info(`Se encontraron ${result.length} tutelas para este paciente en el rango seleccionado.`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de conexion con el servidor"
      setError(msg)
      if (err && (err as any).details) {
        try {
          const details = (err as any).details
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

  const handleSearch = async (type: "numero" | "novedades") => {
    if (!isConfigured) {
      setError("Por favor configure las credenciales (NIT y Tokens raw) en el modulo de Configuracion")
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setQueryType(type)

    try {
      let params: Record<string, string> = {}

      if (type === "numero") {
        if (!noTutela) {
          setError("Ingrese el numero de tutela")
          setLoading(false)
          return
        }
        params = { noTutela }
      } else if (type === "novedades") {
        if (!fechaNov) {
          setError("Ingrese la fecha de novedades")
          setLoading(false)
          return
        }
        params = { fecha: fechaNov }
      }

      const result = await fetchTutelas(credentials, type, params as any)
      setResults(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de conexion con el servidor"
      setError(msg)
      if (err && (err as any).details) {
        try {
          const details = (err as any).details
          if (details.subsidiado) toast.error(details.subsidiado)
          if (details.contributivo) toast.error(details.contributivo)
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearchFecha = async () => {
    if (!isConfigured) {
      setError("Por favor configure las credenciales (NIT y Tokens raw) en el modulo de Configuracion")
      return
    }

    if (!fechaInicio) {
      setError("Ingrese la fecha de inicio")
      return
    }

    const esRango = Boolean(fechaFin)

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
      const tipo = esRango ? "rango" : "fecha"
      const params = esRango ? { fechaInicio, fechaFin } : { fecha: fechaInicio }

      const result = await fetchTutelas(credentials, tipo as any, params as any)

      if (progressInterval) clearInterval(progressInterval)
      if (esRango) setRangoProgress(95)

      setResults(result)

      if (esRango) {
        setRangoProgress(100)
        const total = result.length
        setRangoInfo(
          `Completado: ${total} tutela${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`
        )
      }
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval)
      const msg = err instanceof Error ? err.message : "Error de conexion con el servidor"
      setError(msg)
      if (err && (err as any).details) {
        try {
          const details = (err as any).details
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

  const handleRefresh = () => {
    switch (activeTab) {
      case "fecha":
        handleSearchFecha()
        break
      case "paciente":
        handleSearchPaciente()
        break
      case "numero":
        handleSearch("numero")
        break
      case "novedades":
        handleSearch("novedades")
        break
    }
  }

  return (
    <div className="space-y-6">
      {!direccionamientoFormOpen && <TutelaHeader isConfigured={isConfigured} />}

      {!direccionamientoFormOpen && error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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

        <TabsContent value="fecha">
          <TutelaSearchDate
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            hoy={hoy}
            loading={loading}
            loadingRango={loadingRango}
            rangoProgress={rangoProgress}
            rangoInfo={rangoInfo}
            isConfigured={isConfigured}
            onFechaInicioChange={setFechaInicio}
            onFechaFinChange={setFechaFin}
            onSearch={handleSearchFecha}
          />
        </TabsContent>

        <TabsContent value="paciente">
          <TutelaSearchPatient
            fecha={fechaPac}
            fechaFinPac={fechaFinPac}
            tipoDoc={tipoDoc}
            numDoc={numDoc}
            loading={loading}
            loadingRango={loadingRango}
            rangoProgress={rangoProgress}
            rangoInfo={rangoInfo}
            isConfigured={isConfigured}
            onFechaChange={setFechaPac}
            onFechaFinChange={setFechaFinPac}
            onTipoDocChange={setTipoDoc}
            onNumDocChange={setNumDoc}
            onSearch={handleSearchPaciente}
          />
        </TabsContent>

        <TabsContent value="numero">
          <TutelaSearchNumber
            noTutela={noTutela}
            loading={loading}
            isConfigured={isConfigured}
            onNoTutelaChange={setNoTutela}
            onSearch={() => handleSearch("numero")}
          />
        </TabsContent>

        <TabsContent value="novedades">
          <TutelaSearchNovedades
            fecha={fechaNov}
            loading={loading}
            isConfigured={isConfigured}
            onFechaChange={setFechaNov}
            onSearch={() => handleSearch("novedades")}
          />
        </TabsContent>
      </Tabs>}

      {!direccionamientoFormOpen && !loading && results.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No hay resultados para mostrar</p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        activeTab === "novedades" ? (
          <TutelaNovedadesTable novedades={results as any[]} />
        ) : (
          <TutelaTable
            tutelas={results as Tutela[]}
            credentials={credentials}
            onRefresh={handleRefresh}
            onDireccionamientoFormOpen={setDireccionamientoFormOpen}
          />
        )
      )}
    </div>
  )
}
