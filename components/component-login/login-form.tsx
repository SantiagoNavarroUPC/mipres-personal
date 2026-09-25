"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { secureStorageRemoveItem, secureStorageSetItem } from "@/lib/secure-storage"

// El NIT y el tipo de empresa (IPS/EPS) ya no vienen de NEXT_PUBLIC_NIT_EPSI/
// NEXT_PUBLIC_NIT_IPS/NEXT_PUBLIC_TIPO_USUARIO: cada usuario tiene su propia
// empresa (mipres.usuario_mipres.id_empresa), y /api/auth/login ya devuelve
// nit/nombre_empresa/id_tipo_empresa de esa empresa. Tanto IPS como EPS
// cargan el token de acceso ya validado desde la BD (empresa_credenciales,
// ver ConfiguracionModule): para IPS no hay intercambio contra MIPRES, así
// que se digita el mismo token validado en subsidiado y en contributivo (ver
// ValidacionCard, modo manual); para EPS puede venir de la validación por
// webservice o también digitado a mano.
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
  const [capsLockActive, setCapsLockActive] = useState(false)

  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockActive(e.getModifierState("CapsLock"))
    }
  }

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

      // Las credenciales (fuente + token de acceso ya validado) ya deben
      // estar guardadas en la BD para esta empresa (Configuración >
      // Credenciales/Validación); si no lo están, el header quedará "Sin
      // Validar Token" hasta que se guarden ahí. Para IPS, subsidiado y
      // contributivo llevan el mismo valor (no hay dos regímenes distintos).
      const nit = String(data.nit || "").trim()

      const credencialesMipres = await obtenerCredencialesMipres(data.token)
      const tokenSubsidiado = credencialesMipres?.token_subsidiado || ""
      const tokenContributivo = credencialesMipres?.token_contributivo || ""
      const tokenAccesoSubsidiado = credencialesMipres?.token_subsidiado_validado || ""
      const tokenAccesoContributivo = credencialesMipres?.token_contributivo_validado || ""
      const tokenAcceso = tokenAccesoSubsidiado || tokenAccesoContributivo || ""

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
          tokenSubsidiado,
          tokenContributivo,
          tokenAccesoSubsidiado,
          tokenAccesoContributivo,
        })
      )
      router.push("/mipres")
    } catch {
      setError("Error de conexión con el servidor. Intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive dark:text-red-400 transition-all animate-in fade-in slide-in-from-top-1"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{error}</span>
        </div>
      )}

      {/* Campo Usuario */}
      <div className="flex flex-col gap-1.5 group">
        <Label htmlFor="usuario" className="text-xs font-semibold text-foreground/90">
          Usuario o Documento
        </Label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" />
          <Input
            id="usuario"
            type="text"
            placeholder="Ingrese su usuario o documento"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="pl-10 h-11 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
            required
            autoComplete="username"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Campo Contraseña */}
      <div className="flex flex-col gap-1.5 group">
        <div className="flex items-center justify-between">
          <Label htmlFor="contrasena" className="text-xs font-semibold text-foreground/90">
            Contraseña
          </Label>
          {capsLockActive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3" />
              Mayúsculas activas
            </span>
          )}
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" />
          <Input
            id="contrasena"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            onKeyDown={handlePasswordKeyEvent}
            onKeyUp={handlePasswordKeyEvent}
            className="pl-10 pr-10 h-11 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm rounded-xl"
            required
            autoComplete="current-password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {/* Botón de Envío */}
      <Button
        type="submit"
        size="lg"
        className="relative overflow-hidden group mt-2 h-11 w-full font-semibold text-sm sm:text-base bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl"
        disabled={isLoading}
      >
        {/* Shimmer light bar on hover */}
        <span
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Validando acceso...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>Ingresar al Sistema</span>
          </span>
        )}
      </Button>

      {/* Nota de seguridad al pie del formulario */}
      <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        <span>Conexión cifrada de extremo a extremo</span>
      </div>
    </form>
  )
}
