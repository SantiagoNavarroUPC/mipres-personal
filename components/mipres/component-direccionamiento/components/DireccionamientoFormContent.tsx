"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Pencil } from "lucide-react"
import type { DireccionamientoRow, IpsProveedor, Municipio, Medicamento } from "../types"
import { DireccionamientoFormRow } from "./DireccionamientoFormRow"
import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DireccionamientoFormContentProps {
  rows: DireccionamientoRow[]
  page: number
  submitting: boolean
  formError: string | null
  formSuccess: string | null
  municipioByCode: Map<string, string>
  filteredMunicipios: Municipio[]
  municipioQuery: string
  municipiosLoading: boolean
  municipiosError: string | null
  filteredIps: IpsProveedor[]
  ipsQuery: string
  ipsSearch: string
  ipsLoading: boolean
  ipsError: string | null
  filteredMedicamentos: Medicamento[]
  medicamentoQuery: string
  medicamentoSearch: string
  medicamentosLoading: boolean
  medicamentosError: string | null
  onRowChange: (index: number, row: DireccionamientoRow) => void
  onRowsChange: (rows: DireccionamientoRow[]) => void
  onPageChange: (page: number) => void
  onAddressChange: (address: string) => void
  onMedicamentoSelect: (codigo: string, nombre: string) => void
  onMedicamentoQueryChange: (query: string) => void
  onMedicamentoSearch: (query: string) => void
  onMunicipioSelect: (code: string) => void
  onQueryChange: (query: string) => void
  onIpsSelect: (nit: string, ipsProveedor: IpsProveedor) => void
  onIpsQueryChange: (query: string) => void
  onIpsSearch: (query: string) => void
  onSubmit: () => Promise<void> | void
  onCancel: () => void
  onUpdateDeliveries: (rowId: string, count: number) => void
}

