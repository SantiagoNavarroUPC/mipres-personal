"use client"

import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { addPlantillaRow } from "@/lib/facturacion-plantilla-storage"
import type { FacturacionPlantillaRow } from "@/lib/facturacion-plantilla-storage"

interface FacturacionPlantillaSendButtonProps {
  data: Partial<Omit<FacturacionPlantillaRow, "_id">>
  label?: string
  variant?: "ghost" | "outline" | "secondary"
  size?: "sm" | "icon"
  className?: string
}

export function FacturacionPlantillaSendButton({
  data,
  label,
  variant = "ghost",
  size = "sm",
  className = "",
}: FacturacionPlantillaSendButtonProps) {
  const handleClick = () => {
    addPlantillaRow(data)
    toast.success("Registro enviado a la plantilla de facturación", {
      description: data.numero_prescripcion
        ? `Prescripción: ${data.numero_prescripcion}`
        : undefined,
    })
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      title="Enviar a plantilla de facturación"
      className={`gap-1.5 ${className}`}
    >
      <Pencil className="h-3.5 w-3.5" />
      {label && <span>{label}</span>}
    </Button>
  )
}
