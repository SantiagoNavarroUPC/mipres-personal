"use client"

import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Facturacion } from "@/models/mipres-sispro/facturacion/facturacion"
import { ESTADOS_FACTURACION, TIPOS_TEC_FACTURACION } from "@/models/constants"

interface FacturacionTableBodyProps {
  facturaciones: Facturacion[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function EstadoBadge({ estado }: { estado: number }) {
  const label = ESTADOS_FACTURACION[estado] ?? `Estado ${estado}`
  const variant = estado === 2 ? "destructive" : "default"
  return <Badge variant={variant}>{label}</Badge>
}

function TipoTecBadge({ tipo }: { tipo: string }) {
  const label = TIPOS_TEC_FACTURACION[tipo] ?? tipo
  return (
    <Badge variant="outline" className="text-xs">
      {tipo} · {label}
    </Badge>
  )
}

export function FacturacionTableBody({ facturaciones }: FacturacionTableBodyProps) {
  if (facturaciones.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={11} className="text-center text-muted-foreground py-10">
            No hay registros de facturación para mostrar
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody>
      {facturaciones.map((fac, idx) => (
        <TableRow key={fac.IDFacturacion ?? idx} className={fac.FecAnulacion ? "opacity-60" : undefined}>
          <TableCell className="font-mono text-xs">{fac.NoPrescripcion}</TableCell>
          <TableCell>
            <TipoTecBadge tipo={fac.TipoTec} />
          </TableCell>
          <TableCell className="text-center">{fac.ConTec}</TableCell>
          <TableCell className="text-center">{fac.NoEntrega}</TableCell>
          <TableCell className="font-mono text-xs">{fac.NoFactura || "—"}</TableCell>
          <TableCell className="text-xs">{fac.TipoIDPaciente} {fac.NoIDPaciente}</TableCell>
          <TableCell className="text-right text-xs">{fac.CantUnMinDis}</TableCell>
          <TableCell className="text-right text-xs">{formatCurrency(fac.ValorTotFacturado)}</TableCell>
          <TableCell className="text-center text-xs">{formatDate(fac.FecFacturacion)}</TableCell>
          <TableCell>
            <EstadoBadge estado={fac.EstFacturacion} />
          </TableCell>
          <TableCell className="text-center text-xs text-muted-foreground">
            {fac.FecAnulacion ? formatDate(fac.FecAnulacion) : "—"}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}
