"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, Lock, Eye, EyeOff, Loader2, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { secureStorageRemoveItem, secureStorageSetItem } from "@/lib/secure-storage"

const TOKEN_SUBSIDIADO = process.env.NEXT_PUBLIC_TOKEN_SUBSIDIADO
const TOKEN_CONTRIBUTIVO = process.env.NEXT_PUBLIC_TOKEN_CONTRIBUTIVO
const NIT_EPSI = process.env.NEXT_PUBLIC_NIT_EPSI

async function generarTokenAcceso(nit: string, token: string) {
  const response = await fetch("/api/mipres/generar-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nit, token }),
  })

  const payload = await response.json().catch(() => null)

  return {
    success: Boolean(response.ok && payload?.success),
    tokenAcceso: typeof payload?.tokenAcceso === "string" ? payload.tokenAcceso : "",
    error: payload?.error || payload?.message || (response.ok ? "" : "No se pudo generar el token"),
  }
}

export function LoginForm({ onCreateAccount }: { onCreateAccount?: () => void }) {
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

      const nit = String(NIT_EPSI || "").trim()
      const [resultadoSubsidiado, resultadoContributivo] = nit && TOKEN_SUBSIDIADO && TOKEN_CONTRIBUTIVO
        ? await Promise.all([
            generarTokenAcceso(nit, TOKEN_SUBSIDIADO),
            generarTokenAcceso(nit, TOKEN_CONTRIBUTIVO),
          ])
        : [{ success: false, tokenAcceso: "", error: "" }, { success: false, tokenAcceso: "", error: "" }]

      const tokenAccesoSubsidiado = resultadoSubsidiado.tokenAcceso || ""
      const tokenAccesoContributivo = resultadoContributivo.tokenAcceso || ""
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
          authToken: data.token,
          refreshToken: data.refreshToken || null,
          expiresAt,
          refreshExpiresAt,
          tokenSubsidiado: TOKEN_SUBSIDIADO,
          tokenContributivo: TOKEN_CONTRIBUTIVO,
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

      {onCreateAccount && (
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full text-sm text-muted-foreground hover:text-foreground"
          onClick={onCreateAccount}
          disabled={isLoading}
        >
          <UserPlus className="size-4" />
          Crear cuenta nueva
        </Button>
      )}
    </form>
  )
}
