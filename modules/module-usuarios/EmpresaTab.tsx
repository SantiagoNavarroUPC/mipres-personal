"use client"

import type { MipresCredentials } from "../../models/credentials.model"
import EmpresaTable from "../../components/component-usuarios/EmpresaTable"

interface EmpresaTabProps {
	credentials: MipresCredentials
}

export function EmpresaTab({ credentials }: EmpresaTabProps) {
	return (
		<div className="space-y-4">
			<div className="rounded-lg border bg-muted/30 p-4">
				<p className="text-sm font-medium text-foreground">Empresa</p>
				<p className="text-sm text-muted-foreground">IPS/EPS que operan esta instancia de la aplicación.</p>
			</div>
			<EmpresaTable credentials={credentials} />
		</div>
	)
}
