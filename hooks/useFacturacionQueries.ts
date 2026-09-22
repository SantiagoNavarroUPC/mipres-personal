"use client"

import { useQuery } from "@tanstack/react-query"
import type { MipresCredentials } from "@/models/credentials.model"
import type { Facturacion } from "@/models/mipres-sispro/facturacion/facturacion"
import type { TipoConsultaFacturacion } from "@/requests/mipres-sispro/facturacion.request"

interface ApiResponse<T> {
  success: boolean
  data?: T | T[]
  total?: number
  error?: string
}

export function useFacturaciones(
  credentials: MipresCredentials,
  tipo: TipoConsultaFacturacion,
  params: { fecha?: string; fechaInicio?: string; fechaFin?: string; noPrescripcion?: string },
  enabled: boolean = true
) {
  const queryKey = [
    "facturaciones",
    credentials.nit,
    credentials.tokenAcceso,
    credentials.tokenAccesoSubsidiado,
    credentials.tokenAccesoContributivo,
    tipo,
    params,
  ]

  const isRango = tipo === "rango"

  return useQuery<Facturacion[]>({
    queryKey,
    queryFn: async () => {
      const token =
        credentials.tokenAcceso ||
        credentials.tokenAccesoSubsidiado ||
        credentials.tokenAccesoContributivo ||
        ""

      const queryParams = new URLSearchParams({ nit: credentials.nit, tipo })
      if (token) queryParams.set("tokenAcceso", token)
      if (params.fecha) queryParams.set("fecha", params.fecha)
      if (params.fechaInicio) queryParams.set("fechaInicio", params.fechaInicio)
      if (params.fechaFin) queryParams.set("fechaFin", params.fechaFin)
      if (params.noPrescripcion) queryParams.set("noPrescripcion", params.noPrescripcion)

      const timeoutMs = isRango ? 24 * 60 * 60 * 1000 : 30_000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(`/api/mipres/facturacion?${queryParams.toString()}`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const result: ApiResponse<Facturacion> = await response.json()
        if (!result.success) throw new Error(result.error || "Error al consultar facturación")

        return Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: isRango ? 0 : 1,
    retryDelay: 1000,
  })
}
