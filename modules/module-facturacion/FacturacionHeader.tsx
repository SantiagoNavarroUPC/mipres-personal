"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Receipt, AlertCircle } from "lucide-react"

interface FacturacionHeaderProps {
  isConfigured: boolean
}

export function FacturacionHeader({ isConfigured }: FacturacionHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </span>
            Facturación
          </h2>
          <p className="text-muted-foreground">
            Consulta de datos facturados MIPRES
          </p>
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
