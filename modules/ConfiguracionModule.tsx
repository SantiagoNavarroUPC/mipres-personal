"use client"

import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import type { MipresCredentials } from "@/models/credentials.model"
import { CredencialesCard, EstadoCard, ValidacionCard } from "@/components/component-configuracion"

const TOKEN_SUBSIDIADO = process.env.NEXT_PUBLIC_TOKEN_SUBSIDIADO
const TOKEN_CONTRIBUTIVO = process.env.NEXT_PUBLIC_TOKEN_CONTRIBUTIVO
const NIT_EPSI = process.env.NEXT_PUBLIC_NIT_EPSI

interface ConfiguracionModuleProps {
  credentials: MipresCredentials
  onSave: (credentials: MipresCredentials) => void
}

interface ConnectionResult {
  success: boolean
  message?: string
  error?: string
  tokenAcceso?: string
  data?: unknown
}

export function ConfiguracionModule({ credentials, onSave }: ConfiguracionModuleProps) {
  const [nit, setNit] = useState(credentials.nit || NIT_EPSI || "")
  const [tokenAcceso, setTokenAcceso] = useState(credentials.tokenAcceso)
  const [tokenAccesoSubsidiado, setTokenAccesoSubsidiado] = useState(credentials.tokenAccesoSubsidiado)
  const [tokenAccesoContributivo, setTokenAccesoContributivo] = useState(credentials.tokenAccesoContributivo)
  const [showToken, setShowToken] = useState(false)
  const [showTokenAcceso, setShowTokenAcceso] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [generarResult, setGenerarResult] = useState<ConnectionResult | null>(null)

  // Cargar valores predefinidos al montar
  useEffect(() => {
    if (!credentials.nit) setNit(NIT_EPSI || "")
  }, [])

  // Validar credenciales y generar dos tokens (subsidiado y contributivo)
  const handleValidar = async () => {
    if (!nit) return

    setGenerando(true)
    setGenerarResult(null)

    try {
      // Hacer dos consultas: una con TOKEN_SUBSIDIADO y otra con TOKEN_CONTRIBUTIVO
      const responseSubsidiado = await fetch("/api/mipres/generar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nit, token: TOKEN_SUBSIDIADO }),
      })
      const resultSubsidiado = await responseSubsidiado.json()

      const responseContributivo = await fetch("/api/mipres/generar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nit, token: TOKEN_CONTRIBUTIVO }),
      })
      const resultContributivo = await responseContributivo.json()

      // Verificar resultados
      const subsidiado = resultSubsidiado.tokenAcceso
      const contributivo = resultContributivo.tokenAcceso
      const allSuccess = resultSubsidiado.success && resultContributivo.success

      if (allSuccess && (subsidiado || contributivo)) {
        setTokenAccesoSubsidiado(subsidiado)
        setTokenAccesoContributivo(contributivo)
        // Por defecto usar el token subsidiado
        const defaultToken = subsidiado || contributivo
        setTokenAcceso(defaultToken)
        
        // Guardar todos los tokens
        onSave({
          nit,
          tokenSubsidiado: TOKEN_SUBSIDIADO,
          tokenContributivo: TOKEN_CONTRIBUTIVO,
          tokenAcceso: defaultToken,
          tokenAccesoSubsidiado: subsidiado,
          tokenAccesoContributivo: contributivo,
        })

        setGenerarResult({
          success: true,
          message: `Credenciales validadas. Tokens obtenidos: Subsidiado ${subsidiado ? "✓" : "✗"}, Contributivo ${contributivo ? "✓" : "✗"}`,
        })
      } else {
        setGenerarResult({
          success: false,
          error: `Error al obtener tokens. Subsidiado: ${resultSubsidiado.success ? "OK" : resultSubsidiado.error}, Contributivo: ${resultContributivo.success ? "OK" : resultContributivo.error}`,
        })
      }
    } catch (error) {
      setGenerarResult({ success: false, error: "Error al conectar con el servidor" })
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuración</h2>
          <p className="text-muted-foreground">Configure las credenciales de acceso a MIPRES</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CredencialesCard
          nit={nit}
          TOKEN_SUBSIDIADO={TOKEN_SUBSIDIADO}
          TOKEN_CONTRIBUTIVO={TOKEN_CONTRIBUTIVO}
          showToken={showToken}
          onShowTokenToggle={() => setShowToken(!showToken)}
        />

        <ValidacionCard
          generando={generando}
          generarResult={generarResult}
          tokenAccesoSubsidiado={tokenAccesoSubsidiado}
          tokenAccesoContributivo={tokenAccesoContributivo}
          showTokenAcceso={showTokenAcceso}
          onValidar={handleValidar}
          onShowTokenAccesoToggle={() => setShowTokenAcceso(!showTokenAcceso)}
        />

        <EstadoCard credentials={credentials} />
        
      </div>
    </div>
  )
}
