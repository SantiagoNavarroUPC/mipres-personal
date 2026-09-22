"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, FileText, User, Ban } from "lucide-react"
import { toast } from "sonner"
import type { MipresCredentials } from "@/models/credentials.model"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import { DireccionamientoLecturaModal } from "@/components/mipres/component-direccionamiento/DireccionamientoLecturaView"
import { DireccionamientoTable } from "@/components/mipres/component-direccionamiento/DireccionamientoTable"
import {
  DireccionamientoHeader,
  DireccionamientoSearchDate,
  DireccionamientoSearchPatient,
  DireccionamientoSearchPrescription,
  DireccionamientoAnular,
} from "./module-direccionamiento"
import {
  exceedsThreeMonthRange,
  getStartOfCurrentWeekMondayIsoLocal,
  getThreeMonthRangeErrorMessage,
  getTodayIsoLocal,
} from "@/lib/config/date-range"

interface DireccionamientoModuleProps {
  credentials: MipresCredentials
}

interface ApiResponse {
  success: boolean
  data?: Direccionamiento[] | Direccionamiento | unknown
  total?: number
  error?: string
  details?: string
}

export function DireccionamientoModule({ credentials }: DireccionamientoModuleProps) {
  const hoy = getTodayIsoLocal()
  const inicioSemana = getStartOfCurrentWeekMondayIsoLocal()
  const [fecha, setFecha] = useState(inicioSemana)
  const [fechaPac, setFechaPac] = useState(hoy)
  const [tipoDoc, setTipoDoc] = useState("")
  const [numDoc, setNumDoc] = useState("")
  const [noPresc, setNoPresc] = useState("")
  const [fechaFin, setFechaFin] = useState(hoy)
  const [idDireccionamiento, setIdDireccionamiento] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Direccionamiento[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [verModalOpen, setVerModalOpen] = useState(false)
  const [selectedForVer, setSelectedForVer] = useState<any>(null)
  const [verFormOpen, setVerFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("fecha")

  const { invalidateDireccionamientos } = useMipresQueryClient()
  const { fetchDireccionamientos } = useMipresQueryClient()

  const refreshCurrentResults = async () => {
    if (activeTab === "anular") return
    if (!ensureCredentials()) return

    if (activeTab === "fecha" && !fecha) return
    if (activeTab === "paciente" && (!fechaPac || !tipoDoc || !numDoc)) return
    if (activeTab === "prescripcion" && !noPresc) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const params = buildQueryParams(activeTab as "fecha" | "prescripcion" | "paciente")
      const queryType = activeTab === "fecha" && fechaFin ? "rango" : activeTab
      const currentResults = await fetchDireccionamientos(credentials, queryType as any, params as any)
      if (currentResults) {
        setResults(normalizeResults(currentResults))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion con el servidor")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = () => {
      void refreshCurrentResults()
    }
    window.addEventListener("direccionamiento:refresh", handler)
    return () => {
      window.removeEventListener("direccionamiento:refresh", handler)
    }
  }, [activeTab, fecha, fechaFin, fechaPac, tipoDoc, numDoc, noPresc, credentials])

  const ensureCredentials = () => {
    if (!credentials.nit || !credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
      setError("Por favor configure y valide las credenciales (tokens de acceso subsidiado y contributivo)")
      return false
    }
    return true
  }

  const buildQueryParams = (type: "fecha" | "prescripcion" | "paciente") => {
    if (type === "fecha") {
      return fechaFin ? { fechaInicio: fecha, fechaFin } : { fecha }
    }
    if (type === "paciente") {
      return { fecha: fechaPac, tipoDoc, numDoc }
    }
    return { noPrescripcion: noPresc }
  }

  const normalizeResults = (data: ApiResponse["data"]) => {
    if (!data) return []
    if (Array.isArray(data)) return data as Direccionamiento[]
    return [data as Direccionamiento]
  }

  const openVerModal = (item: Direccionamiento) => {
    setSelectedForVer({
      NoPrescripcion: item.NoPrescripcion,
      PNPaciente: `${item.TipoIDPaciente || ""} ${item.NoIDPaciente || ""}`.trim(),
      PAPaciente: "",
      tipoRegimen: item.tipoRegimen,
    })
    setVerModalOpen(true)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setResults([])
    setError(null)
    setSuccess(null)
  }

  const handleAnularSuccess = async () => {
    // Refrescar los datos después de anular
    if (credentials.nit) {
      await invalidateDireccionamientos(credentials.nit)
      // Re-ejecutar la búsqueda actual
      const queryType = activeTab === "fecha" && fechaFin ? "rango" : activeTab
      const params = buildQueryParams(activeTab as "fecha" | "prescripcion" | "paciente")
      const currentResults = await fetchDireccionamientos(credentials, queryType as any, params as any)
      if (currentResults) {
        setResults(normalizeResults(currentResults))
      }
    }
  }

  const handleSearch = async (type: "fecha" | "prescripcion" | "paciente") => {
    if (!ensureCredentials()) return

    setLoading(true)
    setError(null)
    setSuccess(null)
    setResults([])

    try {
      let params: Record<string, string> = {}

      switch (type) {
        case "fecha":
          if (!fecha) {
            setError("Ingrese la fecha de consulta")
            setLoading(false)
            return
          }
          if (fechaFin && exceedsThreeMonthRange(fecha, fechaFin)) {
            const rangeError = getThreeMonthRangeErrorMessage()
            setError(rangeError)
            toast.error(rangeError)
            return
          }
          params = fechaFin ? { fechaInicio: fecha, fechaFin } : { fecha }
          break
        case "paciente":
          if (!fechaPac || !tipoDoc || !numDoc) {
            setError("Ingrese fecha, tipo y numero de documento")
            setLoading(false)
            return
          }
          params = { fecha: fechaPac, tipoDoc, numDoc }
          break
        case "prescripcion":
          if (!noPresc) {
            setError("Ingrese el numero de prescripcion")
            setLoading(false)
            return
          }
          params = { noPrescripcion: noPresc }
          break
      }

      const queryType = type === "fecha" && fechaFin ? "rango" : type

      // Usar fetchDireccionamientos de TanStack Query (cachea automáticamente)
      const result = await fetchDireccionamientos(credentials, queryType as any, params as any)
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion con el servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleAnular = async () => {
    if (!ensureCredentials()) return

    if (!idDireccionamiento) {
      setError("Ingrese el ID de direccionamiento")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setResults([])

    try {
      const defaultTokenAcceso = credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo || credentials.tokenAcceso
      
      const response = await fetch("/api/mipres/anulaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit: credentials.nit,
          token: defaultTokenAcceso,
          tipo: "direccionamiento",
          IdDireccionamiento: idDireccionamiento,
        }),
      })

      const result: ApiResponse = await response.json()

      if (response.ok && result.success) {
        setSuccess("Direccionamiento anulado exitosamente")
        setIdDireccionamiento("")
        // Invalidar caché de direccionamientos después de anulación
        await invalidateDireccionamientos(credentials.nit)
      } else {
        setError(result.error || "Error al anular direccionamiento")
      }
    } catch (error) {
      setError("Error de conexion con el servidor")
    } finally {
      setLoading(false)
    }
  }

  const renderResults = () => {
    return <DireccionamientoTable results={results} credentials={credentials} onView={openVerModal} onAnularSuccess={handleAnularSuccess} />
  }

  const isConfigured = credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo

  return (
    <div className="space-y-6">
      {!verFormOpen && (
        <>
          <DireccionamientoHeader isConfigured={!!isConfigured} />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted h-auto gap-1">
              <TabsTrigger value="fecha" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                Por Fecha
              </TabsTrigger>
              <TabsTrigger value="paciente" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <User className="h-4 w-4 mr-2" />
                Paciente
              </TabsTrigger>
              <TabsTrigger value="prescripcion" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-4 w-4 mr-2" />
                Prescripcion
              </TabsTrigger>
              <TabsTrigger value="anular" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Ban className="h-4 w-4 mr-2" />
                Anular
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fecha">
              <DireccionamientoSearchDate
                fecha={fecha}
                fechaFin={fechaFin}
                loading={loading}
                onFechaChange={setFecha}
                onFechaFinChange={setFechaFin}
                onSearch={() => handleSearch("fecha")}
              />
            </TabsContent>

            <TabsContent value="paciente">
              <DireccionamientoSearchPatient
                fechaPac={fechaPac}
                tipoDoc={tipoDoc}
                numDoc={numDoc}
                loading={loading}
                onFechaPacChange={setFechaPac}
                onTipoDocChange={setTipoDoc}
                onNumDocChange={setNumDoc}
                onSearch={() => handleSearch("paciente")}
              />
            </TabsContent>

            <TabsContent value="prescripcion">
              <DireccionamientoSearchPrescription
                noPresc={noPresc}
                loading={loading}
                onNoPrescChange={setNoPresc}
                onSearch={() => handleSearch("prescripcion")}
              />
            </TabsContent>

            <TabsContent value="anular">
              <DireccionamientoAnular
                idDireccionamiento={idDireccionamiento}
                loading={loading}
                onIdChange={setIdDireccionamiento}
                onAnular={handleAnular}
              />
            </TabsContent>
          </Tabs>

          {(error || success) && (
            <Alert variant={error ? "destructive" : "default"}>
              <AlertDescription>{error || success}</AlertDescription>
            </Alert>
          )}

          {renderResults()}
        </>
      )}

      {selectedForVer && (
        <DireccionamientoLecturaModal
          prescripcion={selectedForVer}
          open={verModalOpen}
          onClose={() => {
            setVerModalOpen(false)
            setSelectedForVer(null)
            setVerFormOpen(false)
          }}
          credentials={credentials}
          onFormVisibilityChange={setVerFormOpen}
        />
      )}
    </div>
  )
}
