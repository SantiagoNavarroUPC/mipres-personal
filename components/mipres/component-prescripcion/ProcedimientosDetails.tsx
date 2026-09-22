import type { Procedimiento } from "@/models/mipres-sispro/prescripcion"
import { ESTADOS_TECNOLOGIAS, UNIDADES_TIEMPO } from "@/models/constants"
import { EmptySection } from "./EmptySection"

interface ProcedimientosDetailsProps {
  procedimientos: Procedimiento[]
}

export function ProcedimientosDetails({ procedimientos }: ProcedimientosDetailsProps) {
  if (!procedimientos?.length) return <EmptySection label="procedimientos" />

  return (
    <div className="grid gap-4">
      {procedimientos.map((proc, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 space-y-3"
        >
          <h4 className="font-medium text-sm text-foreground line-clamp-2">Código CUPS {proc.CodCUPS}</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {ESTADOS_TECNOLOGIAS[proc.EstJM as keyof typeof ESTADOS_TECNOLOGIAS] || (proc as any).NomProc || "Desconocido"}
            </span>
          </div>

          <div className="text-xs text-muted-foreground">
            <p><span className="font-medium text-sky-700">Justificacion:</span> {proc.JustNoPBS}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p><span className="font-medium text-sky-700">Cantidad:</span> {proc.CantTotal}</p>
            <p>
              <span className="font-medium text-sky-700">Frecuencia:</span>{" "}
              {proc.CadaFreUso || "-"} {UNIDADES_TIEMPO[proc.CodFreUso as keyof typeof UNIDADES_TIEMPO] || ""}
            </p>
            <p>
              <span className="font-medium text-sky-700">Duración:</span>{" "}
              {proc.Cant || "-"} {UNIDADES_TIEMPO[proc.CodPerDurTrat as keyof typeof UNIDADES_TIEMPO] || ""}
            </p>
          </div>

        </div>
      ))}
    </div>
  )
}
