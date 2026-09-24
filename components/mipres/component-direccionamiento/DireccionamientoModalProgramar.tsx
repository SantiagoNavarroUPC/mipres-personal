"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento/direccionamiento"
import type { MipresCredentials } from "@/models/credentials.model"

interface DireccionamientoModalProgramarProps {
  open: boolean
  onClose: () => void
  item: Direccionamiento | null
  credentials: MipresCredentials
  onSuccess?: () => void
}

interface ProgramacionForm {
  FecMaxEnt: string
  TipoIDSedeProv: string
  NoIDSedeProv: string
  CodSedeProv: string
  CodSerTecAEntregar: string
  CantTotAEntregar: string
}

function toDateInputValue(value?: string): string {
  if (!value) return ""
  const fechaParte = String(value).split("T")[0]
  return fechaParte || ""
}

function buildInitialForm(item: Direccionamiento | null): ProgramacionForm {
  return {
    FecMaxEnt: toDateInputValue(item?.FecMaxEnt),
    TipoIDSedeProv: item?.TipoIDProv || "",
    NoIDSedeProv: item?.NoIDProv || "",
    CodSedeProv: "",
    CodSerTecAEntregar: item?.CodSerTecAEntregar || "",
    CantTotAEntregar: item?.CantTotAEntregar || "",
  }
}

export function DireccionamientoModalProgramar({ open, onClose, item, credentials, onSuccess }: DireccionamientoModalProgramarProps) {
  const [form, setForm] = useState<ProgramacionForm>(() => buildInitialForm(item))
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(item))
    }
  }, [open, item])

  function setField<K extends keyof ProgramacionForm>(key: K, value: ProgramacionForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!item) return

    if (!credentials.nit) {
      toast.error("NIT no configurado")
      return
    }

    const token = item.tipoRegimen === "Subsidiado"
      ? credentials.tokenAccesoSubsidiado
      : item.tipoRegimen === "Contributivo"
      ? credentials.tokenAccesoContributivo
      : credentials.tokenAcceso

    if (!token) {
      toast.error(`Token ${item.tipoRegimen || "Principal"} no configurado`)
      return
    }

    if (!form.FecMaxEnt || !form.TipoIDSedeProv || !form.NoIDSedeProv || !form.CodSedeProv || !form.CodSerTecAEntregar || !form.CantTotAEntregar) {
      toast.error("Complete todos los campos")
      return
    }

    setEnviando(true)
    try {
      const response = await fetch("/api/mipres/programacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit: credentials.nit,
          tokenAcceso: token,
          payload: {
            ID: 0,
            FecMaxEnt: form.FecMaxEnt,
            TipoIDSedeProv: form.TipoIDSedeProv,
            NoIDSedeProv: form.NoIDSedeProv,
            CodSedeProv: form.CodSedeProv,
            CodSerTecAEntregar: form.CodSerTecAEntregar,
            CantTotAEntregar: form.CantTotAEntregar,
          },
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Programación registrada exitosamente")
        onSuccess?.()
        onClose()
      } else {
        let errorMsg = result.error || "Error al registrar programación"
        if (result.details?.Errors && Array.isArray(result.details.Errors)) {
          errorMsg = result.details.Errors[0]
        } else if (result.Errors && Array.isArray(result.Errors)) {
          errorMsg = result.Errors[0]
        }
        toast.error(errorMsg)
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Programar entrega
          </DialogTitle>
          <DialogDescription>
            Prescripción: <span className="font-mono font-medium">{item?.NoPrescripcion || ""}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="prog-fecmaxent">Fecha máxima de entrega</Label>
            <Input
              id="prog-fecmaxent"
              type="date"
              value={form.FecMaxEnt}
              onChange={(e) => setField("FecMaxEnt", e.target.value)}
              disabled={enviando}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prog-tipoid">Tipo ID sede proveedora</Label>
            <Input
              id="prog-tipoid"
              value={form.TipoIDSedeProv}
              onChange={(e) => setField("TipoIDSedeProv", e.target.value)}
              disabled={enviando}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prog-noid">No. ID sede proveedora</Label>
            <Input
              id="prog-noid"
              value={form.NoIDSedeProv}
              onChange={(e) => setField("NoIDSedeProv", e.target.value)}
              disabled={enviando}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="prog-codsede">Código sede proveedora</Label>
            <Input
              id="prog-codsede"
              value={form.CodSedeProv}
              onChange={(e) => setField("CodSedeProv", e.target.value)}
              disabled={enviando}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prog-codserv">Código servicio/tecnología</Label>
            <Input
              id="prog-codserv"
              value={form.CodSerTecAEntregar}
              onChange={(e) => setField("CodSerTecAEntregar", e.target.value)}
              disabled={enviando}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prog-cant">Cantidad total a entregar</Label>
            <Input
              id="prog-cant"
              value={form.CantTotAEntregar}
              onChange={(e) => setField("CantTotAEntregar", e.target.value)}
              disabled={enviando}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={enviando}>
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Programar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
