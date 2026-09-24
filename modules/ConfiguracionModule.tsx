"use client"

import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import type { MipresCredentials } from "@/models/credentials.model"
import { CredencialesCard, EstadoCard, ValidacionCard } from "@/components/component-configuracion"
import { useEmpresaActual } from "@/lib/use-empresa-actual"
import { fetchWithAuth } from "@/lib/auth"

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

interface CredencialesMipresState {
  tokenSubsidiado: string | null
  tokenContributivo: string | null
  tokenSubsidiadoValidado: string | null
  tokenContributivoValidado: string | null
}

const CREDENCIALES_VACIAS: CredencialesMipresState = {
  tokenSubsidiado: null,
  tokenContributivo: null,
  tokenSubsidiadoValidado: null,
  tokenContributivoValidado: null,
}

export function ConfiguracionModule({ credentials, onSave }: ConfiguracionModuleProps) {
  const { esIPS } = useEmpresaActual()
  const nit = credentials.nit || ""
  const [loadingCredenciales, setLoadingCredenciales] = useState(true)
  const [credencialesMipres, setCredencialesMipres] = useState<CredencialesMipresState>(CREDENCIALES_VACIAS)
  const [guardandoFuente, setGuardandoFuente] = useState(false)
  const [guardandoManual, setGuardandoManual] = useState(false)
  const [showTokenAcceso, setShowTokenAcceso] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [generarResult, setGenerarResult] = useState<ConnectionResult | null>(null)

  async function cargarCredenciales() {
    setLoadingCredenciales(true)
    try {
      const res = await fetchWithAuth("/api/empresa/mis-credenciales-mipres")
      const body = await res.json().catch(() => null)
      if (res.ok && body?.success && body.data) {
        setCredencialesMipres({
          tokenSubsidiado: body.data.token_subsidiado ?? null,
          tokenContributivo: body.data.token_contributivo ?? null,
          tokenSubsidiadoValidado: body.data.token_subsidiado_validado ?? null,
          tokenContributivoValidado: body.data.token_contributivo_validado ?? null,
        })
      }
    } finally {
      setLoadingCredenciales(false)
    }
  }

  useEffect(() => {
    void cargarCredenciales()
  }, [])

  // Guarda las claves fuente (asignadas por MIPRES a esta empresa).
  async function handleGuardarFuente(tokenSubsidiado: string, tokenContributivo: string) {
    setGuardandoFuente(true)
    try {
      const res = await fetchWithAuth("/api/empresa/mis-credenciales-mipres/fuente", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_subsidiado: tokenSubsidiado || null,
          token_contributivo: tokenContributivo || null,
        }),
      })
      const body = await res.json().catch(() => null)
      if (res.ok && body?.success) {
        setCredencialesMipres((prev) => ({
          ...prev,
          tokenSubsidiado: body.data?.token_subsidiado ?? tokenSubsidiado ?? null,
          tokenContributivo: body.data?.token_contributivo ?? tokenContributivo ?? null,
        }))
        onSave({
          ...credentials,
          nit,
          tokenSubsidiado,
          tokenContributivo,
        })
      }
    } finally {
      setGuardandoFuente(false)
    }
  }

  // Persiste el token de acceso ya validado (por webservice o manual) y lo
  // deja disponible de inmediato en la sesión actual.
  async function guardarTokensValidados(tokenAccesoSubsidiado: string, tokenAccesoContributivo: string) {
    const res = await fetchWithAuth("/api/empresa/mis-credenciales-mipres/validados", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_subsidiado_validado: tokenAccesoSubsidiado || null,
        token_contributivo_validado: tokenAccesoContributivo || null,
      }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.success) {
      throw new Error(body?.message || "No se pudo guardar el token de acceso")
    }

    setCredencialesMipres((prev) => ({
      ...prev,
      tokenSubsidiadoValidado: body.data?.token_subsidiado_validado ?? tokenAccesoSubsidiado ?? null,
      tokenContributivoValidado: body.data?.token_contributivo_validado ?? tokenAccesoContributivo ?? null,
    }))

    const defaultToken = tokenAccesoSubsidiado || tokenAccesoContributivo || ""
    onSave({
      ...credentials,
      nit,
      tokenSubsidiado: credencialesMipres.tokenSubsidiado || undefined,
      tokenContributivo: credencialesMipres.tokenContributivo || undefined,
      tokenAcceso: defaultToken || credentials.tokenAcceso,
      tokenAccesoSubsidiado: tokenAccesoSubsidiado || undefined,
      tokenAccesoContributivo: tokenAccesoContributivo || undefined,
    })
  }

  // Validar credenciales contra el webservice de MIPRES usando las claves
  // fuente guardadas en la BD (ya no variables de entorno).
  const handleValidar = async () => {
    if (!nit) return
    const { tokenSubsidiado, tokenContributivo } = credencialesMipres
    if (!tokenSubsidiado && !tokenContributivo) {
      setGenerarResult({ success: false, error: "Guarde primero las credenciales (token subsidiado y/o contributivo)" })
      return
    }

    setGenerando(true)
    setGenerarResult(null)

    try {
      const [resultSubsidiado, resultContributivo] = await Promise.all([
        tokenSubsidiado
          ? fetch("/api/mipres/generar-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nit, token: tokenSubsidiado }),
            }).then((r) => r.json())
          : Promise.resolve({ success: false, tokenAcceso: "", error: "" }),
        tokenContributivo
          ? fetch("/api/mipres/generar-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nit, token: tokenContributivo }),
            }).then((r) => r.json())
          : Promise.resolve({ success: false, tokenAcceso: "", error: "" }),
      ])

      const subsidiado = resultSubsidiado.tokenAcceso || ""
      const contributivo = resultContributivo.tokenAcceso || ""

      if (subsidiado || contributivo) {
        await guardarTokensValidados(subsidiado, contributivo)
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
    } catch {
      setGenerarResult({ success: false, error: "Error al conectar con el servidor" })
    } finally {
      setGenerando(false)
    }
  }

  // Alternativa a la validación por webservice: el usuario ya validó en la
  // página de MIPRES y, por seguridad, prefiere digitar el token manualmente.
  async function handleGuardarManual(tokenAccesoSubsidiado: string, tokenAccesoContributivo: string) {
    setGuardandoManual(true)
    setGenerarResult(null)
    try {
      await guardarTokensValidados(tokenAccesoSubsidiado, tokenAccesoContributivo)
    } catch (error) {
      setGenerarResult({ success: false, error: error instanceof Error ? error.message : "Error al guardar" })
    } finally {
      setGuardandoManual(false)
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
          <p className="text-muted-foreground">
            Configure las credenciales de acceso a MIPRES, la aplicación está en modo {esIPS ? "IPS" : "EPS"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CredencialesCard
          nit={nit}
          loading={loadingCredenciales}
          tokenSubsidiado={credencialesMipres.tokenSubsidiado}
          tokenContributivo={credencialesMipres.tokenContributivo}
          guardando={guardandoFuente}
          onGuardar={handleGuardarFuente}
        />

        <ValidacionCard
          generando={generando}
          generarResult={generarResult}
          tokenAccesoSubsidiado={credencialesMipres.tokenSubsidiadoValidado}
          tokenAccesoContributivo={credencialesMipres.tokenContributivoValidado}
          showTokenAcceso={showTokenAcceso}
          onValidar={handleValidar}
          onShowTokenAccesoToggle={() => setShowTokenAcceso(!showTokenAcceso)}
          guardandoManual={guardandoManual}
          onGuardarManual={handleGuardarManual}
        />

        <EstadoCard credentials={credentials} />
      </div>
    </div>
  )
}
