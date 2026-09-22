"use client"

import type { MipresCredentials } from "@/models/credentials.model"
import UsuariosTable from "@/components/component-usuarios/UsuariosTable"
import { Users } from "lucide-react"

interface UsuariosTabProps {
	credentials: MipresCredentials
}

export function UsuariosTab({ credentials }: UsuariosTabProps) {
	return (
		<div className="space-y-4">
			<div className="rounded-lg border bg-muted/30 p-4">
				<p className="text-sm font-medium text-foreground flex items-center gap-2">
					<span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<Users className="h-5 w-5" />
					</span>
					Usuarios
				</p>
				<p className="text-sm text-muted-foreground">
					Consulta el listado de usuarios, cambia su estado y actualiza su rol.
				</p>
			</div>

			<UsuariosTable authToken={credentials.authToken} />
		</div>
	)
}