"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { secureStorageRemoveItem, secureStorageSetItem } from "@/lib/secure-storage"

// El NIT y el tipo de empresa (IPS/EPS) ya no vienen de NEXT_PUBLIC_NIT_EPSI/
// NEXT_PUBLIC_NIT_IPS/NEXT_PUBLIC_TIPO_USUARIO: cada usuario tiene su propia
// empresa (mipres.usuario_mipres.id_empresa), y /api/auth/login ya devuelve
// nit/nombre_empresa/id_tipo_empresa de esa empresa. Para IPS el token sigue
// siendo un secreto por variable de entorno (ya viene validado, no hay
// intercambio). Para EPS, las credenciales (fuente + token de acceso ya
// validado) se guardan por empresa en la BD (ver ConfiguracionModule) y se
// cargan aquí mismo tras el login, para que el header no pida revalidar cada
// sesión si ya estaban guardadas.
const TOKEN_VALIDADO = process.env.NEXT_PUBLIC_TOKEN_VALIDADO

interface CredencialesMipresDb {
  token_subsidiado: string | null
  token_contributivo: string | null
  token_subsidiado_validado: string | null
  token_contributivo_validado: string | null
}

async function obtenerCredencialesMipres(authToken: string): Promise<CredencialesMipresDb | null> {
  try {
    const response = await fetch("/api/empresa/mis-credenciales-mipres", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) return null
    return payload.data as CredencialesMipresDb
  } catch {
    return null
  }
}

export function LoginForm() {
  const router = useRouter()
  const [usuario, setUsuario] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Credenciales incorrectas")
        return
      }

      // IPS: el NIT y el token ya vienen validados (TOKEN_VALIDADO), no hay
      // intercambio contra MIPRES. EPS: las credenciales (fuente + token de
      // acceso ya validado) ya deben estar guardadas en la BD para esta
      // empresa (Configuración > Credenciales/Validación); si no lo están,
      // el header quedará "Sin Validar Token" hasta que se guarden ahí.
      const nit = String(data.nit || "").trim()
      const esIPS = data.id_tipo_empresa === 1

      let tokenSubsidiado = ""
      let tokenContributivo = ""
      let tokenAccesoSubsidiado = ""
      let tokenAccesoContributivo = ""
      let tokenAcceso = ""

      if (esIPS) {
        tokenAcceso = String(TOKEN_VALIDADO || "").trim()
        tokenAccesoSubsidiado = tokenAcceso
        tokenAccesoContributivo = tokenAcceso
      } else {
        const credencialesMipres = await obtenerCredencialesMipres(data.token)
        tokenSubsidiado = credencialesMipres?.token_subsidiado || ""
        tokenContributivo = credencialesMipres?.token_contributivo || ""
        tokenAccesoSubsidiado = credencialesMipres?.token_subsidiado_validado || ""
        tokenAccesoContributivo = credencialesMipres?.token_contributivo_validado || ""
        tokenAcceso = tokenAccesoSubsidiado || tokenAccesoContributivo || ""
      }

      // El backend firma el JWT con una duración corta (ver JWT_EXPIRES_IN en
      // api-dusakawi); usar ese valor real evita que el cliente crea tener
      // sesion valida cuando el backend ya rechazaria el token.
      const expiresInSeconds = typeof data.expiresIn === "number" && data.expiresIn > 0 ? data.expiresIn : 2 * 60 * 60
      const expiresAt = Date.now() + expiresInSeconds * 1000
      // La sesion se renueva con el refresh token (opaco, rotado y revocable
      // en el backend), nunca reautenticando con la contrasena: por eso no se
      // persiste `contrasena` aqui, a diferencia de versiones anteriores.
      const refreshExpiresInSeconds = typeof data.refreshExpiresIn === "number" && data.refreshExpiresIn > 0
        ? data.refreshExpiresIn
        : 7 * 24 * 60 * 60
      const refreshExpiresAt = Date.now() + refreshExpiresInSeconds * 1000
      secureStorageRemoveItem("mipres_notifications_viewed")
      secureStorageSetItem("mipres_logged_in", "true")
      secureStorageSetItem("mipres_session_expires_at", String(expiresAt))
      secureStorageSetItem(
        "mipres_credentials",
        JSON.stringify({
          nit,
          nitIps: nit,
          tokenAcceso,
          usuario: data.usuario,
          usuarioSesion: usuario,
          documentoUsuario: data.usuario,
          rolMipres: data.rol_mipres,
          rol_nombre: data.rol_nombre ?? null,
          nombreEmpresa: data.nombre_empresa ?? null,
          direccionEmpresa: data.direccion_empresa ?? null,
          municipioEmpresa: data.municipio_empresa ?? null,
          municipioCodigoEmpresa: data.municipio_codigo_empresa ?? null,
          departamentoEmpresa: data.departamento_empresa ?? null,
          departamentoCodigoEmpresa: data.departamento_codigo_empresa ?? null,
          idTipoEmpresa: data.id_tipo_empresa ?? null,
          authToken: data.token,
          refreshToken: data.refreshToken || null,
          expiresAt,
          refreshExpiresAt,
          tokenSubsidiado: esIPS ? tokenAcceso : tokenSubsidiado,
          tokenContributivo: esIPS ? tokenAcceso : tokenContributivo,
          tokenAccesoSubsidiado,
          tokenAccesoContributivo,
        })
      )
      router.push("/mipres")
    } catch {
      setError("Error de conexión. Intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="usuario" className="text-foreground">
          Usuario
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="usuario"
            type="text"
            placeholder="Ingrese su usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="pl-10 h-11 bg-card"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contrasena" className="text-foreground">
          Contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="contrasena"
            type={showPassword ? "text" : "password"}
            placeholder="Ingrese su contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className="pl-10 pr-10 h-11 bg-card"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="mt-2 h-11 w-full font-semibold text-base"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Ingresando...
          </>
        ) : (
          "Ingresar"
        )}
      </Button>
    </form>
  )
}
