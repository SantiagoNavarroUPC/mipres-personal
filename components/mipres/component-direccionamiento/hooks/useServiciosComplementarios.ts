"use client"

import { useEffect, useState } from "react"

export interface ServicioComplementarioInfo {
  codigo: string
  descripcion: string
}

const pickFirstFromPayload = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== "object") return null

  const root = payload as Record<string, unknown>

  if (Array.isArray(root)) {
    const first = root[0]
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null
  }

  const nestedCandidates = [root.data, root.result, root.items, root.rows]
  for (const candidate of nestedCandidates) {
    if (Array.isArray(candidate)) {
      const first = candidate[0]
      if (first && typeof first === "object") return first as Record<string, unknown>
    }
    if (candidate && typeof candidate === "object") {
      return candidate as Record<string, unknown>
    }
  }

  return root
}

const asText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

export function useServiciosComplementarios(codigos: string[], enabled: boolean = true) {
  const [servicios, setServicios] = useState<Map<string, ServicioComplementarioInfo>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || codigos.length === 0) return

    const controller = new AbortController()
    let active = true

    const loadServicios = async () => {
      setLoading(true)
      try {
        const codigosToFetch = codigos.filter((codigo) => !servicios.has(codigo))

        if (codigosToFetch.length === 0) {
          setLoading(false)
          return
        }

        const promises = codigosToFetch.map(async (codigo) => {
          try {
            const response = await fetch(
              `/api/mipres/prescripciones/servicios-complementarios?codigo=${encodeURIComponent(codigo)}`,
              { signal: controller.signal }
            )

            if (!response.ok) return null

            const data = await response.json()
            const servicio = pickFirstFromPayload(data)

            if (servicio) {
              const descripcion =
                asText(servicio.descripcion) ||
                asText(servicio.desc_ser_comp) ||
                asText(servicio.descSerComp) ||
                asText(servicio.DescSerComp) ||
                asText(servicio.nombre)

              if (!descripcion) return null

              return {
                codigo,
                info: {
                  codigo,
                  descripcion,
                },
              }
            }

            return null
          } catch {
            return null
          }
        })

        const results = await Promise.all(promises)

        if (!active) return

        setServicios((prev) => {
          const newMap = new Map(prev)
          results.forEach((result) => {
            if (result) {
              newMap.set(result.codigo, result.info)
            }
          })
          return newMap
        })
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadServicios()

    return () => {
      active = false
      controller.abort()
    }
  }, [codigos.join(","), enabled])

  return {
    servicios,
    loading,
    getDescripcion: (codigo: string) => servicios.get(codigo)?.descripcion,
    getServicioInfo: (codigo: string) => servicios.get(codigo),
  }
}
