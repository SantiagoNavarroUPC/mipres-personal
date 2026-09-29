"use client"

import { ArrowLeft } from "lucide-react"

interface NoDireccionamientoHeaderProps {
  isConfigured?: boolean
}

export function NoDireccionamientoHeader({ isConfigured }: NoDireccionamientoHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArrowLeft className="h-5 w-5" />
          </span>
          No Direccionamiento
        </h2>
        <p className="text-muted-foreground">Gestion de no direccionamientos MIPRES</p>
      </div>
    </div>
  )
}
