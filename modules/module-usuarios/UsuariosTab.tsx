"use client"

import type { MipresCredentials } from "@/models/credentials.model"
import UsuariosTable from "@/components/component-usuarios/UsuariosTable"
import { Users, ShieldCheck, UserCheck } from "lucide-react"

interface UsuariosTabProps {
	credentials: MipresCredentials
}

export function UsuariosTab({ credentials }: UsuariosTabProps) {
	return (
		<div className="space-y-4">
			<div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-3.5">
						<div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs shrink-0">
							<Users className="size-5.5" />
						</div>
						<div>
							<h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
								Usuarios del Sistema
							</h3>
							<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
								Control de acceso, asignación de roles y estado operativo en la plataforma MIPRES.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/60 border border-border/60 text-xs font-medium text-muted-foreground">
							<ShieldCheck className="size-3.5 text-primary" />
							<span>Seguridad RBAC</span>
						</div>
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-300">
							<UserCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
							<span>Gestión Activa</span>
						</div>
					</div>
				</div>
			</div>

			<UsuariosTable authToken={credentials.authToken} />
		</div>
	)
}