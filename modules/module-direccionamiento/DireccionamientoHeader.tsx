"use client"

import { ArrowRight } from "lucide-react"

interface DireccionamientoHeaderProps {
  isConfigured?: boolean
}

export function DireccionamientoHeader({ isConfigured }: DireccionamientoHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArrowRight className="h-5 w-5" />
          </span>
          Direccionamiento
        </h2>
        <p className="text-muted-foreground">Gestion de direccionamientos MIPRES</p>
      </div>
    </div>
  )
}
