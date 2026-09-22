"use client"

import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

interface NoDireccionamientoHeaderProps {
  isConfigured: boolean
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
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm bg-emerald-50 text-emerald-700 border-emerald-200">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Direccionamiento
        </Badge>
          {isConfigured ? (
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              Configurado
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              Sin configurar
            </Badge>
          )}
      </div>
    </div>
  )
}
