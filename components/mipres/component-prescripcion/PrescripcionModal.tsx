"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Pill,
  Stethoscope,
  Package,
  Activity,
  Sparkles,
} from "lucide-react"
import { MedicamentosDetails } from "./MedicamentosDetails"
import { ProcedimientosDetails } from "./ProcedimientosDetails"
import { DispositivosDetails } from "./DispositivosDetails"
import { ProductosNutricionalesDetails } from "./ProductosNutricionalesDetails"
import { ServiciosComplementariosDetails } from "./ServiciosComplementariosDetails"
import { getArray } from "./utils"
import { useEffect, useState } from "react"

interface DatosAfiliado {
  ips_primaria?: string
  grupo_poblacional?: string
  etnia_comunidad?: string
  discapacidad?: string
  indigena_asentamiento?: string
}

interface ModalProps {
  prescripcion: any
  open: boolean
  onClose: () => void
}

// Modal de detalle de prescripción
export function PrescripcionModal({ prescripcion, open, onClose }: ModalProps) {
  const [datosAfiliado, setDatosAfiliado] = useState<DatosAfiliado | null>(null)

  useEffect(() => {
    if (!open || !prescripcion) return
    const numeroId = prescripcion.NroIDPaciente || prescripcion.NoIDPaciente
    if (!numeroId) return

    setDatosAfiliado(null)
    fetch("/api/afiliado/datos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero_identificacion: numeroId }),
    })
      .then((r) => r.json())
      .then((data) => setDatosAfiliado(data))
      .catch(() => {})
  }, [open, prescripcion])

  if (!prescripcion) return null

  const medCount = getArray(prescripcion, "medicamentos").length
  const procCount = getArray(prescripcion, "procedimientos").length
  const dispCount = getArray(prescripcion, "dispositivos").length
  const nutrCount = getArray(prescripcion, "productosNutricionales").length
  const servCount = getArray(prescripcion, "serviciosComplementarios").length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Prescripción {prescripcion.NoPrescripcion}
          </DialogTitle>
          <DialogDescription>Detalle completo de la prescripción</DialogDescription>
        </DialogHeader>

        {/* Info del paciente */}
        <div className="px-6 py-4 border-b bg-background">
          <div className="grid grid-cols-2 sm:grid-cols-[1.5fr_1.2fr_0.8fr_0.8fr] gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Paciente</p>
              <p className="font-medium">
                {prescripcion.PNPaciente} {prescripcion.PAPaciente}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Documento</p>
              <p className="font-medium whitespace-nowrap">
                {prescripcion.TipoIDPaciente || prescripcion.TipoIDPac} - {prescripcion.NroIDPaciente || prescripcion.NoIDPaciente}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fecha</p>
              <p className="font-medium">{prescripcion.FPrescripcion?.split("T")[0]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Estado</p>
              <Badge
                variant={prescripcion.EstPres === 4 ? "default" : "destructive"}
                className={prescripcion.EstPres === 4 ? "bg-emerald-500" : ""}
              >
                {prescripcion.EstPres === 4 ? "Activo" : "Anulado"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Datos del afiliado */}
        {datosAfiliado && (
          <div className="px-6 py-4 border-b bg-background">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {datosAfiliado.ips_primaria && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">IPS Primaria</p>
                  <p className="font-medium">{datosAfiliado.ips_primaria}</p>
                </div>
              )}
              {datosAfiliado.grupo_poblacional && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Grupo Poblacional</p>
                  <p className="font-medium">{datosAfiliado.grupo_poblacional}</p>
                </div>
              )}
              {datosAfiliado.etnia_comunidad && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Etnia / Comunidad</p>
                  <p className="font-medium">{datosAfiliado.etnia_comunidad}</p>
                </div>
              )}
              {datosAfiliado.discapacidad && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Discapacidad</p>
                  <p className="font-medium">{datosAfiliado.discapacidad}</p>
                </div>
              )}
              {datosAfiliado.indigena_asentamiento && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Asentamiento</p>
                  <p className="font-medium">{datosAfiliado.indigena_asentamiento}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs con contenido */}
        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6">
            <Tabs defaultValue="medicamentos" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-9 mb-4">
                <TabsTrigger value="medicamentos" className="text-xs gap-1">
                  <Pill className="h-3 w-3" />
                  M ({medCount})
                </TabsTrigger>
                <TabsTrigger value="procedimientos" className="text-xs gap-1">
                  <Stethoscope className="h-3 w-3" />
                  P ({procCount})
                </TabsTrigger>
                <TabsTrigger value="dispositivos" className="text-xs gap-1">
                  <Package className="h-3 w-3" />
                  D ({dispCount})
                </TabsTrigger>
                <TabsTrigger value="nutricionales" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  PN ({nutrCount})
                </TabsTrigger>
                <TabsTrigger value="servicios" className="text-xs gap-1">
                  <Activity className="h-3 w-3" />
                  S ({servCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="medicamentos" className="mt-0">
                <MedicamentosDetails medicamentos={getArray(prescripcion, "medicamentos")} />
              </TabsContent>
              <TabsContent value="procedimientos" className="mt-0">
                <ProcedimientosDetails procedimientos={getArray(prescripcion, "procedimientos")} />
              </TabsContent>
              <TabsContent value="dispositivos" className="mt-0">
                <DispositivosDetails dispositivos={getArray(prescripcion, "dispositivos")} />
              </TabsContent>
              <TabsContent value="nutricionales" className="mt-0">
                <ProductosNutricionalesDetails
                  productos={getArray(prescripcion, "productosNutricionales")}
                />
              </TabsContent>
              <TabsContent value="servicios" className="mt-0">
                <ServiciosComplementariosDetails
                  servicios={getArray(prescripcion, "serviciosComplementarios")}
                />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
