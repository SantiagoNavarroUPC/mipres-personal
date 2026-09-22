"use client"

import { useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ClipboardList,
  User,
  BadgeCheck,
  MapPin,
  Building2,
  Stethoscope,
  Home,
} from "lucide-react"
import { AMBITOS_ATENCION } from "@/models/mipres-sispro/prescripcion"
import { useMunicipios } from "@/components/mipres/component-direccionamiento/hooks/useMunicipios"

// Mapeo de iconos y colores por tipo de ámbito
const AMBITO_CONFIG = {
  color: "text-yellow-600",
  bgColor: "bg-yellow-100",
}

interface ModalProps {
  prescripcion: any
  open: boolean
  onClose: () => void
}

// Modal de información del prescriptor
export function PrescriptorModal({ prescripcion, open, onClose }: ModalProps) {
  const { municipioByCode } = useMunicipios(open)

  const municipioNombre = useMemo(() => {
    if (!prescripcion?.CodDANEMunIPS) return null
    return municipioByCode.get(String(prescripcion.CodDANEMunIPS)) || null
  }, [municipioByCode, prescripcion?.CodDANEMunIPS])

  if (!prescripcion) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Información del Prescriptor
          </DialogTitle>
          <DialogDescription>Datos del profesional de salud</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar y nombre */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {prescripcion.PNProfS || "N/A"} {prescripcion.PAProfS || ""}
              </h3>
              <p className="text-sm text-muted-foreground">Profesional de la Salud</p>
            </div>
          </div>

          {/* Detalles */}
          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Registro Profesional</p>
                <p className="font-medium">{prescripcion.RegProfS || "No registrado"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Código DANE Municipio IPS</p>
                <p className="font-medium font-mono text-sm">
                  {prescripcion.CodDANEMunIPS || "No registrado"}
                  {municipioNombre ? ` - ${municipioNombre}` : ""}
                </p>
              </div>
            </div>

            {prescripcion.CodAmbAte && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`h-9 w-9 rounded-full ${AMBITO_CONFIG.bgColor} flex items-center justify-center`}>
                  <Building2 className={`h-4 w-4 ${AMBITO_CONFIG.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ámbito de atención</p>
                  <p className="font-medium">
                    {AMBITOS_ATENCION[prescripcion.CodAmbAte as keyof typeof AMBITOS_ATENCION] ||
                      "Ámbito desconocido"}
                  </p>
                </div>
              </div>
            )}

            {prescripcion.CodDxPpal && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center">
                  <Stethoscope className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diagnóstico Principal</p>
                  <p className="font-medium">{prescripcion.CodDxPpal}</p>
                </div>
              </div>
            )}

            {prescripcion.CodEPS && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center">
                  <Home className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {prescripcion.TipoIDIPS} - {prescripcion.NroIDIPS}
                  </p>
                  {prescripcion.ipsSolicitanteNombre && (
                    <p className="text-sm font-medium">{prescripcion.ipsSolicitanteNombre}</p>
                  )}
                  <p className="font-medium">{`${prescripcion.DirSedeIPS || "Dirección no registrada"}`}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
