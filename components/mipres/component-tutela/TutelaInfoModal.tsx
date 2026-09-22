"use client"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileText,
  Stethoscope,
  Gavel,
  BadgeCheck,
  Calendar,
} from "lucide-react"

interface TutelaInfoModalProps {
  tutela: any
  open: boolean
  onClose: () => void
}

function formatDate(value: any) {
  if (!value) return "-"
  const text = String(value)
  return text.includes("T") ? text.split("T")[0] : text
}

function getArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

// Modal de información de autorización y fallos de tutela
export function TutelaInfoModal({ tutela, open, onClose }: TutelaInfoModalProps) {
  if (!tutela) return null

  const fallos = getArray(tutela.fallosTutelasAdicionales)
  const nombreProfesional = [tutela.PNProfS, tutela.SNProfS, tutela.PAProfS, tutela.SAProfS]
    .filter(Boolean)
    .join(" ") || "N/A"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Información de Tutela
          </DialogTitle>
          <DialogDescription>Datos del profesional y fallo</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar y nombre del profesional */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Gavel className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{nombreProfesional}</h3>
              <p className="text-sm text-muted-foreground">Profesional Autorizado</p>
            </div>
          </div>

          {/* Detalles del profesional */}
          <div className="grid gap-3">
            {/* Documento del Profesional */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Documento</p>
                <p className="font-medium font-mono text-sm">
                  {tutela.TipoIDProf || ""} {tutela.NumIDProf || ""}
                </p>
              </div>
            </div>

            {/* Registro Profesional */}
            {tutela.RegProfS && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center">
                  <BadgeCheck className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Registro Profesional</p>
                  <p className="font-medium text-sm">{tutela.RegProfS}</p>
                </div>
              </div>
            )}
          </div>

          {/* Información del Fallo */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Gavel className="h-4 w-4 text-primary" />
              Información del Fallo
            </h4>
            <div className="grid gap-2">
              {/* Número de Fallo */}
              {tutela.NroFallo && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Número de Fallo</p>
                    <p className="font-medium font-mono text-sm">{tutela.NroFallo}</p>
                  </div>
                </div>
              )}

              {/* Fecha del Fallo */}
              {tutela.FFalloTutela && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha del Fallo</p>
                    <p className="font-medium text-sm">{formatDate(tutela.FFalloTutela)}</p>
                  </div>
                </div>
              )}

              {/* Primera Instancia */}
              {tutela.F1Instan && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">1ª Instancia</p>
                    <p className="font-medium text-sm">{formatDate(tutela.F1Instan)}</p>
                  </div>
                </div>
              )}

              {/* Segunda Instancia */}
              {tutela.F2Instan && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">2ª Instancia</p>
                    <p className="font-medium text-sm">{formatDate(tutela.F2Instan)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Aclaración del Fallo */}
          {tutela.AclFalloTut && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-2">Aclaración del Fallo</h4>
              <p className="text-xs text-muted-foreground leading-relaxed p-3 rounded-lg bg-muted/30">
                {tutela.AclFalloTut}
              </p>
            </div>
          )}

          {/* Diagnóstico y Justificación */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Diagnóstico y Justificación
            </h4>
            <div className="grid gap-2">
              {/* Diagnóstico Principal */}
              {tutela.CodDxPpal && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Diagnóstico Principal</p>
                  <p className="font-medium font-mono text-sm">{tutela.CodDxPpal}</p>
                </div>
              )}

              {/* Justificación Médica */}
              {tutela.JustiMed && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Justificación Médica</p>
                  <p className="text-xs leading-relaxed">{tutela.JustiMed}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fallos Adicionales */}
          {fallos.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Fallos Adicionales ({fallos.length})
              </h4>
              <ScrollArea className="h-[150px] pr-4">
                <div className="grid gap-2">
                  {fallos.map((item: any, idx: number) => (
                    <div
                      key={`${item.NroFallAdic || idx}`}
                      className="rounded-lg border p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-primary">{item.NroFallAdic || "Fallo"}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Fecha: {formatDate(item.FFalloAdic)}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
