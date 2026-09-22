"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MipresCredentials } from "@/models/credentials.model"
import { InformesHeader } from "@/modules/module-informes/InformesHeader"
import { InformesSearchDate } from "@/modules/module-informes/InformesSearchDate"
import { ReportesDashboard, type DashboardReporteItem } from "@/components/component-informes/InformesDashboard"
import { Calendar } from "lucide-react"
import { toast } from "sonner"

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getCurrentMonthStart() {
  const now = new Date()
  return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
}

function getCurrentMonthEnd() {
  const now = new Date()
  return formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0))
}

function normalizeAuthHeader(token?: string) {
  const raw = String(token || "").trim()
  if (!raw) return ""
  return raw.toLowerCase().startsWith("bearer ") ? raw : `Bearer ${raw}`
}

interface InformesModuleProps {
  credentials: MipresCredentials
}

export function InformesModule({ credentials }: InformesModuleProps) {
  const [fechaInicio, setFechaInicio] = useState(() => getCurrentMonthStart())
  const [fechaFin, setFechaFin] = useState(() => getCurrentMonthEnd())
  const [reporte, setReporte] = useState("general")
  const [nitPrestador, setNitPrestador] = useState("")
  const [loadingDescarga, setLoadingDescarga] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardReporteItem[]>([])
  const [dashboardError, setDashboardError] = useState("")
  const [showDashboard, setShowDashboard] = useState(false)
  const [activeTab, setActiveTab] = useState("fecha")
  const hoy = new Date().toISOString().split("T")[0]
  const isConfigured = credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo

  const handleDescargar = async () => {
    if (!fechaInicio) {
      toast.error("Selecciona la fecha inicio para descargar")
      return
    }

    if (fechaFin && fechaFin < fechaInicio) {
      toast.error("La fecha fin no puede ser menor que la fecha inicio")
      return
    }

    if (!reporte) {
      toast.error("Selecciona un reporte para descargar")
      return
    }

    try {
      setLoadingDescarga(true)

      const headers: Record<string, string> = {}
      if (credentials.authToken) {
        headers.Authorization = credentials.authToken.toLowerCase().startsWith("bearer ")
          ? credentials.authToken
          : `Bearer ${credentials.authToken}`
      }

      let endpoint: string
      if (reporte === "estructura-giro" || reporte === "reserva-tecnica") {
        const params = new URLSearchParams({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin || fechaInicio,
        })
        if (nitPrestador.trim()) params.set("nit_prestador", nitPrestador.trim())
        endpoint = reporte === "estructura-giro"
          ? `/api/reportes/facturas-mipres/excel?${params.toString()}`
          : `/api/reportes/reserva-tecnica/excel?${params.toString()}`
      } else {
        const params = new URLSearchParams({
          fechaInicio,
          fechaFin: fechaFin || fechaInicio,
        })
        endpoint = `/api/reportes/${reporte}/excel?${params.toString()}`
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        let errorMessage = "No se pudo descargar el reporte"
        try {
          const payload = await response.json() as { error?: string; message?: string }
          errorMessage = payload.error || payload.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      const disposition = response.headers.get("content-disposition") || ""
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i)
      const filename = decodeURIComponent(match?.[1] || match?.[2] || `${reporte}-${fechaInicio}.xlsx`)

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success("Reporte descargado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al descargar el reporte")
    } finally {
      setLoadingDescarga(false)
    }
  }

  const handleVerDashboard = async () => {
    if (!fechaInicio) {
      toast.error("Selecciona la fecha inicio para consultar dashboard")
      return
    }

    if (fechaFin && fechaFin < fechaInicio) {
      toast.error("La fecha fin no puede ser menor que la fecha inicio")
      return
    }

    const authHeader = normalizeAuthHeader(credentials.authToken)
    if (!authHeader) {
      toast.error("No hay token de sesion para consultar dashboard")
      return
    }

    try {
      setLoadingDashboard(true)
      setDashboardError("")

      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || fechaInicio,
      })

      const response = await fetch(`/api/reportes/dashboard?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "x-mipres-token": authHeader,
        },
        cache: "no-store",
      })

      if (!response.ok) {
        let errorMessage = "No se pudo consultar dashboard"
        try {
          const payload = await response.json() as { error?: string; message?: string }
          errorMessage = payload.error || payload.message || errorMessage
        } catch {
        }
        throw new Error(errorMessage)
      }

      const payload = await response.json() as DashboardReporteItem[]
      setDashboardData(Array.isArray(payload) ? payload : [])
      setShowDashboard(true)
      toast.success("Dashboard consultado correctamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al consultar dashboard"
      setDashboardError(message)
      setDashboardData([])
      setShowDashboard(true)
      toast.error(message)
    } finally {
      setLoadingDashboard(false)
    }
  }

  return (
    <div className="space-y-6">
      <InformesHeader isConfigured={!!isConfigured} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted h-auto gap-1">
          <TabsTrigger value="fecha" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            Por Fecha
          </TabsTrigger>
          <TabsTrigger value="vacio-1" disabled className="opacity-0 pointer-events-none" aria-hidden="true" />
          <TabsTrigger value="vacio-2" disabled className="opacity-0 pointer-events-none" aria-hidden="true" />
          <TabsTrigger value="vacio-3" disabled className="opacity-0 pointer-events-none" aria-hidden="true" />
        </TabsList>

        <TabsContent value="fecha">
          <InformesSearchDate
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            hoy={hoy}
            reporte={reporte}
            loading={loadingDescarga}
            loadingDashboard={loadingDashboard}
            isConfigured={!!isConfigured}
            onFechaInicioChange={setFechaInicio}
            onFechaFinChange={setFechaFin}
            onReporteChange={(r) => { setReporte(r); setNitPrestador("") }}
            onDescargar={handleDescargar}
            onVerDashboard={handleVerDashboard}
            nitPrestador={nitPrestador}
            onNitPrestadorChange={setNitPrestador}
          />

          {showDashboard && (
            <ReportesDashboard
              fechaInicio={fechaInicio}
              fechaFin={fechaFin || fechaInicio}
              data={dashboardData}
              loading={loadingDashboard}
              error={dashboardError}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
