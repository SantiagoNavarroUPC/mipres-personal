
"use client"

import React, { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { IdCard, Shield, RefreshCw, AlertCircle, UserCog, Plus, Settings, Eye, EyeOff, KeyRound } from "lucide-react"
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
				toast({ title: "No se pudieron cargar usuarios", description: "Respuesta inesperada del servidor", variant: "destructive" })
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

	const totalPages = Math.max(1, Math.ceil(users.length / usersPerPage))
	const paginatedUsers = users.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)

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
				toast({ title: "No se pudieron cargar roles", description: body?.message || "Respuesta inesperada", variant: "destructive" })
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
				toast({ title: "No se pudieron cargar empresas", description: body?.message || "Respuesta inesperada", variant: "destructive" })
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
			toast({ title: "Rol inválido", description: "Seleccione un rol válido", variant: "destructive" })
			return
		}
		if (Number(user.rol?.consecutivo_rol) === nextRoleId) return

		setUpdatingRole(true)
		try {
			const res = await fetchWithAuth(`/api/usuarios/${encodeURIComponent(user.id_usuario_mipres)}/rol`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					consecutivo_rol: nextRoleId,
				}),
			})

			const body = await res.json()
			if (!res.ok || (body && body.success === false)) {
				toast({ title: "Error", description: body?.message || "No se pudo cambiar el rol", variant: "destructive" })
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
			toast({ title: "Rol actualizado", description: body?.message || "El rol del usuario fue actualizado" })
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
				body: JSON.stringify({ id_usuario_mipres: Number(resetUser.id_usuario_mipres), nueva_password: newPassword }),
			})
			const body = await res.json()
			if (!res.ok || body?.success === false) {
				setResetError(body?.message || "No se pudo restablecer la contraseña")
				return
			}
			toast({ title: "Contraseña restablecida", description: body?.message || "La contraseña fue actualizada exitosamente" })
			setResetUser(null)
			setNewPassword("")
		} catch {
			setResetError("Error de conexión. Intente nuevamente.")
		} finally {
			setResetting(false)
		}
	}

	async function toggleUser(id: string, value: boolean) {
		// Optimistic update
		const prev = users
		setUsers((s) => s.map((u) => (u.id_usuario_mipres === id ? { ...u, usuario_activo: value } : u)))
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
				toast({ title: "Error", description: body?.message || "No se pudo actualizar usuario", variant: "destructive" })
			} else {
				await fetchUsers()
				toast({ title: "Usuario actualizado", description: `Usuario ${value ? "activado" : "desactivado"}` })
			}
		} catch (error) {
			setUsers(prev)
			toast({ title: "Error", description: String(error), variant: "destructive" })
		} finally {
			setUpdatingId(null)
		}
	}

	return (
		<Card className="relative pt-4">
			<div className="absolute right-1 top-1 z-10 flex items-center gap-1">
				<Button
					onClick={() => fetchUsers()}
					disabled={loading}
					size="icon"
					variant="ghost"
					className="h-5 w-5 rounded-sm p-0 opacity-40 hover:opacity-100"
					aria-label="Sincronizar usuarios"
					title="Sincronizar"
				>
					<RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
					<span className="sr-only">{loading ? "Cargando" : "Sincronizar"}</span>
				</Button>
				<Button
					onClick={async () => {
						setOpenCreateUser(true)
						await Promise.all([loadRoles(), loadEmpresas()])
					}}
					size="icon"
					variant="ghost"
					className="h-5 w-5 rounded-sm p-0 opacity-40 hover:opacity-100"
					aria-label="Agregar usuario"
					title="Agregar usuario"
				>
					<Plus className="h-3 w-3" />
					<span className="sr-only">Agregar usuario</span>
				</Button>
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

			<Dialog open={!!resetUser} onOpenChange={(open) => { if (!open) { setResetUser(null); setNewPassword(""); setResetError("") } }}>
				<DialogContent className="sm:max-w-[420px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<KeyRound className="h-4 w-4 text-primary" />
							Restablecer contraseña
						</DialogTitle>
						<DialogDescription>
							{resetUser ? `Usuario: ${resetUser.numero_identificacion}` : ""}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 py-2">
						{resetError && (
							<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
								{resetError}
							</div>
						)}
						<div className="space-y-1.5">
							<Label htmlFor="nueva-password">Nueva contraseña</Label>
							<div className="relative">
								<Input
									id="nueva-password"
									type={showNewPassword ? "text" : "password"}
									placeholder="Mínimo 6 caracteres"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									disabled={resetting}
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowNewPassword((v) => !v)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									aria-label={showNewPassword ? "Ocultar" : "Mostrar"}
								>
									{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</button>
							</div>
						</div>
					</div>

					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => { setResetUser(null); setNewPassword(""); setResetError("") }} disabled={resetting}>
							Cancelar
						</Button>
						<Button onClick={() => void handleResetPassword()} disabled={resetting || newPassword.length < 6}>
							{resetting ? "Restableciendo..." : "Restablecer"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<CardContent className="px-4 pt-3 pb-2">
				{users.length === 0 ? (
					<Alert className="border-blue-200 bg-blue-50">
						<AlertCircle className="h-4 w-4 text-blue-600" />
						<AlertDescription className="text-blue-800">
							{loading ? "Cargando usuarios..." : "No se encontraron usuarios registrados"}
						</AlertDescription>
					</Alert>
				) : (
					<div className="space-y-3">
						{paginatedUsers.map((u) => (
							<div 
								key={u.id_usuario_mipres}
								className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
							>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-3 mb-2">
										<div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
											<Shield className="h-5 w-5 text-primary" />
										</div>
										<div className="flex-1">
											<div className="flex items-center gap-1">
												<IdCard className="h-3.5 w-3.5 text-muted-foreground" />
												<p className="text-sm font-semibold text-foreground truncate">
													{u.numero_identificacion}
												</p>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="outline" className="text-xs">
											{u.rol?.rol_nombre ?? "Sin rol"}
										</Badge>
										<Badge 
											className={`text-xs ${u.usuario_activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
										>
											{u.usuario_activo ? "✓ Activo" : "✗ Inactivo"}
										</Badge>
									</div>
								</div>

								<div className="flex items-center gap-3 ml-4 flex-shrink-0">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										aria-label="Restablecer contraseña"
										title="Restablecer contraseña"
										onClick={() => { setResetUser(u); setNewPassword(""); setResetError(""); setShowNewPassword(false) }}
									>
										<Settings className="h-4 w-4 text-muted-foreground" />
									</Button>
									<DropdownMenu onOpenChange={(open) => open && void loadRoles()}>
										<DropdownMenuTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												aria-label="Cambiar rol"
												disabled={updatingRole}
											>
												<UserCog className="h-4 w-4 text-muted-foreground" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-48">
											<DropdownMenuLabel>Cambiar Rol</DropdownMenuLabel>
											<DropdownMenuSeparator />
											{loadingRoles ? (
												<DropdownMenuItem disabled>Cargando roles...</DropdownMenuItem>
											) : roles.length === 0 ? (
												<DropdownMenuItem disabled>Sin roles disponibles</DropdownMenuItem>
											) : (
												roles.map((r) => {
													const isCurrent = Number(u.rol?.consecutivo_rol) === Number(r.consecutivo_rol)
													return (
														<DropdownMenuItem
															key={r.consecutivo_rol}
															disabled={updatingRole || isCurrent}
															onClick={() => void updateUserRole(u, Number(r.consecutivo_rol))}
														>
															{isCurrent ? "✓ " : ""}
															{r.rol_nombre}
														</DropdownMenuItem>
													)
												})
											)}
										</DropdownMenuContent>
									</DropdownMenu>
									<div className="text-right mr-2">
										<p className="text-xs text-muted-foreground mb-1">Estado</p>
										<Switch
											checked={Boolean(u.usuario_activo)}
											onCheckedChange={(val) => toggleUser(u.id_usuario_mipres, Boolean(val))}
											disabled={updatingId === u.id_usuario_mipres}
										/>
									</div>
								</div>
							</div>
						))}
						<div className="flex items-center justify-between pt-2">
							<p className="text-xs text-muted-foreground">
								Mostrando {users.length === 0 ? 0 : (currentPage - 1) * usersPerPage + 1}-{Math.min(currentPage * usersPerPage, users.length)} de {users.length}
							</p>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={currentPage <= 1}
									onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
								>
									Anterior
								</Button>
								<p className="text-xs text-muted-foreground">
									Página {currentPage} de {totalPages}
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={currentPage >= totalPages}
									onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
								>
									Siguiente
								</Button>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

