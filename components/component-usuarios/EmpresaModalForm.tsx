"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, FileText, Hash, Loader2, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { EmpresaApiItem, EmpresaPayload, MunicipioApiItem } from "@/requests/Backend/empresa.requests"

const TIPO_EMPRESA_OPTIONS = [
  { value: "1", label: "IPS" },
  { value: "2", label: "EPS" },
  { value: "3", label: "Ambas" },
]

interface EmpresaModalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresa: EmpresaApiItem | null
  municipios: MunicipioApiItem[]
  loadingMunicipios: boolean
  onSubmit: (payload: EmpresaPayload) => Promise<{ success: boolean; error?: string }>
}

export function EmpresaModalForm({
  open,
  onOpenChange,
  empresa,
  municipios,
  loadingMunicipios,
  onSubmit,
}: EmpresaModalFormProps) {
  const [nit, setNit] = useState("")
  const [nombre, setNombre] = useState("")
  const [direccion, setDireccion] = useState("")
  const [idMunicipio, setIdMunicipio] = useState("")
  const [idTipoEmpresa, setIdTipoEmpresa] = useState("")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const esEdicion = Boolean(empresa)

  useEffect(() => {
    if (!open) return
    setNit(empresa?.nit ?? "")
    setNombre(empresa?.nombre ?? "")
    setDireccion(empresa?.direccion ?? "")
    setIdMunicipio(empresa ? String(empresa.id_municipio) : "")
    setIdTipoEmpresa(empresa ? String(empresa.id_tipo_empresa) : "")
  }, [open, empresa])

  const municipiosPorDepartamento = useMemo(() => {
    const grupos = new Map<string, MunicipioApiItem[]>()
    for (const m of municipios) {
      const key = m.departamento_nombre
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(m)
    }
    return Array.from(grupos.entries())
  }, [municipios])

  async function handleSubmit() {
    if (!nit.trim() || !nombre.trim() || !idMunicipio || !idTipoEmpresa) {
      toast({ title: "Datos incompletos", description: "Complete todos los campos obligatorios", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const result = await onSubmit({
        nit: nit.trim(),
        nombre: nombre.trim(),
        direccion: direccion.trim() || null,
        id_municipio: Number(idMunicipio),
        id_tipo_empresa: Number(idTipoEmpresa),
      })

      if (!result.success) {
        toast({ title: "Error", description: result.error || "No se pudo guardar la empresa", variant: "destructive" })
        return
      }

      toast({ title: esEdicion ? "Empresa actualizada" : "Empresa creada" })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 bg-background text-foreground shadow-[0_18px_40px_rgba(15,118,110,0.12)] sm:max-w-[560px]">
        <DialogHeader className="items-start text-left">
          <DialogTitle className="flex items-center gap-2 text-left text-lg font-semibold text-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E6F7F5] text-[#0f766e] dark:bg-primary/20 dark:text-primary">
              <Building2 className="h-4 w-4" />
            </span>
            {esEdicion ? "Editar empresa" : "Agregar empresa"}
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground">
            Datos de la IPS/EPS que opera esta instancia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" />
              NIT
            </Label>
            <Input
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder="Ej: 824001398"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Nombre
            </Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Dusakawi EPSI"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dirección
            </Label>
            <Input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Calle 8 #17, Cra. 2a #17-60"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Municipio
            </Label>
            <Select value={idMunicipio} onValueChange={setIdMunicipio} disabled={saving || loadingMunicipios}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingMunicipios ? "Cargando municipios..." : "Seleccione un municipio"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {municipiosPorDepartamento.map(([departamento, items]) => (
                  <SelectGroup key={departamento}>
                    <SelectLabel>{departamento}</SelectLabel>
                    {items.map((m) => (
                      <SelectItem key={m.id_municipio} value={String(m.id_municipio)}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Tipo de empresa</Label>
            <Select value={idTipoEmpresa} onValueChange={setIdTipoEmpresa} disabled={saving}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione IPS, EPS o Ambas" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_EMPRESA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={saving}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving} className="bg-[#0f766e] text-white hover:bg-[#115e59]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {esEdicion ? "Guardar cambios" : "Crear empresa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
