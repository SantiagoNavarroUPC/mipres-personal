"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { fetchWithAuth } from "@/lib/auth"
import {
  IdCard,
  Shield,
  RefreshCw,
  UserCog,
  Plus,
  Eye,
  EyeOff,
  KeyRound,
  Search,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import DialogoCrearUsuario from "@/components/component-usuarios/UsuariosModalCrear"

type Role = {
  consecutivo_rol: number
  rol_nombre: string
  id_tipo_empresa: number
}

type Empresa = {
  id_empresa: number
  nombre: string
  nit: string
  id_tipo_empresa: number
}

type User = {
  id_usuario_mipres: string
  numero_identificacion: string
  rol: Role
  usuario_activo: boolean
}

function sortUsersByRol(data: User[]): User[] {
  return [...data].sort((a, b) => {
    const ra = Number(a?.rol?.consecutivo_rol ?? Number.MAX_SAFE_INTEGER)
    const rb = Number(b?.rol?.consecutivo_rol ?? Number.MAX_SAFE_INTEGER)
    return ra - rb
  })
}

interface UsuariosTableProps {
  authToken?: string
}

export default function UsuariosTable({ authToken }: UsuariosTableProps) {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [updatingRole, setUpdatingRole] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [openCreateUser, setOpenCreateUser] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState("")
  const { toast } = useToast()
  const usersPerPage = 10

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetchWithAuth("/api/usuarios")
      const body = await res.json()
      if (body && Array.isArray(body.data)) {
        setUsers(sortUsersByRol(body.data as User[]))
      } else {
        setUsers([])
        toast({
          title: "No se pudieron cargar usuarios",
          description: "Respuesta inesperada del servidor",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [authToken])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.numero_identificacion?.toLowerCase().includes(q) ||
        u.rol?.rol_nombre?.toLowerCase().includes(q) ||
        String(u.id_usuario_mipres).includes(q)
    )
  }, [users, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage))
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  )

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  async function loadRoles() {
    if (roles.length > 0) return
    setLoadingRoles(true)
    try {
      const res = await fetchWithAuth("/api/usuarios/roles")
      const body = await res.json()
      if (res.ok && body && Array.isArray(body.data)) {
        const nextRoles = [...(body.data as Role[])].sort(
          (a, b) => Number(a.consecutivo_rol || 0) - Number(b.consecutivo_rol || 0)
        )
        setRoles(nextRoles)
      } else {
        setRoles([])
        toast({
          title: "No se pudieron cargar roles",
          description: body?.message || "Respuesta inesperada",
          variant: "destructive",
        })
      }
    } catch (error) {
      setRoles([])
      toast({ title: "Error", description: String(error), variant: "destructive" })
    } finally {
      setLoadingRoles(false)
    }
  }

  async function loadEmpresas() {
    if (empresas.length > 0) return
    setLoadingEmpresas(true)
    try {
      const res = await fetchWithAuth("/api/empresa/asignables")
      const body = await res.json()
      if (res.ok && body && Array.isArray(body.data)) {
        setEmpresas(body.data as Empresa[])
      } else {
        setEmpresas([])
        toast({
          title: "No se pudieron cargar empresas",
          description: body?.message || "Respuesta inesperada",
          variant: "destructive",
        })
      }
    } catch (error) {
      setEmpresas([])
      toast({ title: "Error", description: String(error), variant: "destructive" })
    } finally {
      setLoadingEmpresas(false)
    }
  }

  async function updateUserRole(user: User, nextRoleId: number) {
    if (!Number.isFinite(nextRoleId) || nextRoleId <= 0) {
      toast({
        title: "Rol inválido",
        description: "Seleccione un rol válido",
        variant: "destructive",
      })
      return
    }
    if (Number(user.rol?.consecutivo_rol) === nextRoleId) return

    setUpdatingRole(true)
    try {
      const res = await fetchWithAuth(
        `/api/usuarios/${encodeURIComponent(user.id_usuario_mipres)}/rol`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            consecutivo_rol: nextRoleId,
          }),
        }
      )

      const body = await res.json()
      if (!res.ok || (body && body.success === false)) {
        toast({
          title: "Error",
          description: body?.message || "No se pudo cambiar el rol",
          variant: "destructive",
        })
        return
      }

      const nextRole = roles.find((r) => Number(r.consecutivo_rol) === nextRoleId)
      setUsers((prev) =>
        sortUsersByRol(
          prev.map((u) =>
            u.id_usuario_mipres === user.id_usuario_mipres
              ? {
                  ...u,
                  rol: nextRole || u.rol,
                }
              : u
          )
        )
      )

      await fetchUsers()
      toast({
        title: "Rol actualizado",
        description: body?.message || "El rol del usuario fue actualizado",
      })
    } catch (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" })
    } finally {
      setUpdatingRole(false)
    }
  }

  async function handleResetPassword() {
    if (!resetUser) return
    if (newPassword.length < 6) {
      setResetError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    setResetting(true)
    setResetError("")
    try {
      const res = await fetchWithAuth("/api/auth/restablecer-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario_mipres: Number(resetUser.id_usuario_mipres),
          nueva_password: newPassword,
        }),
      })
      const body = await res.json()
      if (!res.ok || body?.success === false) {
        setResetError(body?.message || "No se pudo restablecer la contraseña")
        return
      }
      toast({
        title: "Contraseña restablecida",
        description: body?.message || "La contraseña fue actualizada exitosamente",
      })
      setResetUser(null)
      setNewPassword("")
    } catch {
      setResetError("Error de conexión. Intente nuevamente.")
    } finally {
      setResetting(false)
    }
  }

  async function toggleUser(id: string, value: boolean) {
    const prev = users
    setUsers((s) =>
      s.map((u) => (u.id_usuario_mipres === id ? { ...u, usuario_activo: value } : u))
    )
    setUpdatingId(id)
    try {
      const res = await fetchWithAuth(`/api/usuarios/${encodeURIComponent(id)}/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usuario_activo: value }),
      })
      const body = await res.json()
      if (!res.ok || (body && body.success === false)) {
        setUsers(prev)
        toast({
          title: "Error",
          description: body?.message || "No se pudo actualizar usuario",
          variant: "destructive",
        })
      } else {
        await fetchUsers()
        toast({
          title: "Usuario actualizado",
          description: `Usuario ${value ? "activado" : "desactivado"}`,
        })
      }
    } catch (error) {
      setUsers(prev)
      toast({ title: "Error", description: String(error), variant: "destructive" })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por usuario o rol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-8 text-xs md:text-xs placeholder:text-xs bg-background border-border/80 rounded-lg focus-visible:ring-1 focus-visible:ring-primary w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 cursor-pointer border-border hover:bg-muted"
            onClick={() => void fetchUsers()}
            disabled={loading}
            title="Sincronizar usuarios"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            className="h-9 gap-1.5 font-medium text-xs bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer rounded-lg px-3.5"
            onClick={async () => {
              setOpenCreateUser(true)
              await Promise.all([loadRoles(), loadEmpresas()])
            }}
          >
            <Plus className="size-3.5" />
            <span>Nuevo Usuario</span>
          </Button>
        </div>
      </div>

      <DialogoCrearUsuario
        open={openCreateUser}
        onOpenChange={setOpenCreateUser}
        roles={roles}
        loadingRoles={loadingRoles}
        empresas={empresas}
        loadingEmpresas={loadingEmpresas}
        onCreated={async () => {
          setCurrentPage(1)
          await fetchUsers()
        }}
      />

      {/* Modal Restablecer Contraseña */}
      <Dialog
        open={!!resetUser}
        onOpenChange={(open) => {
          if (!open) {
            setResetUser(null)
            setNewPassword("")
            setResetError("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              Restablecer Contraseña
            </DialogTitle>
            <DialogDescription>
              {resetUser ? `Usuario: ${resetUser.numero_identificacion}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {resetError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {resetError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="nueva-password" className="text-xs font-semibold">
                Nueva Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="nueva-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={resetting}
                  className="pr-10 text-xs h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNewPassword ? "Ocultar" : "Mostrar"}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setResetUser(null)
                setNewPassword("")
                setResetError("")
              }}
              disabled={resetting}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleResetPassword()}
              disabled={resetting || newPassword.length < 6}
              className="text-xs h-9 bg-primary text-primary-foreground"
            >
              {resetting ? "Restableciendo..." : "Restablecer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Table Area */}
      <div className="w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-2.5 animate-pulse">
              <div className="size-8 rounded-lg bg-muted shrink-0" />
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/5" />
              <div className="h-4 bg-muted rounded w-1/6" />
              <div className="h-4 bg-muted rounded w-1/6 ml-auto" />
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <Users className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-sm text-foreground">
            {searchQuery ? "No se encontraron usuarios" : "No hay usuarios registrados"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery
              ? "Prueba buscando por número de documento o nombre de rol."
              : "Agrega usuarios al sistema para asignarles roles y acceso a MIPRES."}
          </p>
          {searchQuery ? (
            <Button
              variant="link"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs"
            >
              Limpiar filtro
            </Button>
          ) : (
            <Button
              size="sm"
              className="mt-3 text-xs bg-primary text-primary-foreground gap-1.5"
              onClick={async () => {
                setOpenCreateUser(true)
                await Promise.all([loadRoles(), loadEmpresas()])
              }}
            >
              <Plus className="size-3.5" />
              Crear Usuario
            </Button>
          )}
        </div>
      ) : (
        <div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider border-b border-border">
                  Usuario / Documento
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider border-b border-border">
                  Rol Asignado
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider border-b border-border">
                  Estado
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider text-right pr-4 border-b border-border">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedUsers.map((u) => (
                <tr key={u.id_usuario_mipres} className="hover:bg-muted/30 transition-colors">
                  {/* Usuario */}
                  <td className="px-4 py-3.5 border-b border-border/80">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold text-xs shadow-2xs">
                        <Shield className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <IdCard className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                            {u.numero_identificacion}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          ID: {u.id_usuario_mipres}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Rol Asignado */}
                  <td className="px-4 py-3.5 border-b border-border/80">
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-primary/5 text-primary border-primary/25"
                    >
                      {u.rol?.rol_nombre ?? "Sin rol"}
                    </Badge>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3.5 border-b border-border/80">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={Boolean(u.usuario_activo)}
                        onCheckedChange={(val) =>
                          toggleUser(u.id_usuario_mipres, Boolean(val))
                        }
                        disabled={updatingId === u.id_usuario_mipres}
                        aria-label={`Cambiar estado de ${u.numero_identificacion}`}
                      />
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          u.usuario_activo
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                            : "bg-muted text-muted-foreground border-border/80"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            u.usuario_activo ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        {u.usuario_activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3.5 border-b border-border/80 text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                        {/* Cambiar rol dropdown */}
                        <DropdownMenu onOpenChange={(open) => open && void loadRoles()}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                              aria-label="Cambiar rol"
                              title="Cambiar rol"
                              disabled={updatingRole}
                            >
                              <UserCog className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border">
                            <DropdownMenuLabel className="text-xs font-semibold">
                              Cambiar Rol
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {loadingRoles ? (
                              <DropdownMenuItem disabled className="text-xs">
                                Cargando roles...
                              </DropdownMenuItem>
                            ) : roles.length === 0 ? (
                              <DropdownMenuItem disabled className="text-xs">
                                Sin roles disponibles
                              </DropdownMenuItem>
                            ) : (
                              roles.map((r) => {
                                const isCurrent =
                                  Number(u.rol?.consecutivo_rol) === Number(r.consecutivo_rol)
                                return (
                                  <DropdownMenuItem
                                    key={r.consecutivo_rol}
                                    disabled={updatingRole || isCurrent}
                                    onClick={() =>
                                      void updateUserRole(u, Number(r.consecutivo_rol))
                                    }
                                    className="text-xs cursor-pointer flex items-center justify-between"
                                  >
                                    <span>{r.rol_nombre}</span>
                                    {isCurrent && (
                                      <span className="text-primary font-bold">✓</span>
                                    )}
                                  </DropdownMenuItem>
                                )
                              })
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Restablecer Contraseña */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          aria-label="Restablecer contraseña"
                          title="Restablecer contraseña"
                          onClick={() => {
                            setResetUser(u)
                            setNewPassword("")
                            setResetError("")
                            setShowNewPassword(false)
                          }}
                        >
                          <KeyRound className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <p>
              Mostrando{" "}
              <span className="font-semibold text-foreground">
                {filteredUsers.length === 0
                  ? 0
                  : (currentPage - 1) * usersPerPage + 1}
                -
                {Math.min(currentPage * usersPerPage, filteredUsers.length)}
              </span>{" "}
              de <span className="font-semibold text-foreground">{filteredUsers.length}</span> usuarios
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer border-border"
              >
                <ChevronLeft className="size-3.5" />
                <span>Anterior</span>
              </Button>

              <span className="px-2 text-xs font-medium">
                {currentPage} / {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer border-border"
              >
                <span>Siguiente</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
