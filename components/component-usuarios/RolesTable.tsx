"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader2, Shield, AlertCircle, Plus, Settings } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import type { MipresCredentials } from "../../models/credentials.model"
import { fetchWithAuth } from "../../lib/auth"
import DialogoCrearRol from "./RolesModalCrear"
import { PermisosModal } from "./PermisosModal"

interface RoleItem {
	consecutivo_rol: number
	rol_nombre: string
	rol_descripcion?: string
	estado?: boolean
	id_tipo_empresa?: number
}

const TIPO_EMPRESA_LABEL: Record<number, string> = {
	1: "IPS",
	2: "EPS",
	3: "Ambas",
}

interface RolesTableProps {
	credentials: MipresCredentials
}

export default function RolesTable({ credentials }: RolesTableProps) {
	const [roles, setRoles] = useState<RoleItem[]>([])
	const [loading, setLoading] = useState(false)
	const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [open, setOpen] = useState(false)
	const [permisosModalOpen, setPermisosModalOpen] = useState(false)
	const [selectedRolForPermisos, setSelectedRolForPermisos] = useState<RoleItem | null>(null)
	const { toast } = useToast()

	useEffect(() => {
		const authToken = credentials.authToken?.trim()
		if (!authToken) {
			setError("No hay token JWT disponible para consultar roles")
			setRoles([])
			return
		}

		let active = true
		setLoading(true)
		setError(null)

		const run = async () => {
			try {
				const response = await fetchWithAuth("/api/usuarios/roles")
				const body = await response.json()

				if (!active) return

				if (response.ok && Array.isArray(body?.data)) {
					const nextRoles = [...(body.data as RoleItem[])].sort(
						(a, b) => Number(a.consecutivo_rol || 0) - Number(b.consecutivo_rol || 0)
					)
					setRoles(nextRoles)
				} else {
					setRoles([])
					setError(body?.message || "No se pudieron cargar los roles")
				}
			} catch (err) {
				if (!active) return
				setRoles([])
				setError(err instanceof Error ? err.message : "Error de conexión con el servidor")
			} finally {
				if (active) setLoading(false)
			}
		}

		void run()

		return () => {
			active = false
		}
	}, [credentials.authToken])

	async function reloadRoles() {
		const response = await fetchWithAuth("/api/usuarios/roles")
		const body = await response.json()
		if (response.ok && Array.isArray(body?.data)) {
			const nextRoles = [...(body.data as RoleItem[])].sort(
				(a, b) => Number(a.consecutivo_rol || 0) - Number(b.consecutivo_rol || 0)
			)
			setRoles(nextRoles)
		} else {
			setRoles([])
			setError(body?.message || "No se pudieron cargar los roles")
		}
	}

	async function toggleRoleEstado(role: RoleItem, nextEstado: boolean) {
		setUpdatingRoleId(role.consecutivo_rol)
		setError(null)

		try {
			const response = await fetchWithAuth("/api/usuarios/roles", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					consecutivo_rol: role.consecutivo_rol,
					estado: nextEstado,
				}),
			})

			const body = await response.json()
			if (!response.ok || body?.success === false) {
				toast({
					title: "Error",
					description: body?.message || "No se pudo actualizar el estado del rol",
					variant: "destructive",
				})
				return
			}

			setRoles((prev) =>
				prev.map((item) =>
					Number(item.consecutivo_rol) === Number(role.consecutivo_rol)
						? { ...item, estado: nextEstado }
						: item
				)
			)

			toast({
				title: "Estado actualizado",
				description: body?.message || "Se actualizó el estado del rol",
			})
		} catch (err) {
			toast({
				title: "Error",
				description: err instanceof Error ? err.message : "Error de conexión con el servidor",
				variant: "destructive",
			})
		} finally {
			setUpdatingRoleId(null)
		}
	}

	return (
		<Card className="relative pt-4">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute right-1 top-1 z-10 h-5 w-5 rounded-sm p-0 opacity-40 hover:opacity-100"
				aria-label="Agregar rol"
				onClick={() => setOpen(true)}
			>
				<Plus className="h-3 w-3" />
				<span className="sr-only">Agregar rol</span>
			</Button>

			<DialogoCrearRol
				open={open}
				onOpenChange={setOpen}
				onCreated={async () => {
					setLoading(true)
					try {
						await reloadRoles()
					} finally {
						setLoading(false)
					}
				}}
			/>

			<PermisosModal
				open={permisosModalOpen}
				onOpenChange={setPermisosModalOpen}
				rolId={selectedRolForPermisos?.consecutivo_rol ?? 0}
				rolNombre={selectedRolForPermisos?.rol_nombre ?? ""}
				rolTipoEmpresa={selectedRolForPermisos?.id_tipo_empresa}
				credentials={credentials}
			/>

			<CardContent className="px-3 pt-2 pb-0">
				{error ? (
					<Alert variant="destructive" className="mt-3">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : null}

				{loading ? (
					<div className="flex items-center gap-2 px-2 pb-0 pt-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Cargando roles...
					</div>
				) : roles.length === 0 ? (
					<div className="flex items-center gap-2 px-2 pb-0 pt-2 text-sm text-muted-foreground">
						<Shield className="h-4 w-4" />
						No hay roles para mostrar
					</div>
				) : (
					<div className="grid gap-3 px-2 pb-1 pt-2 sm:grid-cols-2 xl:grid-cols-3">
						{roles.map((role) => (
							<div key={role.consecutivo_rol} className="rounded-lg border bg-background p-4 shadow-sm relative">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-2 top-2 h-8 w-8 rounded-sm p-0 opacity-60 hover:opacity-100"
									aria-label="Gestionar permisos"
									onClick={() => {
										setSelectedRolForPermisos(role)
										setPermisosModalOpen(true)
									}}
								>
									<Settings className="h-5 w-5" />
									<span className="sr-only">Gestionar permisos</span>
								</Button>

								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-xs uppercase tracking-wide text-muted-foreground">Rol</p>
										<p className="text-sm font-semibold text-foreground">{role.rol_nombre || "Sin nombre"}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{role.rol_descripcion?.trim() || "Sin descripción"}
										</p>
										{role.id_tipo_empresa ? (
											<span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
												{TIPO_EMPRESA_LABEL[role.id_tipo_empresa] ?? role.id_tipo_empresa}
											</span>
										) : null}
									</div>
									<div className="flex flex-col items-end gap-8 pt-6">
										<div className="flex items-center gap-2">
											<span className="text-xs text-muted-foreground">Activo</span>
											<Switch
												checked={Boolean(role.estado ?? true)}
												onCheckedChange={(checked) => void toggleRoleEstado(role, Boolean(checked))}
												disabled={updatingRoleId === role.consecutivo_rol}
											/>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}