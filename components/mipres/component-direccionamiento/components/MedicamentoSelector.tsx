"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import type { Medicamento } from "../types"

interface MedicamentoSelectorProps {
  selectedCodigo: string
  selectedNombre?: string
  filteredMedicamentos: Medicamento[]
  medicamentoQuery: string
  medicamentoSearch: string
  medicamentosLoading: boolean
  medicamentosError: string | null
  onMedicamentoChange: (codigo: string, nombre: string) => void
  onManualChange: (codigo: string) => void
  onQueryChange: (query: string) => void
  onSearch: (query: string) => void
}

export function MedicamentoSelector({
  selectedCodigo,
  selectedNombre,
  filteredMedicamentos,
  medicamentoQuery,
  medicamentoSearch,
  medicamentosLoading,
  medicamentosError,
  onMedicamentoChange,
  onManualChange,
  onQueryChange,
  onSearch,
}: MedicamentoSelectorProps) {
  const [open, setOpen] = useState(false)
  const visibleMedicamentos = filteredMedicamentos.slice(0, 50)

  return (
    <div>
      <Label>Medicamento (CUM)</Label>
      <div className="flex gap-2 mt-1">
        <Input
          placeholder="Escribe o selecciona el código CUM"
          value={selectedCodigo}
          onChange={(e) => onManualChange(e.target.value)}
          className="flex-1"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-10 p-0"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar por nombre o expediente CUM"
                value={medicamentoQuery}
                onValueChange={onQueryChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    onSearch(medicamentoQuery)
                  }
                }}
              />
              <CommandList>
                {medicamentosLoading && <CommandEmpty>Cargando medicamentos...</CommandEmpty>}
                {!medicamentosLoading && !medicamentoSearch && (
                  <CommandEmpty>Escribe y presiona Enter para buscar</CommandEmpty>
                )}
                {!medicamentosLoading && medicamentoSearch && visibleMedicamentos.length === 0 && (
                  <CommandEmpty>{medicamentosError || "Sin resultados"}</CommandEmpty>
                )}
                {visibleMedicamentos.map((med) => (
                  <CommandItem
                    key={med.codigo}
                    value={`${med.codigo} ${med.producto} ${med.expedientecum}`}
                    onSelect={() => {
                      onMedicamentoChange(med.codigo, med.producto)
                      setOpen(false)
                    }}
                  >
                    <span className="text-xs">{med.producto} ({med.codigo})</span>
                    {selectedCodigo === med.codigo && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
                {!medicamentosLoading && medicamentoSearch && filteredMedicamentos.length > 50 && (
                  <CommandEmpty>Mostrando 50 de {filteredMedicamentos.length} resultados</CommandEmpty>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {medicamentosError && (
        <p className="text-xs text-muted-foreground mt-1">{medicamentosError}</p>
      )}
      {selectedNombre && (
        <p className="text-xs text-muted-foreground mt-1">
          {selectedNombre}
        </p>
      )}
    </div>
  )
}
