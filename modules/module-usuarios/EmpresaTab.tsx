"use client"

import type { MipresCredentials } from "../../models/credentials.model"
import EmpresaTable from "../../components/component-usuarios/EmpresaTable"
import { Building2, Landmark, CheckCircle2 } from "lucide-react"

interface EmpresaTabProps {
	credentials: MipresCredentials
}

export function EmpresaTab({ credentials }: EmpresaTabProps) {
	return (
		<div className="space-y-4">
			<div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-3.5">
						<div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs shrink-0">
							<Building2 className="size-5.5" />
						</div>
						<div>
							<h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
								Empresas y Entidades
							</h3>
							<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
								IPS y EPS habilitadas que operan y prescriben en esta instancia de MIPRES.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/60 border border-border/60 text-xs font-medium text-muted-foreground">
							<Landmark className="size-3.5 text-primary" />
							<span>Habilitación MinSalud</span>
						</div>
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-700 dark:text-teal-300">
							<CheckCircle2 className="size-3.5 text-teal-600 dark:text-teal-400" />
							<span>Entidad Operativa</span>
						</div>
					</div>
				</div>
			</div>

			<EmpresaTable credentials={credentials} />
		</div>
	)
}
