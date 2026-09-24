"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Package, AlertCircle } from "lucide-react"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface SuministroHeaderProps {
  isConfigured: boolean
}

export function SuministroHeader({ isConfigured }: SuministroHeaderProps) {
  const { esIPS } = useEmpresaActual()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </span>
            Suministros
          </h2>
          <p className="text-muted-foreground">
            Gestión de suministros para {esIPS ? "IPS" : "EPS"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm bg-emerald-50 text-emerald-700 border-emerald-200">
            <Package className="h-4 w-4 mr-1" />
            Suministro
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

      {!isConfigured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuración requerida</AlertTitle>
          <AlertDescription>
            Configure el NIT y los tokens en el módulo de Configuración para utilizar este módulo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
