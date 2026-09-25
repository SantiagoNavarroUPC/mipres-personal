"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  Building2,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MipresCredentials } from "@/models/credentials.model"
import { secureStorageRemoveItem } from "@/lib/secure-storage"
import { NotificationBell } from "./NotificationBell"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface MipresHeaderProps {
  credentials: MipresCredentials
  onToggleSidebar: () => void
}

export function MipresHeader({ credentials, onToggleSidebar }: MipresHeaderProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { esIPS } = useEmpresaActual()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDarkMode = mounted && resolvedTheme === "dark"

  const isConfigured = Boolean(
    credentials.nit &&
    credentials.tokenSubsidiado &&
    credentials.tokenContributivo &&
    credentials.tokenAccesoSubsidiado &&
    credentials.tokenAccesoContributivo
  )

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
    <header className="sticky top-0 z-50 bg-appbar text-appbar-foreground shadow-sm border-b border-white/10 backdrop-blur-md">
      {/* Subtle bottom gradient accent line */}
      <div
        className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 h-[60px]">
        {/* Left: Sidebar toggle, Logo and Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="size-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-xs cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            title="Alternar menú lateral"
            aria-label="Alternar menú lateral"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo emblem */}
          <div className="relative size-8 rounded-lg bg-white/15 p-1 backdrop-blur-xs border border-white/20 shrink-0 hidden xs:flex items-center justify-center shadow-xs">
            <Image
              src="/logo.png"
              alt="Logo MIPRES"
              width={24}
              height={24}
              className="object-contain"
              priority
            />
          </div>

          {/* Title and subtitle */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-none">
                MIPRES
              </span>
              <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/15 text-white border border-white/20">
                MinSalud
              </span>
            </div>
            <span className="hidden sm:block text-[11px] text-white/80 truncate leading-tight mt-0.5 max-w-[220px] md:max-w-xs lg:max-w-md">
              {credentials.nombreEmpresa || "Sistema de Prescripciones Médicas"}
            </span>
          </div>
        </div>

        {/* Right: Status Pills, Theme Toggle, Notifications, User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {roleLabel && (
            <Badge variant="secondary" className="hidden sm:flex">
              {roleLabel}
            </Badge>
          )}
          <Badge
            variant={isConfigured ? "secondary" : "destructive"}
            className="hidden sm:flex"
          >
            {isConfigured ? `NIT ${esIPS ? "IPS" : "EPS"}: ${credentials.nit}` : "Sin Validar Token"}
          </Badge>

          {/* Theme switcher button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleTheme}
            className="size-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-xs cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            title={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
            aria-label="Cambiar tema de color"
          >
            {mounted ? (
              isDarkMode ? (
                <Sun className="h-4 w-4 text-amber-300 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-white transition-transform rotate-0 hover:-rotate-12" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </Button>

          {/* Notification bell */}
          <NotificationBell />

          {/* User profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-2 sm:px-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-xs flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
                title="Menú de usuario"
              >
                <div className="size-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs text-white shadow-xs">
                  {(credentials.usuario || "U").charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline-block text-xs font-semibold text-white/95 max-w-[110px] truncate">
                  {credentials.usuario || "Usuario"}
                </span>
                <ChevronDown className="size-3 text-white/70 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-border/80 rounded-xl">
              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg mb-1.5">
                <div className="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {(credentials.usuario || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {credentials.usuario || "Usuario"}
                  </p>
                  {credentials.documentoUsuario && credentials.documentoUsuario !== credentials.usuario && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      Doc: {credentials.documentoUsuario}
                    </p>
                  )}
                  {roleLabel && (
                    <span className="inline-block mt-0.5 text-[10px] font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
                      {roleLabel}
                    </span>
                  )}
                </div>
              </div>

              {credentials.nombreEmpresa && (
                <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2 mb-1">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{credentials.nombreEmpresa}</span>
                </div>
              )}

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-lg text-xs font-medium py-2"
              >
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
