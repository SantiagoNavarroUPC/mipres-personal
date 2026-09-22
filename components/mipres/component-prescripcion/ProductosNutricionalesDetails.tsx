"use client"

import { useMemo } from "react"
import type { ProductoNutricional } from "@/models/mipres-sispro/prescripcion"
import { ESTADOS_TECNOLOGIAS, UNIDADES_TIEMPO } from "@/models/constants"
import { EmptySection } from "./EmptySection"
import { useProductosNutricionales } from "../component-direccionamiento/hooks/useProductosNutricionales"

interface ProductosNutricionalesDetailsProps {
  productos: ProductoNutricional[]
}

function pickField(obj: any, candidates: string[]) {
  for (const c of candidates) {
    if (obj && obj[c] !== undefined && obj[c] !== null) return obj[c]
  }
  return undefined
}

function getCodigoProducto(prod: any): string | undefined {
  const raw = pickField(prod, [
    "CodProdNutr",
    "CodProdNutrP",
    "CodProd",
    "CodPN",
    "CodigoMipres",
    "codigo_mipres",
    "CodProdNutrional",
    "CodProdNutrPN",
    "CodNutr",
  ])

  if (raw !== undefined && raw !== null) {
    return String(raw).trim()
  }

  const desc = pickField(prod, ["DescProdNutr", "DescPN", "DescProd", "Desc"])
  if (typeof desc === "string" && /^\d+$/.test(desc.trim())) {
    return desc.trim()
  }

  return undefined
}

export function ProductosNutricionalesDetails({ productos }: ProductosNutricionalesDetailsProps) {
  if (!productos?.length) return <EmptySection label="productos nutricionales" />

  const codigos = useMemo(
    () => Array.from(new Set(productos.map(getCodigoProducto).filter(Boolean) as string[])),
    [productos]
  )
  const { getProductoInfo, getNombreComercial } = useProductosNutricionales(codigos, codigos.length > 0)

  return (
    <div className="grid gap-4">
      {productos.map((prod: any, idx: number) => {
        const codigo = getCodigoProducto(prod)
        const info = codigo ? getProductoInfo(codigo) : undefined
        const nombre = codigo ? getNombreComercial(codigo) : undefined
        const descripcionBase = pickField(prod, ["DescProdNutr", "DescPN", "DescProd", "Desc"])
        const titulo = nombre
          ? `${codigo ? `${codigo} - ` : ""}${nombre}`
          : (descripcionBase ?? "Descripción")
        const formaEmpaque = info?.forma ?? pickField(prod, ["FormaEmpaque", "FormaEmpaquePN"]) ?? "-"

        return (
          <div
            key={idx}
            className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 space-y-3"
          >
            <h4 className="font-medium text-sm text-foreground line-clamp-2">
              {titulo}
            </h4>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Indicaciones: </span>
              {pickField(prod, ["IndRec"]) ?? "Ninguna"}
            </p>

            <p className="text-xs text-muted-foreground text-justify">
              <span className="font-semibold">Justificación PBS: </span>
              {pickField(prod, ["JustNoPBS"]) ?? "Ninguna"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {ESTADOS_TECNOLOGIAS[pickField(prod, ["EstJM", "EstPN"]) as keyof typeof ESTADOS_TECNOLOGIAS] || "Desconocido"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p><span className="font-medium text-rose-700">Tipo:</span> {pickField(prod, ["TipoPrest", "TipoPN", "TippProNut"]) ?? "-"}</p>
            <p><span className="font-medium text-rose-700">Dosis:</span> {pickField(prod, ["Dosis", "DosisPN"]) ?? "-"} {pickField(prod, ["DosisUM", "DosisUMPN"]) ?? ""}</p>
            <p>
              <span className="font-medium text-rose-700">Frecuencia:</span>{" "}
              {pickField(prod, ["NoFAdmon", "CodFreAdmon", "CodFreAdmonPN"]) ?? "-"} {UNIDADES_TIEMPO[Number(pickField(prod, ["CodFreAdmon", "CodFreAdmonPN"])) as keyof typeof UNIDADES_TIEMPO] || ""}
            </p>
            <p>
              <span className="font-medium text-rose-700">Duración:</span>{" "}
              {pickField(prod, ["CanTrat"]) ?? "-"} {UNIDADES_TIEMPO[Number(pickField(prod, ["DurTrat"])) as keyof typeof UNIDADES_TIEMPO] || ""}
            </p>
            <p><span className="font-medium text-rose-700">Cantidad:</span> {pickField(prod, ["CantTotalF", "CantTotalFPN", "CantTotal"]) ?? "-"}</p>
            <p><span className="font-medium text-rose-700">Forma de empaque:</span> {formaEmpaque}</p>
          </div>
          </div>
        )
      })}
    </div>
  )
}
