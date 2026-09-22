"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { DireccionamientoRow, IpsProveedor, Medicamento } from "../types"
import { IpsSelector } from "./IpsSelector"
import { MunicipiosSelector } from "./MunicipiosSelector"
import { MedicamentoSelector } from "./MedicamentoSelector"

interface DireccionamientoFormRowProps {
  row: DireccionamientoRow
  absoluteIndex: number
  municipioByCode: Map<string, string>
  filteredMunicipios: any[]
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
  onRowChange: (index: number, updatedRow: DireccionamientoRow) => void
  onAddressChange: (newAddress: string) => void
  onMedicamentoSelect: (codigo: string, nombre: string) => void
  onMedicamentoQueryChange: (query: string) => void
  onMedicamentoSearch: (query: string) => void
  onMunicipioSelect: (code: string) => void
  onQueryChange: (query: string) => void
  onIpsSelect: (nit: string, ipsProveedor: IpsProveedor) => void
  onIpsQueryChange: (query: string) => void
  onIpsSearch: (query: string) => void
}

export function DireccionamientoFormRow({
  row,
  absoluteIndex,
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
  onAddressChange,
  onMedicamentoSelect,
  onMedicamentoQueryChange,
  onMedicamentoSearch,
  onMunicipioSelect,
  onQueryChange,
  onIpsSelect,
  onIpsQueryChange,
  onIpsSearch,
}: DireccionamientoFormRowProps) {
  const handleFieldChange = (field: keyof DireccionamientoRow, value: any) => {
    onRowChange(absoluteIndex, { ...row, [field]: value })
  }

  const handleNumberFieldChange = (field: keyof DireccionamientoRow, value: string) => {
    if (value.startsWith("-")) return
    handleFieldChange(field, value)
  }

  const handleEntregaChange = (value: string) => {
    if (value === "") {
      handleFieldChange("NoEntrega", "")
      return
    }
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 1) return
    handleFieldChange("NoEntrega", String(Math.floor(parsed)))
  }

  // Obtener el proveedor currentemente seleccionado
  const selectedProveedor = useMemo(() => {
    if (!row.NoIDProv) return undefined
    return filteredIps.find((ips) => String(ips.nit) === String(row.NoIDProv))
  }, [row.NoIDProv, filteredIps])

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Número de Prescripción</Label>
            <Input value={row.NoPrescripcion} readOnly className="mt-1 bg-muted" />
          </div>
          <div>
            <Label>Tipo de Servicio o Tecnología</Label>
            {row.allowManualTipo ? (
              <Select value={row.TipoTec || ""} onValueChange={(value) => handleFieldChange("TipoTec", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Medicamento (M)</SelectItem>
                  <SelectItem value="P">Procedimiento (P)</SelectItem>
                  <SelectItem value="D">Dispositivo (D)</SelectItem>
                  <SelectItem value="N">Producto Nutricional (N)</SelectItem>
                  <SelectItem value="S">Servicio Complementario (S)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input value={row.TipoTec} readOnly className="mt-1 bg-muted" />
            )}
          </div>
          <div>
            <Label>Consecutivo del Servicio o Tecnología</Label>
            <Input
              value={String(row.ConTec ?? "")}
              readOnly={!row.allowManualTipo}
              onChange={(e) => handleFieldChange("ConTec", e.target.value)}
              placeholder={row.allowManualTipo ? "Ingrese consecutivo" : undefined}
              className={row.allowManualTipo ? "mt-1" : "mt-1 bg-muted"}
            />
          </div>
          <div>
            <Label>Número de Entrega</Label>
            <Input
              type="number"
              min={1}
              placeholder="Numero de entrega"
              value={row.NoEntrega}
              onChange={(e) => handleEntregaChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Número de Subentrega</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={row.NoSubEntrega}
              onChange={(e) => handleNumberFieldChange("NoSubEntrega", e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Opcional, si no se indica es 0</p>
          </div>
          <div>
            <Label>Tipo de Documento del Paciente</Label>
            <Input value={row.TipoIDPaciente} readOnly className="mt-1 bg-muted" />
          </div>
          <div>
            <Label>Número de Documento del Paciente</Label>
            <Input value={row.NoIDPaciente} readOnly className="mt-1 bg-muted" />
          </div>
          <div>
            <Label>Tipo de Documento del Proveedor</Label>
            <Input value={row.TipoIDProv} readOnly className="mt-1 bg-muted" />
          </div>
          <IpsSelector
            selectedNit={row.NoIDProv}
            selectedName={row.NomProv}
            selectedProveedor={selectedProveedor}
            filteredIps={filteredIps}
            ipsQuery={ipsQuery}
            ipsSearch={ipsSearch}
            ipsLoading={ipsLoading}
            ipsError={ipsError}
            onIpsChange={onIpsSelect}
            onQueryChange={onIpsQueryChange}
            onSearch={onIpsSearch}
            onManualChange={(nit) => {
              handleFieldChange("NoIDProv", nit)
            }}
          />
          <MunicipiosSelector
            selectedCode={row.CodMunEnt}
            municipios={filteredMunicipios}
            filteredMunicipios={filteredMunicipios}
            municipioQuery={municipioQuery}
            municipiosLoading={municipiosLoading}
            municipiosError={municipiosError}
            municipioByCode={municipioByCode}
            onMunicipioChange={onMunicipioSelect}
            onQueryChange={onQueryChange}
          />
          <div>
            <Label>Fecha Máxima de Entrega</Label>
            <Input
              type="date"
              value={row.FecMaxEnt}
              onChange={(e) => handleFieldChange("FecMaxEnt", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Cantidad Total a Entregar</Label>
            <Input
              placeholder="Cantidad total"
              min={0}
              type="number"
              value={row.CantTotAEntregar}
              onChange={(e) => handleNumberFieldChange("CantTotAEntregar", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Código del Servicio o Tecnología</Label>
            {row.TipoTec === "M" ? (
              <MedicamentoSelector
                selectedCodigo={row.CodSerTecAEntregar}
                selectedNombre=""
                filteredMedicamentos={filteredMedicamentos}
                medicamentoQuery={medicamentoQuery}
                medicamentoSearch={medicamentoSearch}
                medicamentosLoading={medicamentosLoading}
                medicamentosError={medicamentosError}
                onMedicamentoChange={(codigo, nombre) => {
                  const suffix = row.deliveryCount > 1 ? ` - Entrega ${row.deliveryIndex} de ${row.deliveryCount}` : ""
                  onRowChange(absoluteIndex, {
                    ...row,
                    CodSerTecAEntregar: codigo,
                    label: `Medicamento: ${nombre}${suffix}`,
                  })
                }}
                onManualChange={(codigo) => {
                  handleFieldChange("CodSerTecAEntregar", codigo)
                }}
                onQueryChange={onMedicamentoQueryChange}
                onSearch={onMedicamentoSearch}
              />
            ) : (
              <Input
                placeholder={row.allowManualTipo ? "Ingrese código del servicio o tecnología" : "Codigo del servicio o tecnologia"}
                value={row.CodSerTecAEntregar}
                readOnly={!row.allowManualTipo && row.CodSerTecFixed}
                onChange={(e) => {
                  const val = e.target.value
                  if (row.TipoTec === "N") {
                    onRowChange(absoluteIndex, {
                      ...row,
                      CodSerTecAEntregar: val,
                      codigoMipres: val,
                    })
                  } else {
                    handleFieldChange("CodSerTecAEntregar", val)
                  }
                }}
                className={row.allowManualTipo ? "mt-1" : "mt-1 bg-muted"}
              />
            )}
          </div>
          {row.allowManualTipo && (
            <div className="sm:col-span-2">
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder="Descripción de la tecnología"
                value={row.label || ""}
                onChange={(e) => handleFieldChange("label", e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <Label>Dirección del Paciente</Label>
          <Textarea
            placeholder="Direccion del paciente"
            value={row.DirPaciente}
            onChange={(e) => onAddressChange(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>
      </div>
    </div>
  )
}
