"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Menu, User, Moon, Sun, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MipresCredentials } from "@/models/credentials.model"
import { secureStorageRemoveItem } from "@/lib/secure-storage"
import { NotificationBell } from "./NotificationBell"
import { IPS_DUSAKAWI } from "@/lib/config/organizacion"

interface MipresHeaderProps {
  credentials: MipresCredentials
  onToggleSidebar: () => void
}

export function MipresHeader({ credentials, onToggleSidebar }: MipresHeaderProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDarkMode = mounted && resolvedTheme === "dark"

  const isConfigured =
    credentials.nit &&
    credentials.tokenSubsidiado &&
    credentials.tokenContributivo &&
    credentials.tokenAccesoSubsidiado &&
    credentials.tokenAccesoContributivo

  const formatRoleName = (raw?: string | number | null) => {
    if (!raw) return null
    try {
      const s = String(raw)
      const lower = s.toLowerCase()
      return lower.replace(/\b\w/g, (c) => c.toUpperCase())
    } catch {
      return String(raw)
    }
  }

  const rawRoleName = (credentials as any)?.rol_nombre ?? (credentials as any)?.rolNombre ?? null
  const roleLabel = rawRoleName ? formatRoleName(rawRoleName) : null

  const clearAllCookies = () => {
    if (typeof document === "undefined") return

    const cookies = document.cookie.split(";")
    for (const cookie of cookies) {
      const index = cookie.indexOf("=")
      const name = (index > -1 ? cookie.slice(0, index) : cookie).trim()
      if (!name) continue

      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  }

  const handleLogout = () => {
    secureStorageRemoveItem("mipres_logged_in")
    secureStorageRemoveItem("mipres_session_expires_at")
    secureStorageRemoveItem("mipres_credentials")
    secureStorageRemoveItem("mipres_notifications_viewed")

    if (typeof window !== "undefined") {
      try {
        window.localStorage.clear()
      } catch {
      }

      try {
        window.sessionStorage.clear()
      } catch {
      }
    }

    clearAllCookies()
    router.replace("/login")
  }

  const handleToggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-50 bg-appbar text-appbar-foreground shadow-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="text-appbar-foreground hover:bg-appbar/80"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">MIPRES</h1>
              <p className="hidden sm:block text-xs text-appbar-foreground/80 truncate">Sistema de Prescripciones de {IPS_DUSAKAWI.nombreIPS}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-4">
          {roleLabel && (
            <Badge variant="secondary" className="hidden sm:flex">
              {roleLabel}
            </Badge>
          )}
          <Badge
            variant={isConfigured ? "secondary" : "destructive"}
            className="hidden sm:flex"
          >
            {isConfigured ? `NIT EPS: ${credentials.nit}` : "Sin Validar Token"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="text-appbar-foreground hover:bg-appbar/80"
            onClick={handleToggleTheme}
            title={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Cambiar tema</span>
          </Button>
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-appbar-foreground hover:bg-appbar/80"
                title="Menú de usuario"
              >
                <User className="h-5 w-5" />
                <span className="sr-only">Menú de usuario</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuLabel>
                {credentials.documentoUsuario || credentials.usuario ? `${credentials.documentoUsuario || credentials.usuario}${roleLabel ? ` · ${roleLabel}` : ""}` : "Cuenta"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
