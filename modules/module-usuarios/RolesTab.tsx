"use client"

import type { MipresCredentials } from "../../models/credentials.model"
import RolesTable from "../../components/component-usuarios/RolesTable"

interface RolesTabProps {
	credentials: MipresCredentials
}

export function RolesTab({ credentials }: RolesTabProps) {
	return (
		<div className="space-y-4">
			<div className="rounded-lg border bg-muted/30 p-4">
				<p className="text-sm font-medium text-foreground">Roles</p>
				<p className="text-sm text-muted-foreground">Listado de roles disponibles en el sistema.</p>
			</div>
			<RolesTable credentials={credentials} />
		</div>
	)
}
