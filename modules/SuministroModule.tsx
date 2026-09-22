"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, FileText, User, Trash2, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { MipresCredentials } from "@/models/credentials.model"
import { SuministroHeader } from "./module-suministro/SuministroHeader"
import { SuministroSearchDate } from "./module-suministro/SuministroSearchDate"
import { SuministroSearchPrescription } from "./module-suministro/SuministroSearchPrescription"
import { SuministroSearchPaciente } from "./module-suministro/SuministroSearchPaciente"
import { SuministroTable } from "@/components/mipres/component-suministro/SuministroTable"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import type { Suministro } from "@/models/mipres-sispro/suministro/suministro"
import {
  exceedsThreeMonthRange,
  getStartOfCurrentWeekMondayIsoLocal,
  getThreeMonthRangeErrorMessage,
  getTodayIsoLocal,
} from "@/lib/config/date-range"

interface SuministroModuleProps {
  credentials: MipresCredentials
}

export function SuministroModule({ credentials }: SuministroModuleProps) {
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
  const [results, setResults] = useState<Suministro[]>([])
  const [error, setError] = useState<string | null>(null)
  const [suministroFormOpen, setSuministroFormOpen] = useState(false)

  const { fetchSuministros } = useMipresQueryClient()

  const isConfigured = credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setResults([])
    setError(null)
    setRangoProgress(0)
    setRangoInfo(null)
  }

  const handleSearch = async (type: string) => {
    if (!isConfigured) {
      setError("Por favor configure las credenciales en el módulo de Configuración")
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
        let params: any = {}
        let apiType = type

        if (type === "prescripcion") {
            if (!noPresc) {
                setError("Ingrese el número de prescripción")
                setLoading(false)
                return
            }
            params = { noPrescripcion: noPresc }
        } else if (type === "paciente") {
            // Validación para búsqueda por paciente
            if (!numDoc) {
                setError("Ingrese el número de documento del paciente")
                setLoading(false)
                return
            }
            // Para paciente, el endpoint requiere fecha si no es rango, pero aquí usaremos la lógica disponible
            // Si la API requiere fecha para paciente, deberíamos enviarla.
            // Asumiendo que 'paciente' usa fechaInicio si está disponible o es opcional
            params = { 
                tipoDoc, 
                numDoc,
                fecha: fechaInicio // Enviamos fecha por si acaso es requerida combinada
            }
        } else if (type === "fecha") {
             // Logic moved to handleSearchFecha for range support, but simple date handled here if needed
             // Using handleSearchFecha instead for "fecha" tab usually
        }

        if (type !== "fecha") {
             const data = await fetchSuministros(credentials, apiType as any, params)
             setResults(data)
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : "Error al consultar suministros")
    } finally {
        setLoading(false)
    }
  }

  const handleSearchFecha = async () => {
      if (!isConfigured) {
        setError("Por favor configure las credenciales en el módulo de Configuración")
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
            toast.error(rangeError)
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
          const params = esRango ? { fechaInicio, fechaFin } : { fecha: fechaInicio }

          const data = await fetchSuministros(credentials, tipo as any, params)
          
          if (progressInterval) clearInterval(progressInterval)
          if (esRango) setRangoProgress(100)
          
          setResults(data)

          if (esRango) {
              setRangoInfo(`Completado: ${data.length} suministros encontrados`)
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

  const refreshCurrent = async () => {
    if (activeTab === "fecha") {
      await handleSearchFecha()
    } else if (activeTab === "prescripcion") {
      await handleSearch("prescripcion")
    } else if (activeTab === "paciente") {
      await handleSearch("paciente")
    }
  }

  return (
    <div className="space-y-6">
      {!suministroFormOpen && (
        <>
      <SuministroHeader isConfigured={!!isConfigured} />

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
          <SuministroSearchDate
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
           <SuministroSearchPaciente
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
          <SuministroSearchPrescription
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
          <span className="ml-2 text-muted-foreground">Consultando Suministros...</span>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No hay suministros para mostrar</p>
          </CardContent>
        </Card>
      )}
        </>
      )}

      {results.length > 0 && (
        <SuministroTable
          suministros={results}
          credentials={credentials}
          onRefresh={refreshCurrent}
          onFormVisibilityChange={setSuministroFormOpen}
        />
      )}
    </div>
  )
}
