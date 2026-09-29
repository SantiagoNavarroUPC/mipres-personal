"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { ClipboardList, AlertCircle } from "lucide-react"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface TutelaHeaderProps {
  isConfigured: boolean
}

export function TutelaHeader({ isConfigured }: TutelaHeaderProps) {
  const { esIPS } = useEmpresaActual()
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            Tutelas
          </h2>
          <p className="text-muted-foreground">
            Consulta de tutelas MIPRES para {esIPS ? "IPS" : "EPS"}
          </p>
        </div>
      </div>

      {!isConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure el NIT y Token en el módulo de Configuración antes de consultar.
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
