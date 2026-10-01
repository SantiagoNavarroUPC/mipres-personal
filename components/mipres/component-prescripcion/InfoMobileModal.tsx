"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"
import { AMBITOS_ATENCION } from "@/models/constants"

interface InfoMobileModalProps {
  prescripcion: any
  open: boolean
  onClose: () => void
}

export function InfoMobileModal({ prescripcion, open, onClose }: InfoMobileModalProps) {
  if (!prescripcion) return null

  const nombreCompleto = [
    prescripcion.PNPaciente,
    prescripcion.SNPaciente,
    prescripcion.PAPaciente,
    prescripcion.SAPaciente,
  ]
    .filter(Boolean)
    .join(" ")

  const documento = `${prescripcion.TipoIDPaciente || prescripcion.TipoIDPac || ""} ${prescripcion.NroIDPaciente || prescripcion.NoIDPaciente || ""}`.trim()
  const ambitoCode = String(prescripcion.CodAmbAte ?? prescripcion.Ambito ?? "").trim() as keyof typeof AMBITOS_ATENCION
  const ambitoNombre = AMBITOS_ATENCION[ambitoCode] || prescripcion.Ambito || "Sin ámbito"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-sm sm:max-w-md p-0 gap-0 overflow-hidden rounded-xl border border-border/80">
        <DialogHeader className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <User className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xs sm:text-sm font-semibold leading-tight truncate">
                {nombreCompleto || "Información del Paciente"}
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-[11px] mt-0.5 truncate">
                {documento ? `Documento: ${documento}` : "Detalles del paciente y afiliación"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-3 sm:p-3.5 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {/* Tarjeta de afiliación y prescripción */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg border border-border/70 bg-card/60 text-xs">
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Régimen
              </span>
              <Badge
                variant="secondary"
                className={`text-[9px] font-semibold px-1.5 py-0.2 ${
                  prescripcion.tipoRegimen === "Contributivo"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    : prescripcion.tipoRegimen === "Subsidiado"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {prescripcion.tipoRegimen || "No especificado"}
              </Badge>
            </div>

            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Prescripción
              </span>
              <span className="font-mono text-[11px] font-medium text-primary">
                {prescripcion.NoPrescripcion || "-"}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Ámbito
              </span>
              <span className="text-[11px] font-medium text-foreground truncate block" title={ambitoNombre}>
                {ambitoNombre}
              </span>
            </div>
          </div>

          {/* IPS y Diagnóstico */}
          <div className="space-y-2 text-xs">
            {prescripcion.CodDxPpal && (
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  Diagnóstico Principal
                </span>
                <span className="font-mono font-semibold text-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px] inline-block">
                  {prescripcion.CodDxPpal}
                </span>
              </div>
            )}

            {prescripcion.ipsSolicitanteNombre && (
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  IPS Solicitante
                </span>
                <p className="font-medium text-[11px] text-foreground leading-snug">{prescripcion.ipsSolicitanteNombre}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {prescripcion.TipoIDIPS} {prescripcion.NroIDIPS}
                </p>
              </div>
            )}

            {(prescripcion.PNProfS || prescripcion.PAProfS) && (
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  Profesional Prescriptor
                </span>
                <p className="font-medium text-[11px] text-foreground leading-snug">
                  {`${prescripcion.PNProfS || ""} ${prescripcion.PAProfS || ""}`.trim()}
                </p>
                {prescripcion.RegProfS && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Registro: {prescripcion.RegProfS}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
