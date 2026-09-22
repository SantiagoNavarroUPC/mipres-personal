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
import type { IpsProveedor } from "../types"

interface IpsSelectorProps {
  selectedNit: string
  selectedName?: string
  selectedProveedor?: IpsProveedor
  filteredIps: IpsProveedor[]
  ipsQuery: string
  ipsSearch: string
  ipsLoading: boolean
  ipsError: string | null
  onIpsChange: (nit: string, ipsProveedor: IpsProveedor) => void
  onQueryChange: (query: string) => void
  onSearch: (query: string) => void
  onManualChange?: (nit: string) => void
}

export function IpsSelector({
  selectedNit,
  selectedName,
  selectedProveedor,
  filteredIps,
  ipsQuery,
  ipsSearch,
  ipsLoading,
  ipsError,
  onIpsChange,
  onQueryChange,
  onSearch,
  onManualChange,
}: IpsSelectorProps) {
  const [open, setOpen] = useState(false)
  const visibleIps = filteredIps.slice(0, 50)

  const handleManualChange = (value: string) => {
    if (onManualChange) {
      onManualChange(value)
    }
  }

  return (
    <div>
      <Label>Proveedor (IPS)</Label>
      <div className="flex gap-2 mt-1">
        <Input
          placeholder="Escribe o selecciona el NIT"
          value={selectedNit}
          onChange={(e) => handleManualChange(e.target.value)}
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
          <PopoverContent className="w-[500px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar por NIT o nombre IPS"
                value={ipsQuery}
                onValueChange={onQueryChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    onSearch(ipsQuery)
                  }
                }}
              />
              <CommandList>
                {ipsLoading && <CommandEmpty>Cargando IPS...</CommandEmpty>}
                {!ipsLoading && !ipsSearch && (
                  <CommandEmpty>Escribe y presiona Enter para buscar</CommandEmpty>
                )}
                {!ipsLoading && ipsSearch && visibleIps.length === 0 && (
                  <CommandEmpty>{ipsError || "Sin resultados"}</CommandEmpty>
                )}
                {visibleIps.map((ipsItem, index) => (
                  <CommandItem
                    key={`${ipsItem.nit}-${ipsItem.ips_nombre}-${index}`}
                    value={`${ipsItem.nit} ${ipsItem.ips_nombre}`}
                    onSelect={() => {
                      onIpsChange(ipsItem.nit, ipsItem)
                      setOpen(false)
                    }}
                  >
                    <span className="text-sm">{ipsItem.nit} - {ipsItem.ips_nombre}</span>
                    {selectedNit === ipsItem.nit && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
                {!ipsLoading && ipsSearch && filteredIps.length > 50 && (
                  <CommandEmpty>Mostrando 50 de {filteredIps.length} resultados</CommandEmpty>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {ipsError && (
        <p className="text-xs text-muted-foreground mt-1">{ipsError}</p>
      )}
    </div>
  )
}
