"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, FileText, User, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { MipresCredentials } from "@/models/credentials.model"
import { EntregaHeader } from "./module-entrega/EntregaHeader"
import { EntregaSearchDate } from "./module-entrega/EntregaSearchDate"
import { EntregaSearchPrescription } from "./module-entrega/EntregaSearchPrescription"
import { EntregaSearchPaciente } from "./module-entrega/EntregaSearchPaciente"
import { EntregaTable } from "@/components/mipres/component-entrega/EntregaTable"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import type { Entrega } from "@/models/mipres-sispro/entrega/entrega"
import {
  exceedsThreeMonthRange,
  getStartOfCurrentWeekMondayIsoLocal,
  getThreeMonthRangeErrorMessage,
  getTodayIsoLocal,
} from "@/lib/config/date-range"

interface EntregaModuleProps {
  credentials: MipresCredentials
}

export function EntregaModule({ credentials }: EntregaModuleProps) {
  const hoy = getTodayIsoLocal()
  const inicioSemana = getStartOfCurrentWeekMondayIsoLocal()

  const [activeTab, setActiveTab] = useState("fecha")
  const [fechaInicio, setFechaInicio] = useState(inicioSemana)
  const [fechaFin, setFechaFin] = useState(hoy)
  const [noPresc, setNoPresc] = useState("")
  const [tipoDoc, setTipoDoc] = useState("CC")
  const [numDoc, setNumDoc] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingRango, setLoadingRango] = useState(false)
  const [rangoProgress, setRangoProgress] = useState(0)
  const [rangoInfo, setRangoInfo] = useState<string | null>(null)
  const [results, setResults] = useState<Entrega[]>([])
  const [error, setError] = useState<string | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

  const { fetchEntregas } = useMipresQueryClient()

  const isConfigured = credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setResults([])
    setError(null)
    setRangoProgress(0)
    setRangoInfo(null)
  }

  const validarCredenciales = (): boolean => {
    if (!isConfigured) {
      setError("Por favor configure las credenciales en el módulo de Configuración")
      return false
    }

    if (!credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
      setError("Por favor valide credenciales para obtener los tokens de acceso")
      return false
    }

    return true
  }

  const handleSearch = async (type: "prescripcion" | "paciente") => {
    if (!validarCredenciales()) return

    if (type === "prescripcion" && !noPresc) {
      setError("Ingrese el número de prescripción")
      return
    }

    if (type === "paciente" && !numDoc) {
      setError("Ingrese el número de documento del paciente")
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const params = type === "prescripcion"
        ? { noPrescripcion: noPresc }
        : { tipoDoc, numDoc, fecha: fechaInicio }

      const data = await fetchEntregas(credentials, type, params)
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar entregas")
    } finally {
      setLoading(false)
    }
  }

  const handleSearchFecha = async () => {
    if (!validarCredenciales()) return

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
      const data = esRango
        ? await fetchEntregas(credentials, "rango", { fechaInicio, fechaFin })
        : await fetchEntregas(credentials, "fecha", { fecha: fechaInicio })

      if (progressInterval) clearInterval(progressInterval)
      if (esRango) setRangoProgress(100)

      setResults(data)

      if (esRango) {
        setRangoInfo(`Completado: ${data.length} entregas encontradas`)
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

  return (
    <div className="space-y-6">
      {!viewOpen && (
        <>
          <EntregaHeader isConfigured={!!isConfigured} />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-muted h-auto gap-1">
              <TabsTrigger value="fecha" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                Por Fecha
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
              <EntregaSearchDate
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
              <EntregaSearchPaciente
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

            <TabsContent value="prescripcion">
              <EntregaSearchPrescription
                noPresc={noPresc}
                loading={loading}
                isConfigured={!!isConfigured}
                onNoPrescChange={setNoPresc}
                onSearch={() => handleSearch("prescripcion")}
              />
            </TabsContent>
          </Tabs>

          {loading && !loadingRango && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Consultando Entregas...</span>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No hay entregas para mostrar</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {results.length > 0 && (
        <EntregaTable
          entregas={results}
          credentials={credentials}
          onFormVisibilityChange={setViewOpen}
        />
      )}
    </div>
  )
}
