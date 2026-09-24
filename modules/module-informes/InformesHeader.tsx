"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, FileBarChart } from "lucide-react"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface InformesHeaderProps {
  isConfigured: boolean
}

export function InformesHeader({ isConfigured }: InformesHeaderProps) {
  const { esIPS } = useEmpresaActual()
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileBarChart className="h-5 w-5" />
            </span>
            Informes
          </h2>
          <p className="text-muted-foreground">
            Consulta y descarga de reportes MIPRES para {esIPS ? "IPS" : "EPS"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
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
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure el NIT y Token en el modulo de Configuracion antes de consultar o descargar informes.
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}