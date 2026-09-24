"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
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
          alt="Logo MIPRES"
          fill
          className="object-contain p-2"
          priority
        />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          MIPRES
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MIPRES
        </p>
        <p className="text-xs text-muted-foreground">
          Sistema de prescripciones de servicios y tecnologías
        </p>
      </div>
    </div>
  )
}
