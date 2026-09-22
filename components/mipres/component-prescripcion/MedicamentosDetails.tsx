import type { Medicamento } from "@/models/mipres-sispro/prescripcion"
import { ESTADOS_TECNOLOGIAS, TIPOS_MEDICAMENTO, UNIDADES_DOSIS, UNIDADES_TIEMPO } from "@/models/constants"
import { EmptySection } from "./EmptySection"
import { JSX } from "react"

interface MedicamentosDetailsProps {
  medicamentos: Medicamento[]
}

function getNombreUnidadDosis(value: unknown): string {
  const raw = String(value ?? "").trim()
  if (!raw) return "-"

  const normalized = /^\d+$/.test(raw) ? raw.padStart(4, "0") : raw
  const found = UNIDADES_DOSIS.find((item) => item.codigo === normalized || item.codigo === raw)
  return found?.nombre || raw
}

export function MedicamentosDetails({ medicamentos }: MedicamentosDetailsProps) {
  if (!medicamentos?.length) return <EmptySection label="medicamentos" />

  return (
    <div className="grid gap-4">
      {medicamentos.map((med, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3"
        >
          {/* 🔹 DESCRIPCIÓN COMPLETA ARRIBA */}
          <h4 className="text-[12px] text-foreground leading-tight font-medium">
            {med.DescMedPrinAct?.split("&").reduce((rows, item, index, array) => {
              if (index % 2 === 0) {
                rows.push(
                  <div key={index}>
                    {item}
                    {array[index + 1] ? ` | ${array[index + 1]}` : ""}
                  </div>
                )
              }
              return rows
            }, [] as JSX.Element[])}
          </h4>
          <span className="text-xs font-medium text-muted-foreground">
            {ESTADOS_TECNOLOGIAS[
              med.EstJM as keyof typeof ESTADOS_TECNOLOGIAS
            ] || "Desconocido"}
          </span>

          {/* 🔹 DATOS */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-emerald-700">Tipo:</span>{" "}
              {TIPOS_MEDICAMENTO[
                med.TipoMed as keyof typeof TIPOS_MEDICAMENTO
              ] || med.TipoMed}
            </p>
            <p>
              <span className="font-medium text-emerald-700">Dosis:</span>{" "}
              {med.Dosis} {getNombreUnidadDosis(med.DosisUM)}
            </p>
             <p>
               <span className="font-medium text-emerald-700">Frecuencia:</span>{" "}
               {med.NoFAdmon || "-" } {UNIDADES_TIEMPO[Number(med.CodFreAdmon) as keyof typeof UNIDADES_TIEMPO] || ""}
             </p>
             <p>
               <span className="font-medium text-emerald-700">Duración:</span>{" "}
               {med.CanTrat || "-"} {UNIDADES_TIEMPO[Number(med.DurTrat) as keyof typeof UNIDADES_TIEMPO] || med.DurTrat || ""}
             </p>
            <p>
              <span className="font-medium text-emerald-700">Cantidad:</span>{" "}
              {med.CantTotalF} {med.UFCantTotalF}
            </p>

            {med.JustNoPBS && (
              <p className="col-span-2">
                <span className="font-medium text-emerald-700">
                  Justificación:
                </span>{" "}
                {med.JustNoPBS}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}