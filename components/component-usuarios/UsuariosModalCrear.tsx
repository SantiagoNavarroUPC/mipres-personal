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
import { Loader2, Lock, ShieldCheck, User, UserPlus, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// id_tipo_empresa: 1=IPS, 2=EPS, 3=AMBAS. Un rol/empresa en AMBAS es
// compatible con cualquier contraparte; si no, deben coincidir exactamente.
const ID_TIPO_EMPRESA_AMBAS = 3

export type RoleOption = {
  consecutivo_rol: number
  rol_nombre: string
  id_tipo_empresa: number
}

export type EmpresaOption = {
  id_empresa: number
  nombre: string
  nit: string
  id_tipo_empresa: number
}

interface DialogoCrearUsuarioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: RoleOption[]
  loadingRoles: boolean
  empresas: EmpresaOption[]
  loadingEmpresas: boolean
  onCreated?: () => Promise<void> | void
}

export default function DialogoCrearUsuario({
  open,
  onOpenChange,
  roles,
  loadingRoles,
  empresas,
  loadingEmpresas,
  onCreated,
}: DialogoCrearUsuarioProps) {
  const [newUsuario, setNewUsuario] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRoleId, setNewRoleId] = useState("")
  const [newEmpresaId, setNewEmpresaId] = useState("")
  const [creatingUser, setCreatingUser] = useState(false)
  const { toast } = useToast()

  const selectedRole = roles.find((r) => String(r.consecutivo_rol) === newRoleId)

  const empresasCompatibles = selectedRole
    ? empresas.filter(
        (empresa) =>
          selectedRole.id_tipo_empresa === ID_TIPO_EMPRESA_AMBAS ||
          empresa.id_tipo_empresa === ID_TIPO_EMPRESA_AMBAS ||
          empresa.id_tipo_empresa === selectedRole.id_tipo_empresa
      )
    : empresas

  function handleRoleChange(value: string) {
    setNewRoleId(value)
    const rol = roles.find((r) => String(r.consecutivo_rol) === value)
    if (!rol) return
    const empresaActual = empresas.find((e) => String(e.id_empresa) === newEmpresaId)
    const siguenCompatibles =
      empresaActual &&
      (rol.id_tipo_empresa === ID_TIPO_EMPRESA_AMBAS ||
        empresaActual.id_tipo_empresa === ID_TIPO_EMPRESA_AMBAS ||
        empresaActual.id_tipo_empresa === rol.id_tipo_empresa)
    if (!siguenCompatibles) setNewEmpresaId("")
  }

  function resetCreateUserForm() {
    setNewUsuario("")
    setNewPassword("")
    setNewRoleId("")
    setNewEmpresaId("")
  }

  async function createUserByAdmin() {
    const usuario = newUsuario.trim()
    const password = newPassword
    const rolId = Number(newRoleId)
    const empresaId = Number(newEmpresaId)

    if (!usuario) {
      toast({ title: "Número de identificación requerido", description: "Ingrese el número de identificación", variant: "destructive" })
      return
    }

    if (!/^\d+$/.test(usuario)) {
      toast({ title: "Número de identificación inválido", description: "Debe contener solo dígitos", variant: "destructive" })
      return
    }

    if (!password || password.length < 6) {
      toast({ title: "Contrasena invalida", description: "La contrasena debe tener al menos 6 caracteres", variant: "destructive" })
      return
    }

    if (!Number.isFinite(rolId) || rolId <= 0) {
      toast({ title: "Rol requerido", description: "Seleccione un rol valido", variant: "destructive" })
      return
    }

    if (!Number.isFinite(empresaId) || empresaId <= 0) {
      toast({ title: "Empresa requerida", description: "Seleccione la empresa a la que pertenece el usuario", variant: "destructive" })
      return
    }

    const rol = roles.find((r) => r.consecutivo_rol === rolId)
    const empresa = empresas.find((e) => e.id_empresa === empresaId)
    const compatible =
      !rol ||
      !empresa ||
      rol.id_tipo_empresa === ID_TIPO_EMPRESA_AMBAS ||
      empresa.id_tipo_empresa === ID_TIPO_EMPRESA_AMBAS ||
      rol.id_tipo_empresa === empresa.id_tipo_empresa
    if (!compatible) {
      toast({ title: "Rol y empresa incompatibles", description: "Ese rol no puede asignarse a una empresa de ese tipo (IPS/EPS)", variant: "destructive" })
      return
    }

    setCreatingUser(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario,
          password,
          rol_mipres: rolId,
          id_empresa: empresaId,
        }),
      })

      const body = await res.json()
      if (!res.ok) {
        toast({
          title: "No se pudo crear el usuario",
          description: body?.message || "Error al crear la cuenta",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Usuario creado",
        description: body?.message || "Cuenta creada exitosamente",
      })
      resetCreateUserForm()
      onOpenChange(false)
      if (onCreated) await onCreated()
    } catch (error) {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setCreatingUser(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetCreateUserForm()
      }}
    >
      <DialogContent className="border-0 bg-background text-foreground shadow-[0_18px_40px_rgba(15,118,110,0.12)] sm:max-w-[560px]">
        <DialogHeader className="items-start text-left">
          <DialogTitle className="flex items-center gap-2 text-left text-lg font-semibold text-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E6F7F5] text-[#0f766e] dark:bg-primary/20 dark:text-primary">
              <UserPlus className="h-4 w-4" />
            </span>
            Agregar usuario
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground">
            Crea una cuenta y asigna el rol correspondiente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="admin-usuario" className="text-foreground">Número de identificación</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-[#E6F7F5] dark:bg-primary/20">
                <User className="h-4 w-4 text-[#0f766e]" />
              </span>
              <Input
                id="admin-usuario"
                inputMode="numeric"
                value={newUsuario}
                onChange={(event) => setNewUsuario(event.target.value.replace(/\D/g, ""))}
                placeholder="Número de identificación"
                disabled={creatingUser}
                className="border-[#E6F7F5] bg-background pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-[#0f766e] dark:border-primary/35"
              />
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            <Label htmlFor="admin-password" className="text-foreground">Contrasena</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-[#E6F7F5] dark:bg-primary/20">
                <Lock className="h-4 w-4 text-[#0f766e]" />
              </span>
              <Input
                id="admin-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Contrasena"
                disabled={creatingUser}
                className="border-[#E6F7F5] bg-background pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-[#0f766e] dark:border-primary/35"
              />
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            <Label className="text-foreground">Rol</Label>
            <Select
              value={newRoleId}
              onValueChange={handleRoleChange}
              disabled={creatingUser || loadingRoles}
            >
              <SelectTrigger className="border-[#E6F7F5] bg-background text-foreground focus:ring-[#0f766e] dark:border-primary/35">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#E6F7F5] dark:bg-primary/20">
                  <ShieldCheck className="h-4 w-4 text-[#0f766e]" />
                </span>
                <SelectValue placeholder={loadingRoles ? "Cargando roles..." : "Seleccione un rol"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.consecutivo_rol} value={String(role.consecutivo_rol)}>
                    {role.rol_nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 text-left">
            <Label className="text-foreground">Empresa</Label>
            <Select
              value={newEmpresaId}
              onValueChange={setNewEmpresaId}
              disabled={creatingUser || loadingEmpresas}
            >
              <SelectTrigger className="border-[#E6F7F5] bg-background text-foreground focus:ring-[#0f766e] dark:border-primary/35">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#E6F7F5] dark:bg-primary/20">
                  <Building2 className="h-4 w-4 text-[#0f766e]" />
                </span>
                <SelectValue
                  placeholder={
                    loadingEmpresas
                      ? "Cargando empresas..."
                      : empresasCompatibles.length === 0
                        ? "Seleccione primero un rol"
                        : "Seleccione una empresa"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {empresasCompatibles.map((empresa) => (
                  <SelectItem key={empresa.id_empresa} value={String(empresa.id_empresa)}>
                    {empresa.nombre} — NIT {empresa.nit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={creatingUser} className="border-[#E6F7F5] bg-background text-foreground hover:bg-[#E6F7F5] dark:border-primary/35 dark:hover:bg-primary/15">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void createUserByAdmin()} disabled={creatingUser} className="bg-[#0f766e] text-white hover:bg-[#115e59]">
            {creatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Crear usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
