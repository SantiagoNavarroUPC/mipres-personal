"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, User, FileText, Loader2 } from "lucide-react"
import { ReporteEntregaHeader } from "./module-reporte-entrega/ReporteEntregaHeader"
import { ReporteEntregaSearchDate } from "./module-reporte-entrega/ReporteEntregaSearchDate"
import { ReporteEntregaSearchPrescription } from "./module-reporte-entrega/ReporteEntregaSearchPrescription"
import { ReporteEntregaSearchPaciente } from "./module-reporte-entrega/ReporteEntregaSearchPaciente"
import type { MipresCredentials } from "@/models/credentials.model"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import type { ReporteEntrega } from "@/models/mipres-sispro/reporte-entrega/reporte-entrega"
import { ReporteEntregaTable } from "@/components/mipres/component-reporte-entrega/ReporteEntregaTable"
import { useToast } from "@/components/ui/use-toast"
import {
  exceedsThreeMonthRange,
  getStartOfCurrentWeekMondayIsoLocal,
  getThreeMonthRangeErrorMessage,
  getTodayIsoLocal,
} from "@/lib/config/date-range"

interface ReporteEntregaModuleProps {
  credentials: MipresCredentials
}

type ReporteQueryType = "fecha" | "rango" | "prescripcion" | "paciente"

interface LastReporteQuery {
  type: ReporteQueryType
  params: Record<string, string>
}

