"use client"

import { useEffect, useState } from "react"

export interface ProductoNutricionalInfo {
  codigo_mipres: string
  nombre_comercial: string
  descripcion?: string
  concentracion?: string
  forma?: string
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

export function useProductosNutricionales(codigos: string[], enabled: boolean = true) {
  const [productos, setProductos] = useState<Map<string, ProductoNutricionalInfo>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || codigos.length === 0) return

    const controller = new AbortController()
    let active = true

    const loadProductos = async () => {
      setLoading(true)
      try {
        // Buscar solo los códigos que no tenemos en caché
        const codigosToFetch = codigos.filter(codigo => !productos.has(codigo))
        
        if (codigosToFetch.length === 0) {
          setLoading(false)
          return
        }

        // Hacer las peticiones en paralelo
        const promises = codigosToFetch.map(async (codigo) => {
          try {
            const response = await fetch(
              `/api/mipres/prescripciones/productos-nutricionales?codigo_mipres=${encodeURIComponent(codigo)}`,
              { signal: controller.signal }
            )
            
            if (!response.ok) return null
            
            const data = await response.json()
            const producto = pickFirstFromPayload(data)

            if (producto) {
              const nombreComercial =
                asText(producto.nombre_comercial) ||
                asText(producto.nombreComercial) ||
                asText(producto.nom_comercial) ||
                asText(producto.nomComercial)

              const descripcion =
                asText(producto.descripcion) ||
                asText(producto.desc_prod_nutr) ||
                asText(producto.descProdNutr) ||
                asText(producto.DescProdNutr)

              const codigoResponse =
                asText(producto.codigo_mipres) ||
                asText(producto.codigoMipres) ||
                asText(producto.cod_mipres) ||
                asText(producto.codMipres) ||
                codigo

              const nombreFinal = nombreComercial || descripcion

              if (!nombreFinal) return null

              return {
                codigo,
                info: {
                  codigo_mipres: codigoResponse,
                  nombre_comercial: nombreFinal,
                  descripcion,
                  concentracion: asText(producto.concentracion),
                  forma: asText(producto.forma),
                }
              }
            }
            return null
          } catch (error) {
            return null
          }
        })

        const results = await Promise.all(promises)
        
        if (!active) return

        // Actualizar el mapa con los nuevos productos
        setProductos(prev => {
          const newMap = new Map(prev)
          results.forEach(result => {
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

    void loadProductos()

    return () => {
      active = false
      controller.abort()
    }
  }, [codigos.join(","), enabled])

  return {
    productos,
    loading,
    getNombreComercial: (codigo: string) => productos.get(codigo)?.nombre_comercial,
    getDescripcionPreferida: (codigo: string) => {
      const producto = productos.get(codigo)
      if (!producto) return undefined
      return producto.descripcion || producto.nombre_comercial
    },
    getProductoInfo: (codigo: string) => productos.get(codigo),
  }
}
