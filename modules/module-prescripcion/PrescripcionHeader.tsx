"use client"

import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, FileText } from "lucide-react"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface PrescripcionHeaderProps {
  isConfigured: boolean
}

export function PrescripcionHeader({ isConfigured }: PrescripcionHeaderProps) {
  const { esIPS } = useEmpresaActual()
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            Prescripciones
          </h2>
          <p className="text-muted-foreground">
            Consulta de prescripciones MIPRES para {esIPS ? "IPS" : "EPS"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm bg-emerald-50 text-emerald-700 border-emerald-200">
            <FileText className="h-4 w-4 mr-1" />
            Prescripción
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
    </>
  )
}