export function DireccionamientoFormContent({
  rows,
  page,
  submitting,
  formError,
  formSuccess,
  municipioByCode,
  filteredMunicipios,
  municipioQuery,
  municipiosLoading,
  municipiosError,
  filteredIps,
  ipsQuery,
  filteredMedicamentos,
  medicamentoQuery,
  medicamentoSearch,
  medicamentosLoading,
  medicamentosError,
  ipsSearch,
  ipsLoading,
  ipsError,
  onRowChange,
  onMedicamentoSelect,
  onMedicamentoQueryChange,
  onMedicamentoSearch,
  onRowsChange,
  onPageChange,
  onAddressChange,
  onMunicipioSelect,
  onQueryChange,
  onIpsSelect,
  onIpsQueryChange,
  onIpsSearch,
  onSubmit,

  onCancel,
  onUpdateDeliveries,
}: DireccionamientoFormContentProps) {
  const [editDeliveriesOpen, setEditDeliveriesOpen] = useState(false)
  const [newDeliveryCount, setNewDeliveryCount] = useState<string>("")
  const submitClickRef = useRef(false)

  const handleSubmitClick = async () => {
    if (submitClickRef.current || submitting) {
      console.warn("Submit already in progress, ignoring click")
      return
    }
    submitClickRef.current = true
    try {
      await Promise.resolve(onSubmit())
    } finally {
      submitClickRef.current = false
    }
  }

  const renderLabel = (label: string) => {
    const parts = label.split(":")
    if (parts.length <= 1) return label
    const [title, ...rest] = parts
    const suffix = rest.join(":")
    return (
      <>
        <span className="font-semibold">{title}:</span>
        {suffix}
      </>
    )
  }

  const handleAddressChange = (newAddress: string) => {
    const next = rows.map(r => ({ ...r, DirPaciente: newAddress }))
    onRowsChange(next)
    onAddressChange(newAddress)
  }

  const handleMunicipioSelect = (code: string) => {
    const currentRow = rows[page - 1]
    if (!currentRow) return
    
    // Si es la primera entrega y estaba vacía, propagar a todas las entregas de esa tecnología
    const isFirstDelivery = currentRow.NoEntrega === "1"
    const wasEmpty = !currentRow.CodMunEnt
    
    const next = rows.map((r, idx) => {
      if (idx === page - 1) {
        // Actualizar la fila actual
        return { ...r, CodMunEnt: code }
      }
      
      if (isFirstDelivery && wasEmpty && r.TipoTec === currentRow.TipoTec && r.ConTec === currentRow.ConTec) {
        // Si es primera entrega y estaba vacía, propagar a las demás entregas de la misma tecnología
        return { ...r, CodMunEnt: code }
      }
      
      return r
    })
    
    onRowsChange(next)
    onMunicipioSelect(code)
  }

  const handleIpsSelect = (nit: string, ipsProveedor: IpsProveedor) => {
    const currentRow = rows[page - 1]
    if (!currentRow) return
    
    // Si es la primera entrega y estaba vacía, propagar a todas las entregas de esa tecnología
    const isFirstDelivery = currentRow.NoEntrega === "1"
    const wasEmpty = !currentRow.NoIDProv
    
    const next = rows.map((r, idx) => {
      if (idx === page - 1) {
        // Actualizar la fila actual con NIT, nombre Y municipio del IPS
        return { 
          ...r, 
          NoIDProv: nit, 
          NomProv: ipsProveedor.ips_nombre || "",
          CodMunEnt: ipsProveedor.municipio_codigo || r.CodMunEnt || ""
        }
      }
      
      if (isFirstDelivery && wasEmpty && r.TipoTec === currentRow.TipoTec && r.ConTec === currentRow.ConTec) {
        // Si es primera entrega y estaba vacía, propagar a las demás entregas de la misma tecnología
        return { 
          ...r, 
          NoIDProv: nit, 
          NomProv: ipsProveedor.ips_nombre || "",
          CodMunEnt: ipsProveedor.municipio_codigo || r.CodMunEnt || ""
        }
      }
      
      return r
    })
    
    onRowsChange(next)
    onIpsSelect(nit, ipsProveedor)
  }

  const handleMedicamentoSelect = (codigo: string, nombre: string) => {
    const currentRow = rows[page - 1]
    if (!currentRow) return
    
    // Si es la primera entrega y estaba vacía, propagar a todas las entregas de esa tecnología
    const isFirstDelivery = currentRow.NoEntrega === "1"
    const wasEmpty = !currentRow.CodSerTecAEntregar
    
    const next = rows.map((r, idx) => {
      if (idx === page - 1) {
        // Actualizar la fila actual
        return { ...r, CodSerTecAEntregar: codigo }
      }
      
      if (isFirstDelivery && wasEmpty && r.TipoTec === currentRow.TipoTec && r.ConTec === currentRow.ConTec) {
        // Si es primera entrega y estaba vacía, propagar a las demás entregas de la misma tecnología
        return { ...r, CodSerTecAEntregar: codigo }
      }
      
      return r
    })
    
    onRowsChange(next)
    onMedicamentoSelect(codigo, nombre)
  }

  const absoluteIndex = page - 1
  const currentRow = rows[absoluteIndex]

  return (
    <div className="space-y-4">
      {(formError || formSuccess) && (
        <Alert variant={formError ? "destructive" : "default"}>
          <AlertDescription>{formError || formSuccess}</AlertDescription>
        </Alert>
      )}

      {rows.length === 0 ? (
        <Alert>
          <AlertDescription>No hay tecnologias asociadas a esta prescripcion.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {currentRow && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {rows.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {page} / {rows.length}
                  </p>
                )}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary ml-auto"
                    onClick={() => {
                        setNewDeliveryCount(String(currentRow.deliveryCount || 1))
                        setEditDeliveriesOpen(true)
                    }}
                    title="Editar número de entregas"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <DireccionamientoFormRow
                row={currentRow}
                absoluteIndex={absoluteIndex}
                municipioByCode={municipioByCode}
                filteredMunicipios={filteredMunicipios}
                municipioQuery={municipioQuery}
                municipiosLoading={municipiosLoading}
                municipiosError={municipiosError}
                filteredIps={filteredIps}
                ipsQuery={ipsQuery}
                ipsSearch={ipsSearch}
                ipsLoading={ipsLoading}
                ipsError={ipsError}
                filteredMedicamentos={filteredMedicamentos}
                medicamentoQuery={medicamentoQuery}
                medicamentoSearch={medicamentoSearch}
                medicamentosLoading={medicamentosLoading}
                medicamentosError={medicamentosError}
                onRowChange={onRowChange}
                onAddressChange={handleAddressChange}
                onMunicipioSelect={handleMunicipioSelect}
                onQueryChange={onQueryChange}
                onIpsSelect={handleIpsSelect}
                onIpsQueryChange={onIpsQueryChange}
                onIpsSearch={onIpsSearch}
                onMedicamentoSelect={handleMedicamentoSelect}
                onMedicamentoQueryChange={onMedicamentoQueryChange}
                onMedicamentoSearch={onMedicamentoSearch}
              />
            </div>
          )}

          <div className="space-y-2">
            {currentRow && (
              <div className="mb-2 p-2 rounded bg-muted/40 border text-xs overflow-x-auto whitespace-pre-wrap">
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {renderLabel(currentRow.label)}
                </div>
              </div>
            )}

            {rows.length > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <p className="text-xs text-muted-foreground">
                  {page} de {rows.length}
                </p>
                <Button
                  variant="outline"
                  onClick={() => onPageChange(Math.min(rows.length, page + 1))}
                  disabled={page >= rows.length}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMENTADO: Previsualizacion de direccionamientos - Se vuelve a activar si es necesario */}
      {/* 
      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="text-sm font-medium">Previsualizacion de direccionamientos</p>
        <Textarea
          value={JSON.stringify(
            rows.map((row) => ({
              NoPrescripcion: row.NoPrescripcion,
              TipoTec: row.TipoTec,
              ConTec: Number(row.ConTec),
              TipoIDPaciente: row.TipoIDPaciente,
              NoIDPaciente: row.NoIDPaciente,
              NoEntrega: Number(row.NoEntrega),
              NoSubEntrega: Number(row.NoSubEntrega || 0),
              TipoIDProv: row.TipoIDProv,
              NoIDProv: row.NoIDProv,
              CodMunEnt: row.CodMunEnt,
              FecMaxEnt: row.FecMaxEnt,
              CantTotAEntregar: row.CantTotAEntregar,
              DirPaciente: row.DirPaciente,
              CodSerTecAEntregar: row.CodSerTecAEntregar,
            })),
            null,
            2
          )}
          readOnly
          className="mt-2 font-mono text-xs"
          rows={8}
        />
      </div>
      */}

      <div className="flex gap-2">
        <Button onClick={handleSubmitClick} disabled={submitting || submitClickRef.current}>
          <Send className="h-4 w-4 mr-2" />
          {submitting ? "Enviando..." : "Registrar direccionamiento"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancelar
        </Button>
      </div>

      <Dialog open={editDeliveriesOpen} onOpenChange={setEditDeliveriesOpen}>
        <DialogContent className="max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Número de entregas</DialogTitle>
            <DialogDescription>
              Ingrese la cantidad de entregas para esta tecnología.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="delivery-count" className="text-right">
                Cantidad
              </Label>
              <Input
                id="delivery-count"
                type="number"
                min="1"
                max="99"
                className="col-span-3"
                value={newDeliveryCount}
                onChange={(e) => setNewDeliveryCount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDeliveriesOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
                const count = parseInt(newDeliveryCount)
                if (count > 0 && currentRow) {
                    onUpdateDeliveries(currentRow.id, count)
                    setEditDeliveriesOpen(false)
                }
            }}>Actualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
