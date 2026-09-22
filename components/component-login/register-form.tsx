"use client"

import { useState } from "react"
import { User, Lock, Eye, EyeOff, Loader2, UserPlus, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface RegisterFormProps {
  onBack: () => void
  onSuccess: () => void
}

type TipoUsuario = "linea_frente" | "recobro" | ""

const ROL_MAP: Record<Exclude<TipoUsuario, "">, number> = {
  linea_frente: 3,
  recobro: 4,
}

export function RegisterForm({ onBack, onSuccess }: RegisterFormProps) {
  const [usuario, setUsuario] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!tipoUsuario) {
      setError("Seleccione el tipo de usuario")
      return
    }

    if (contrasena !== confirmar) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (contrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password: contrasena, rol_mipres: ROL_MAP[tipoUsuario] }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Error al crear el usuario")
        return
      }

      toast.success(data.message || "Usuario registrado exitosamente en MIPRES")
      setUsuario("")
      setContrasena("")
      setConfirmar("")
      onSuccess()
    } catch {
      setError("Error de conexión. Intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-tipo" className="text-foreground">Tipo de usuario</Label>
        <select
          id="reg-tipo"
          value={tipoUsuario}
          onChange={(e) => setTipoUsuario(e.target.value as TipoUsuario)}
          disabled={isLoading}
          className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>Seleccione un tipo</option>
          <option value="linea_frente">Línea frente</option>
          <option value="recobro">Recobro</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-usuario" className="text-foreground">
          Usuario
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="reg-usuario"
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
        <Label htmlFor="reg-contrasena" className="text-foreground">
          Contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="reg-contrasena"
            type={showPassword ? "text" : "password"}
            placeholder="Crea una contraseña"
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-confirmar" className="text-foreground">
          Confirmar contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="reg-confirmar"
            type={showConfirm ? "text" : "password"}
            placeholder="Repite la contraseña"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="pl-10 pr-10 h-11 bg-card"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full font-semibold text-base"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creando cuenta...
            </>
          ) : (
            <>
              <UserPlus className="size-4" />
              Crear cuenta
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full text-sm text-muted-foreground hover:text-foreground"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="size-4" />
          Volver al inicio de sesión
        </Button>
      </div>
    </form>
  )
}
