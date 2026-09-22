"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IPS_DUSAKAWI } from "@/lib/config/organizacion"

interface LoginHeaderProps {
  mode?: "login" | "register"
}

export function LoginHeader({ mode = "login" }: LoginHeaderProps) {
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
      <div className="w-full flex justify-end">
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleTheme}
          title={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </div>
      <div className="relative h-28 w-28 overflow-hidden rounded-full bg-card shadow-md border border-border">
        <Image
          src="/logo.png"
          alt={`Logo ${IPS_DUSAKAWI.nombreIPS}`}
          fill
          className="object-contain p-2"
          priority
        />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {mode === "register" ? "Crear cuenta" : "MIPRES"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {IPS_DUSAKAWI.nombreIPS}
        </p>
        <p className="text-xs text-muted-foreground">
          {mode === "register"
            ? "Completa los datos para registrarte"
            : "Sistema de prescripciones de servicios y tecnologías"}
        </p>
      </div>
    </div>
  )
}
