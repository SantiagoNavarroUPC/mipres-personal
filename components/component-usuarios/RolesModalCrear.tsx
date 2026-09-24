"use client"

import React, { useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Loader2, ShieldCheck, ScrollText, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchWithAuth } from "@/lib/auth"

const TIPO_EMPRESA_OPTIONS = [
  { value: "1", label: "IPS" },
  { value: "2", label: "EPS" },
  { value: "3", label: "Ambas" },
]

export type RoleItem = {
  consecutivo_rol: number
  rol_nombre: string
  rol_descripcion?: string
  estado?: boolean
}

interface DialogoCrearRolProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => Promise<void> | void
}

export default function DialogoCrearRol({ open, onOpenChange, onCreated }: DialogoCrearRolProps) {
  const [newRole, setNewRole] = useState("")
  const [newRoleDescription, setNewRoleDescription] = useState("")
  const [newRoleTipoEmpresa, setNewRoleTipoEmpresa] = useState("")
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  function resetForm() {
    setNewRole("")
    setNewRoleDescription("")
    setNewRoleTipoEmpresa("")
  }

  async function createRole() {
    const roleName = newRole.trim()
    const roleDescription = newRoleDescription.trim()

    if (!roleName) {
      toast({
        title: "Nombre requerido",
        description: "Ingrese un nombre para el rol",
        variant: "destructive",
      })
      return
    }

    if (!newRoleTipoEmpresa) {
      toast({
        title: "Tipo de empresa requerido",
        description: "Seleccione a qué tipo de empresa aplica este rol",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetchWithAuth("/api/usuarios/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: roleName,
          descripcion: roleDescription || null,
          estado: true,
          id_tipo_empresa: Number(newRoleTipoEmpresa),
        }),
      })

      const body = await response.json()
      if (!response.ok || body?.success === false) {
        toast({
          title: "Error",
          description: body?.message || "No se pudo crear el rol",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Rol creado",
        description: body?.message || "El rol se creó correctamente",
      })
      resetForm()
      onOpenChange(false)
      if (onCreated) await onCreated()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error de conexión con el servidor",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetForm()
      }}
    >
      <DialogContent className="border-0 bg-background text-foreground shadow-[0_18px_40px_rgba(15,118,110,0.12)] sm:max-w-[560px]">
        <DialogHeader className="items-start text-left">
          <DialogTitle className="flex items-center gap-2 text-left text-lg font-semibold text-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E6F7F5] text-[#0f766e] dark:bg-primary/20 dark:text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Agregar rol
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground">
            Crea un rol con nombre y descripcion corta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-[#E6F7F5] dark:bg-primary/20">
              <ShieldCheck className="h-4 w-4 text-[#0f766e]" />
            </span>
            <Input
              value={newRole}
              onChange={(event) => setNewRole(event.target.value)}
              placeholder="Nombre del rol"
              disabled={creating}
              className="border-[#E6F7F5] bg-background pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-[#0f766e] dark:border-primary/35"
            />
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-[#E6F7F5] dark:bg-primary/20">
              <FileText className="h-4 w-4 text-[#0f766e]" />
            </span>
            <Input
              value={newRoleDescription}
              onChange={(event) => setNewRoleDescription(event.target.value)}
              placeholder="Descripcion del rol"
              disabled={creating}
              className="border-[#E6F7F5] bg-background pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-[#0f766e] dark:border-primary/35"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground">Tipo de empresa</Label>
            <Select value={newRoleTipoEmpresa} onValueChange={setNewRoleTipoEmpresa} disabled={creating}>
              <SelectTrigger className="border-[#E6F7F5] bg-background text-foreground focus:ring-[#0f766e] dark:border-primary/35">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#E6F7F5] dark:bg-primary/20">
                  <Building2 className="h-4 w-4 text-[#0f766e]" />
                </span>
                <SelectValue placeholder="Seleccione a qué empresa aplica" />
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
            <Button type="button" variant="outline" disabled={creating} className="border-[#E6F7F5] bg-background text-foreground hover:bg-[#E6F7F5] dark:border-primary/35 dark:hover:bg-primary/15">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void createRole()} disabled={creating || !newRole.trim() || !newRoleTipoEmpresa} className="bg-[#0f766e] text-white hover:bg-[#115e59]">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            <ScrollText className="mr-2 h-4 w-4" />
            Crear rol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
