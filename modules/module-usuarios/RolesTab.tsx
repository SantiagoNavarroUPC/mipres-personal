"use client"

import type { MipresCredentials } from "../../models/credentials.model"
import RolesTable from "../../components/component-usuarios/RolesTable"
import { BadgeInfo, Shield, Key } from "lucide-react"

interface RolesTabProps {
	credentials: MipresCredentials
}

export function RolesTab({ credentials }: RolesTabProps) {
	return (
		<div className="space-y-4">
			<div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-3.5">
						<div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs shrink-0">
							<BadgeInfo className="size-5.5" />
						</div>
						<div>
							<h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
								Roles y Permisos
							</h3>
							<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
								Definición de perfiles de acceso y permisos para los módulos de MIPRES.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/60 border border-border/60 text-xs font-medium text-muted-foreground">
							<Shield className="size-3.5 text-primary" />
							<span>Control de Acceso</span>
						</div>
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
							<Key className="size-3.5" />
							<span>Permisos Modulares</span>
						</div>
					</div>
				</div>
			</div>

			<RolesTable credentials={credentials} />
		</div>
	)
}
