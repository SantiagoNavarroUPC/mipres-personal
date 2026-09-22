import React from "react"
import { DispositivoMedico } from "@/models/mipres-sispro/prescripcion"
import { ESTADOS_TECNOLOGIAS } from "@/models/constants"
import { EmptySection } from "./EmptySection"

interface DispositivosDetailsProps {
  dispositivos: DispositivoMedico[]
}

export function DispositivosDetails({ dispositivos }: DispositivosDetailsProps) {
  if (!dispositivos?.length) return <EmptySection label="dispositivos médicos" />

  return (
    <div className="grid gap-4">
      {dispositivos.map((disp, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3"
        >
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-amber-700">Código del dispositivo:</span> {disp.CodDisp}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-amber-700">Estado JM:</span>{" "}
              {ESTADOS_TECNOLOGIAS[disp.EstJM as keyof typeof ESTADOS_TECNOLOGIAS] || "Desconocido"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            <p><span className="font-semibold text-amber-700">Justificación No PBS:</span> {disp.JustNoPBS}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            <p><span className="font-semibold text-amber-700">Cantidad:</span> {disp.CantTotal}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
