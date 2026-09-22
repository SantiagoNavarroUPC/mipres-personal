"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, FileText, User } from "lucide-react"
import { toast } from "sonner"
import type { MipresCredentials } from "@/models/credentials.model"
import type { NoDireccionamiento } from "@/models/mipres-sispro/no_direccionamiento/no_direccionamiento"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import { NoDireccionamientoTable } from "@/components/mipres/component-nodirecionamiento"
import {
  NoDireccionamientoHeader,
  NoDireccionamientoSearchDate,
  NoDireccionamientoSearchPatient,
  NoDireccionamientoSearchPrescription,
} from "./module-no-direccionamiento"
import { Card, CardContent } from "@/components/ui/card"
import {
  exceedsThreeMonthRange,
  getStartOfCurrentWeekMondayIsoLocal,
  getThreeMonthRangeErrorMessage,
  getTodayIsoLocal,
} from "@/lib/config/date-range"

interface NoDireccionamientoModuleProps {
  credentials: MipresCredentials
}

export function NoDireccionamientoModule({ credentials }: NoDireccionamientoModuleProps) {
  const hoy = getTodayIsoLocal()
  const inicioSemana = getStartOfCurrentWeekMondayIsoLocal()
  const [fecha, setFecha] = useState(inicioSemana)
  const [fechaPac, setFechaPac] = useState(hoy)
  const [tipoDoc, setTipoDoc] = useState("")
  const [numDoc, setNumDoc] = useState("")
  const [noPresc, setNoPresc] = useState("")
  const [fechaFin, setFechaFin] = useState(hoy)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<NoDireccionamiento[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("fecha")
  const [noDirFormOpen, setNoDirFormOpen] = useState(false)

  const { fetchNoDireccionamientos } = useMipresQueryClient()

  const ensureCredentials = () => {
    if (!credentials.nit || !credentials.tokenAccesoSubsidiado || !credentials.tokenAccesoContributivo) {
      setError("Por favor configure y valide las credenciales (tokens de acceso subsidiado y contributivo)")
      return false
    }
    return true
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setResults([])
    setError(null)
    setSuccess(null)
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
            setLoading(false)
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
      const noDireccionamientos = await fetchNoDireccionamientos(credentials, queryType as any, params as any)
      setResults(noDireccionamientos)

      if (noDireccionamientos.length > 0) {
        setSuccess(`Se encontraron ${noDireccionamientos.length} registro(s) de no direccionamiento`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion con el servidor")
    } finally {
      setLoading(false)
    }
  }

  const isConfigured = credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo

  return (
    <div className="space-y-6">
      {!noDirFormOpen && (
        <>
          <NoDireccionamientoHeader isConfigured={!!isConfigured} />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-muted h-auto gap-1">
              <TabsTrigger
                value="fecha"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Por Fecha
              </TabsTrigger>
              <TabsTrigger
                value="paciente"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <User className="h-4 w-4 mr-2" />
                Paciente
              </TabsTrigger>
              <TabsTrigger
                value="prescripcion"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                Prescripcion
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fecha">
              <NoDireccionamientoSearchDate
                fecha={fecha}
                fechaFin={fechaFin}
                loading={loading}
                onFechaChange={setFecha}
                onFechaFinChange={setFechaFin}
                onSearch={() => handleSearch("fecha")}
              />
            </TabsContent>

            <TabsContent value="paciente">
              <NoDireccionamientoSearchPatient
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
              <NoDireccionamientoSearchPrescription
                noPresc={noPresc}
                loading={loading}
                onNoPrescChange={setNoPresc}
                onSearch={() => handleSearch("prescripcion")}
              />
            </TabsContent>
          </Tabs>

          {(error || success) && (
            <Alert variant={error ? "destructive" : "default"}>
              <AlertDescription>{error || success}</AlertDescription>
            </Alert>
          )}
        </>
      )}

      <NoDireccionamientoTable
        results={results}
        credentials={credentials}
        onAnularSuccess={(id) => {
          setResults((prev) => prev.filter((x) => String(x.IDNODireccionamiento || "") !== String(id)))
        }}
        onFormVisibilityChange={setNoDirFormOpen}
      />
    </div>
  )
}
