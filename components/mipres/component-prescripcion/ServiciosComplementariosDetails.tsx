"use client"

import React, { useEffect, useMemo, useState } from "react"
import type { ServicioComplementario } from "@/models/mipres-sispro/prescripcion"
import { UNIDADES_TIEMPO, ESTADOS_TECNOLOGIAS } from "@/models/constants"
import { EmptySection } from "./EmptySection"

interface ServiciosComplementariosDetailsProps {
  servicios: ServicioComplementario[]
}

interface ServicioComplementarioInfo {
  descripcion: string
}

function getCodigoServicio(serv: ServicioComplementario): string | undefined {
  const raw = (serv as unknown as Record<string, unknown>).CodSerComp
  if (raw === undefined || raw === null) return undefined
  return String(raw).trim()
}

export function ServiciosComplementariosDetails({ servicios }: ServiciosComplementariosDetailsProps) {
  if (!servicios?.length) return <EmptySection label="servicios complementarios" />

  const codigos = useMemo(
    () => Array.from(new Set(servicios.map(getCodigoServicio).filter(Boolean) as string[])),
    [servicios]
  )
  const [infoMap, setInfoMap] = useState<Map<string, ServicioComplementarioInfo>>(new Map())

  useEffect(() => {
    if (codigos.length === 0) return

    const controller = new AbortController()
    let active = true

    const loadServicios = async () => {
      try {
        const codigosToFetch = codigos.filter((codigo) => !infoMap.has(codigo))
        if (codigosToFetch.length === 0) return

        const requests = codigosToFetch.map(async (codigo) => {
          try {
            const response = await fetch(
              `/api/mipres/prescripciones/servicios-complementarios?codigo=${encodeURIComponent(codigo)}`,
              { signal: controller.signal }
            )

            if (!response.ok) return null

            const data = await response.json()
            const servicio = Array.isArray(data) ? data[0] : data
            const descripcion = servicio?.descripcion ? String(servicio.descripcion) : undefined
            if (!descripcion) return null

            return { codigo, descripcion }
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return null
            return null
          }
        })

        const results = await Promise.all(requests)
        if (!active) return

        setInfoMap((prev) => {
          const next = new Map(prev)
          results.forEach((result) => {
            if (result) {
              next.set(result.codigo, { descripcion: result.descripcion })
            }
          })
          return next
        })
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    void loadServicios()

    return () => {
      active = false
      controller.abort()
    }
  }, [codigos.join(",")])

  function pickField(serv: ServicioComplementario, candidates: string[]): React.ReactNode {
    for (const candidate of candidates) {
      const value = (serv as unknown as Record<string, unknown>)[candidate]
      if (value !== undefined && value !== null) return value as React.ReactNode
    }
    return undefined
  }

  return (
    <div className="grid gap-4">
      {servicios.map((serv, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 space-y-3"
        >
          <h4 className="font-medium text-sm text-foreground line-clamp-2">
            {(() => {
              const codigo = getCodigoServicio(serv)
              const info = codigo ? infoMap.get(codigo) : undefined
              return info?.descripcion ?? "Servicio"
            })()}
          </h4>

          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Indicaciones:
              </span>{" "}
              {pickField(serv, ["IndRec"]) ?? "Ninguna"}
            </p>

            <p className="text-xs text-muted-foreground text-justify">
              <span className="font-semibold text-foreground">
                Justificación PBS:
              </span>{" "}
              {pickField(serv, ["JustNoPBSSC", "JustNoPBS"]) ?? "Ninguna"}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {ESTADOS_TECNOLOGIAS[serv.EstJM as keyof typeof ESTADOS_TECNOLOGIAS] || "Desconocido"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-violet-700">
                Código:
              </span>{" "}
              {serv.CodSerComp}
            </p>

            <p>
              <span className="font-semibold text-violet-700">
                Cantidad:
              </span>{" "}
              {serv.CantTotal}
            </p>

            <p>
              <span className="font-semibold text-violet-700">
                Frecuencia:
              </span>{" "}
              {serv.CadaFreUso || "-"} {UNIDADES_TIEMPO[serv.CodFreUso as keyof typeof UNIDADES_TIEMPO] ?? ""}
            </p>

            <p>
              <span className="font-semibold text-violet-700">
                Duración:
              </span>{" "}
              {serv.Cant || "-"} {UNIDADES_TIEMPO[serv.CodPerDurTrat as keyof typeof UNIDADES_TIEMPO] ?? ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
