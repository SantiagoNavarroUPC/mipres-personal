"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import type { DireccionamientoRow, Municipio } from "../types"

interface MunicipiosSelectorProps {
  selectedCode: string
  municipios: Municipio[]
  filteredMunicipios: Municipio[]
  municipioQuery: string
  municipiosLoading: boolean
  municipiosError: string | null
  municipioByCode: Map<string, string>
  onMunicipioChange: (code: string) => void
  onQueryChange: (query: string) => void
}

export function MunicipiosSelector({
  selectedCode,
  municipios,
  filteredMunicipios,
  municipioQuery,
  municipiosLoading,
  municipiosError,
  municipioByCode,
  onMunicipioChange,
  onQueryChange,
}: MunicipiosSelectorProps) {
  return (
    <div>
      <Label>Lugar de Entrega</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="mt-1 w-full justify-between"
          >
            {selectedCode
              ? `${selectedCode} - ${municipioByCode.get(selectedCode) || "Municipio no encontrado"}`
              : "Selecciona municipio"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar por codigo o nombre"
              value={municipioQuery}
              onValueChange={onQueryChange}
            />
            <CommandList>
              {municipiosLoading && (
                <CommandEmpty>Cargando municipios...</CommandEmpty>
              )}
              {!municipiosLoading && (
                <CommandEmpty>
                  {municipiosError || "Sin resultados"}
                </CommandEmpty>
              )}
              {filteredMunicipios.map((municipio) => (
                <CommandItem
                  key={municipio.cod_mpio}
                  value={`${municipio.cod_mpio} ${municipio.nom_mpio}`}
                  onSelect={() => onMunicipioChange(municipio.cod_mpio)}
                >
                  <span>{municipio.cod_mpio} - {municipio.nom_mpio}</span>
                  {selectedCode === municipio.cod_mpio && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {municipiosError && (
        <p className="text-xs text-muted-foreground mt-1">{municipiosError}</p>
      )}
    </div>
  )
}
