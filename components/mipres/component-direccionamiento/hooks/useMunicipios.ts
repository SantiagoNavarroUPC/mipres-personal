"use client"

import { useEffect, useMemo, useState } from "react"
import type { Municipio } from "../types"

export function useMunicipios(shouldLoad: boolean) {
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [municipiosLoading, setMunicipiosLoading] = useState(false)
  const [municipiosError, setMunicipiosError] = useState<string | null>(null)
  const [municipioQuery, setMunicipioQuery] = useState("")

  const municipioByCode = useMemo(() => {
    const map = new Map<string, string>()
    municipios.forEach((item) => {
      map.set(item.cod_mpio, item.nom_mpio)
    })
    return map
  }, [municipios])

  const filteredMunicipios = useMemo(() => {
    const query = municipioQuery.trim().toLowerCase()
    if (!query) return municipios
    return municipios.filter((item) => {
      return (
        item.cod_mpio.toLowerCase().includes(query) ||
        item.nom_mpio.toLowerCase().includes(query)
      )
    })
  }, [municipios, municipioQuery])

  useEffect(() => {
    if (!shouldLoad || municipios.length > 0) return
    const controller = new AbortController()
    let active = true

    const loadMunicipios = async () => {
      setMunicipiosLoading(true)
      setMunicipiosError(null)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_MUNICIPIOS_API_URL
        if (!apiUrl) {
          throw new Error("URL de API de municipios no configurada")
        }
        const response = await fetch(
          `${apiUrl}?$select=cod_mpio,nom_mpio&$limit=2000`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error("No se pudo cargar municipios")
        }

        const data = (await response.json()) as Municipio[]
        if (!active) return

        const normalized = data
          .filter((item) => item?.cod_mpio && item?.nom_mpio)
          .map((item) => ({
            cod_mpio: String(item.cod_mpio),
            nom_mpio: String(item.nom_mpio),
          }))

        setMunicipios(normalized)
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
        setMunicipiosError("No se pudo cargar la lista de municipios")
      } finally {
        if (active) setMunicipiosLoading(false)
      }
    }

    void loadMunicipios()

    return () => {
      active = false
      controller.abort()
    }
  }, [shouldLoad, municipios.length])

  return {
    municipios,
    municipiosLoading,
    municipiosError,
    municipioQuery,
    setMunicipioQuery,
    municipioByCode,
    filteredMunicipios,
  }
}
