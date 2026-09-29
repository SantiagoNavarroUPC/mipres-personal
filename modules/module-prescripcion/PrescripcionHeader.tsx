"use client"

import { FileText } from "lucide-react"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface PrescripcionHeaderProps {
  isConfigured?: boolean
}

export function PrescripcionHeader({ isConfigured }: PrescripcionHeaderProps) {
  const { esIPS } = useEmpresaActual()
  return (
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
    </div>
  )
}
