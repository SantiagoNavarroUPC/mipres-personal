"use client"

import { useEffect, useMemo, useState } from "react"
import type { IpsProveedor } from "../types"

export function useIps(shouldLoad: boolean) {
  const [ips, setIps] = useState<IpsProveedor[]>([])
  const [ipsLoading, setIpsLoading] = useState(false)
  const [ipsError, setIpsError] = useState<string | null>(null)
  const [ipsQuery, setIpsQuery] = useState("")
  const [ipsSearch, setIpsSearch] = useState("")

  const filteredIps = useMemo(() => {
    const query = ipsSearch.trim().toLowerCase()
    // Si no hay búsqueda, retornar todos los IPS cargados
    if (!query) return ips
    // Si hay búsqueda, filtrar los resultados
    return ips.filter((item) => {
      return (
        item.nit.toLowerCase().includes(query) ||
        item.ips_nombre.toLowerCase().includes(query)
      )
    })
  }, [ips, ipsSearch])

  useEffect(() => {
    if (!shouldLoad || !ipsSearch.trim()) return
    const controller = new AbortController()
    let active = true

    const loadIps = async () => {
      setIpsLoading(true)
      setIpsError(null)
      try {
        const apiUrl = `/api/mipres/direccionamiento/ips?search=${encodeURIComponent(ipsSearch.trim())}`

        const response = await fetch(apiUrl, { signal: controller.signal })
        if (!response.ok) {
          throw new Error("No se pudo cargar IPS")
        }

        const data = (await response.json()) as any
        if (!active) return

        // La API devuelve { value: [...], Count: n }
        const ipsArray = Array.isArray(data) ? data : (data.value || [])

        const normalized = ipsArray
          .filter((item: { nit: any; ips_nombre: any }) => item?.nit && item?.ips_nombre)
          .map((item: { nit: any; ips: any; ips_nombre: any; direccion_sede: any; municipio_codigo: any; municipio_nombre: any }) => ({
            nit: String(item.nit),
            ips: String(item.ips || ""),
            ips_nombre: String(item.ips_nombre),
            direccion_sede: String(item.direccion_sede || ""),
            municipio_codigo: String(item.municipio_codigo || ""),
            municipio_nombre: String(item.municipio_nombre || ""),
            razon_social: String(item.ips_nombre), // Compatibilidad hacia atrás
          }))

        setIps(normalized)
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
        setIpsError("No se pudo cargar la lista de IPS")
      } finally {
        if (active) setIpsLoading(false)
      }
    }

    void loadIps()

    return () => {
      active = false
      controller.abort()
    }
  }, [shouldLoad, ipsSearch])

  return {
    ips,
    ipsLoading,
    ipsError,
    ipsQuery,
    setIpsQuery,
    ipsSearch,
    setIpsSearch,
    filteredIps,
  }
}
