"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Moon, Sun, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LoginHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDarkMode = mounted && resolvedTheme === "dark"

  const handleToggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark")
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Top Bar: Security badge and theme switcher */}
      <div className="w-full flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary shadow-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <ShieldCheck className="size-3.5" />
          <span>Acceso Seguro</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleTheme}
          className="h-8 w-8 rounded-full border border-border/70 hover:bg-accent/80 hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground"
          title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          aria-label="Cambiar tema de color"
        >
          {mounted ? (
            isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-primary transition-transform rotate-0 hover:-rotate-12" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Logo container with halo glow */}
      <div className="relative group my-1">
        <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-primary/30 via-teal-400/20 to-primary/30 opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-card/95 backdrop-blur-sm shadow-md border border-border/80 p-2 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Logo MIPRES"
            fill
            sizes="96px"
            className="object-contain p-2 drop-shadow-xs"
            priority
          />
        </div>
      </div>

      {/* Title & Context */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          MIPRES
        </h1>
        <p className="text-xs sm:text-sm font-medium text-primary">
          Prescripción de Servicios y Tecnologías en Salud
        </p>
        <p className="text-[11px] text-muted-foreground">
          Ministerio de Salud y Protección Social
        </p>
      </div>
    </div>
  )
}