export function ReporteEntregaModule({ credentials }: ReporteEntregaModuleProps) {
  const { toast } = useToast()
  const hoy = getTodayIsoLocal()
  const inicioSemana = getStartOfCurrentWeekMondayIsoLocal()
  const [fechaInicio, setFechaInicio] = useState(inicioSemana)
  const [fechaFin, setFechaFin] = useState(hoy)
  const [noPresc, setNoPresc] = useState("")
  const [tipoDoc, setTipoDoc] = useState("CC")
  const [numDoc, setNumDoc] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingRango, setLoadingRango] = useState(false)
  const [rangoProgress, setRangoProgress] = useState(0)
  const [rangoInfo, setRangoInfo] = useState<string | null>(null)
  const [results, setResults] = useState<ReporteEntrega[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("fecha")
  const [lastQuery, setLastQuery] = useState<LastReporteQuery | null>(null)
  const [reporteFormOpen, setReporteFormOpen] = useState(false)

  const { fetchReportesEntrega } = useMipresQueryClient()

  // Limpiar resultados y errores al cambiar de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setResults([])
    setError(null)
    setRangoProgress(0)
    setRangoInfo(null)
  }
  
  const handleSearch = async (type: string) => {
    if (!credentials.nit || !credentials.tokenSubsidiado || !credentials.tokenContributivo) {
      setError("Por favor configure las credenciales (NIT y Tokens raw) en el modulo de Configuracion")
      return
    }

    if (!credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
      setError("Por favor valide credenciales para obtener los tokens de acceso")
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
        let params: Record<string, string> = {}
        let apiType = type

        if (type === "prescripcion") {
            if (!noPresc) {
                setError("Ingrese el número de prescripción")
                setLoading(false)
                return
            }
            params = { noPrescripcion: noPresc }
        } else if (type === "paciente") {
          if (!fechaInicio) {
            setError("Ingrese la fecha para la búsqueda por paciente")
            setLoading(false)
            return
          }
          if (!numDoc) {
            setError("Ingrese el número de documento del paciente")
            setLoading(false)
            return
          }

          params = { fecha: fechaInicio, tipoDoc: tipoDoc, numDoc }
        }

        setLastQuery({ type: apiType as ReporteQueryType, params })
        const data = await fetchReportesEntrega(credentials, apiType as any, params as any)
        setResults(data)
    } catch (err) {
        setError(err instanceof Error ? err.message : "Error al consultar reporte de entrega")
    } finally {
        setLoading(false)
    }
  }

  const handleSearchFecha = async () => {
    if (!credentials.nit || !credentials.tokenSubsidiado || !credentials.tokenContributivo) {
        setError("Por favor configure las credenciales (NIT y Tokens raw) en el modulo de Configuracion")
        return
    }
  
    if (!credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
        setError("Por favor valide credenciales para obtener los tokens de acceso")
        return
    }

    if (!fechaInicio) {
        setError("Ingrese la fecha de inicio")
        return
    }

    setLoading(true)
    setError(null)
    setResults([])
    
    const esRango = !!fechaFin
    if (esRango && exceedsThreeMonthRange(fechaInicio, fechaFin)) {
      const rangeError = getThreeMonthRangeErrorMessage()
      setError(rangeError)
      toast({
        variant: "destructive",
        title: "Rango no permitido",
        description: rangeError,
      })
      return
    }
    let progressInterval: ReturnType<typeof setInterval> | null = null

    if (esRango) {
        setLoadingRango(true)
        setRangoInfo("Consultando rango de fechas...")
        setRangoProgress(10)
        progressInterval = setInterval(() => {
            setRangoProgress((prev) => (prev >= 85 ? prev : prev + Math.random() * 8))
        }, 500)
    }

    try {
        const tipo = esRango ? "rango" : "fecha"
        const params: Record<string, string> = esRango
          ? { fechaInicio, fechaFin }
          : { fecha: fechaInicio }

        setLastQuery({ type: tipo as ReporteQueryType, params })
        const data = await fetchReportesEntrega(credentials, tipo as any, params as any)
        
        if (progressInterval) clearInterval(progressInterval)
        if (esRango) setRangoProgress(100)
        
        setResults(data)

        if (esRango) {
            setRangoInfo(`Completado: ${data.length} reportes encontrados`)
        }
    } catch (err) {
        if (progressInterval) clearInterval(progressInterval)
        setError(err instanceof Error ? err.message : "Error al consultar por fecha")
    } finally {
        setLoading(false)
        setLoadingRango(false)
        if (!esRango) setRangoProgress(0)
    }
  }

  const isConfigured = credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo

  const handleRefreshReportes = async () => {
    if (!lastQuery) return
    try {
      setLoading(true)
      setError(null)
      const tokenAcceso =
        credentials.tokenAccesoSubsidiado ||
        credentials.tokenAccesoContributivo ||
        credentials.tokenAcceso ||
        ""

      if (!credentials.nit || !tokenAcceso) {
        throw new Error("No hay credenciales suficientes para refrescar reportes")
      }

      const queryParams = new URLSearchParams({
        nit: credentials.nit,
        tokenAcceso,
        tipo: lastQuery.type,
        ...lastQuery.params,
      })

      const response = await fetch(`/api/mipres/reporte-entrega?${queryParams.toString()}`, {
        method: "GET",
        cache: "no-store",
      })

      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Error al refrescar reporte de entrega")
      }

      const data: ReporteEntrega[] = Array.isArray(result?.data)
        ? result.data
        : result?.data
          ? [result.data]
          : []

      setResults(data)
      toast({
        title: "Tabla actualizada",
        description: `Se recargó la consulta y se encontraron ${data.length} reportes.`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al refrescar reporte de entrega")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {!reporteFormOpen && (
        <>
          <ReporteEntregaHeader isConfigured={!!isConfigured} />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-muted h-auto gap-1">
              <TabsTrigger value="fecha" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                Por Fecha de Entrega
              </TabsTrigger>
              <TabsTrigger value="paciente" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <User className="h-4 w-4 mr-2" />
                Por Paciente
              </TabsTrigger>
              <TabsTrigger value="prescripcion" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-4 w-4 mr-2" />
                Por Prescripción
              </TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive">
                <FileText className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="fecha">
              <ReporteEntregaSearchDate
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

            <TabsContent value="prescripcion">
              <ReporteEntregaSearchPrescription
                noPresc={noPresc}
                loading={loading}
                isConfigured={!!isConfigured}
                onNoPrescChange={setNoPresc}
                onSearch={() => handleSearch("prescripcion")}
              />
            </TabsContent>

            <TabsContent value="paciente">
              <ReporteEntregaSearchPaciente
                fecha={fechaInicio}
                tipoDocumento={tipoDoc}
                numeroDocumento={numDoc}
                loading={loading}
                isConfigured={!!isConfigured}
                onFechaChange={setFechaInicio}
                onTipoDocumentoChange={setTipoDoc}
                onNumeroDocumentoChange={setNumDoc}
                onSearch={() => handleSearch("paciente")}
              />
            </TabsContent>
          </Tabs>

          {loading && !loadingRango && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Consultando Reporte de Entrega...</span>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No hay reportes para mostrar</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {results.length > 0 && (
        <ReporteEntregaTable
          reportes={results}
          onRefreshReportes={handleRefreshReportes}
          onFormVisibilityChange={setReporteFormOpen}
        />
      )}
    </div>
  )
}
