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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Pill,
  Stethoscope,
  Package,
  Sparkles,
  Activity,
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
          <div className="grid grid-cols-2 sm:grid-cols-[1.5fr_1.3fr_0.8fr_0.7fr] gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Paciente</p>
              <p className="font-medium">{getNombrePaciente(tutela)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Documento</p>
              <p className="font-medium whitespace-nowrap">
                {tutela.TipoIDPaciente || ""} - {tutela.NroIDPaciente || ""}
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
