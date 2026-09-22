"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Pill,
  Stethoscope,
  Package,
  Sparkles,
  Activity,
  User,
  Gavel,
  BadgeCheck,
  Calendar,
} from "lucide-react"
import { MedicamentosDetails } from "@/components/mipres/component-prescripcion/MedicamentosDetails"
import { ProcedimientosDetails } from "@/components/mipres/component-prescripcion/ProcedimientosDetails"
import { DispositivosDetails } from "@/components/mipres/component-prescripcion/DispositivosDetails"
import { ProductosNutricionalesDetails } from "@/components/mipres/component-prescripcion/ProductosNutricionalesDetails"
import { ServiciosComplementariosDetails } from "@/components/mipres/component-prescripcion/ServiciosComplementariosDetails"
import { EmptySection } from "@/components/mipres/component-prescripcion/EmptySection"

interface TutelaModalProps {
  tutela: any
  open: boolean
  onClose: () => void
}

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

function getNombrePaciente(tutela: any) {
  const parts = [
    tutela?.PNPaciente,
    tutela?.SNPaciente,
    tutela?.PAPaciente,
    tutela?.SAPaciente,
  ].filter(Boolean)
  return parts.join(" ") || "N/A"
}

function getEstadoTutela(estTut?: number) {
  if (estTut === 4) return { label: "Activa", className: "bg-emerald-500" }
  if (estTut === 1) return { label: "Modificada", className: "bg-amber-500" }
  if (estTut === 2) return { label: "Anulada", className: "bg-red-500" }
  return { label: `Estado ${estTut ?? "-"}`, className: "bg-muted text-muted-foreground" }
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

export function TutelaModal({ tutela, open, onClose }: TutelaModalProps) {
  if (!tutela) return null

  const servicios = getArray(tutela.serviciosComplementarios)
  const productos = getArray(tutela.productosNutricionales)
  const medicamentos = getArray(tutela.medicamentos)
  const procedimientos = getArray(tutela.procedimientos)
  const dispositivos = getArray(tutela.dispositivos)
  const fallos = getArray(tutela.fallosTutelasAdicionales)

  const estado = getEstadoTutela(Number(tutela.EstTut))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Tutela {tutela.NoTutela || ""}
          </DialogTitle>
          <DialogDescription>Detalle completo de la tutela</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 border-b bg-background">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Paciente</p>
              <p className="font-medium">{getNombrePaciente(tutela)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Documento</p>
              <p className="font-medium">
                {tutela.TipoIDPaciente || ""} {tutela.NroIDPaciente || ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fecha</p>
              <p className="font-medium">{formatDate(tutela.FTutela)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Estado</p>
              <Badge className={`text-[10px] h-5 ${estado.className}`}>
                {estado.label}
              </Badge>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6">
            <Tabs defaultValue="servicios" className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-9 mb-4">
                <TabsTrigger value="servicios" className="text-xs gap-1">
                  <Activity className="h-3 w-3" />
                  Serv ({servicios.length})
                </TabsTrigger>
                <TabsTrigger value="nutricionales" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  Nutr ({productos.length})
                </TabsTrigger>
                <TabsTrigger value="medicamentos" className="text-xs gap-1">
                  <Pill className="h-3 w-3" />
                  Med ({medicamentos.length})
                </TabsTrigger>
                <TabsTrigger value="procedimientos" className="text-xs gap-1">
                  <Stethoscope className="h-3 w-3" />
                  Proc ({procedimientos.length})
                </TabsTrigger>
                <TabsTrigger value="dispositivos" className="text-xs gap-1">
                  <Package className="h-3 w-3" />
                  Disp ({dispositivos.length})
                </TabsTrigger>
                <TabsTrigger value="fallos" className="text-xs gap-1">
                  <FileText className="h-3 w-3" />
                  Fallos ({fallos.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="servicios" className="mt-0">
                <ServiciosComplementariosDetails servicios={servicios} />
              </TabsContent>
              <TabsContent value="nutricionales" className="mt-0">
                <ProductosNutricionalesDetails productos={productos} />
              </TabsContent>
              <TabsContent value="medicamentos" className="mt-0">
                <MedicamentosDetails medicamentos={medicamentos} />
              </TabsContent>
              <TabsContent value="procedimientos" className="mt-0">
                <ProcedimientosDetails procedimientos={procedimientos} />
              </TabsContent>
              <TabsContent value="dispositivos" className="mt-0">
                <DispositivosDetails dispositivos={dispositivos} />
              </TabsContent>
              <TabsContent value="fallos" className="mt-0">
                {fallos.length === 0 ? (
                  <EmptySection label="fallos adicionales" />
                ) : (
                  <div className="grid gap-3">
                    {fallos.map((item: any, idx: number) => (
                      <div key={`${item.NroFallAdic || idx}`} className="rounded-lg border p-3">
                        <div className="text-sm font-medium">{item.NroFallAdic || "Fallo"}</div>
                        <p className="text-xs text-muted-foreground mt-1">Fecha: {formatDate(item.FFalloAdic)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
