"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { Prescripcion } from "@/models/mipres-sispro/prescripcion"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento"
import type { NoDireccionamiento } from "@/models/mipres-sispro/no_direccionamiento/no_direccionamiento"
import type { ReporteEntrega } from "@/models/mipres-sispro/reporte-entrega/reporte-entrega"
import type { Suministro } from "@/models/mipres-sispro/suministro/suministro"
import type { Tutela } from "@/models/mipres-sispro/tutela/tutela"
import type { MipresCredentials } from "@/models/credentials.model"

interface ApiResponse<T> {
  success: boolean
  data?: T | T[]
  total?: number
  error?: string
  details?: string
}

/**
 * Deduplicar prescripciones sin alterar el regimen
 */
const deduplicatePrescriptions = (prescriptions: Prescripcion[]): Prescripcion[] => {
  const map = new Map<string, Prescripcion>()

  prescriptions.forEach((presc) => {
    const key = `${presc.NoPrescripcion || ""}-${presc.tipoRegimen || ""}`
    if (!map.has(key)) {
      map.set(key, presc)
    }
  })

  const result = Array.from(map.values())
  return result
}

/**
 * Deduplicar direccionamientos por tecnología + entrega dentro de la misma prescripción.
 * Regla de preferencia:
 * 1) Mantener vigente (sin FecAnulacion)
 * 2) Si ambos están en el mismo estado, mantener el más reciente
 */
const deduplicateDireccionamientos = (direccionamientos: Direccionamiento[]): Direccionamiento[] => {
  const map = new Map<string, Direccionamiento>()

  const toTimestamp = (value?: string): number => {
    if (!value) return 0
    const normalized = String(value).replace(" ", "T")
    const parsed = Date.parse(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const shouldReplace = (current: Direccionamiento, incoming: Direccionamiento): boolean => {
    const currentAnulado = Boolean(current?.FecAnulacion)
    const incomingAnulado = Boolean(incoming?.FecAnulacion)

    if (currentAnulado !== incomingAnulado) {
      return currentAnulado && !incomingAnulado
    }

    const currentTs = toTimestamp(current?.FecDireccionamiento)
    const incomingTs = toTimestamp(incoming?.FecDireccionamiento)
    if (incomingTs !== currentTs) {
      return incomingTs > currentTs
    }

    const currentId = Number(current?.IDDireccionamiento || 0)
    const incomingId = Number(incoming?.IDDireccionamiento || 0)
    return incomingId > currentId
  }

  direccionamientos.forEach((dir) => {
    const key = [
      dir?.NoPrescripcion || "",
      dir?.tipoRegimen || "",
      String(dir?.TipoTec || "").toUpperCase(),
      Number(dir?.ConTec || 0),
      Number(dir?.NoEntrega || 0),
    ].join("|")

    const existing = map.get(key)
    if (!existing || shouldReplace(existing, dir)) {
      map.set(key, dir)
    }
  })

  return Array.from(map.values())
}

/**
 * Hook para consultar prescripciones con caché de TanStack Query
 */
export function usePrescripciones(
  credentials: MipresCredentials,
  tipo: "fecha" | "paciente" | "numero" | "rango" | "paciente-rango",
  params: {
    fecha?: string
    fechaInicio?: string
    fechaFin?: string
    tipoDoc?: string
    numDoc?: string
    noPrescripcion?: string
  },
  enabled: boolean = true
) {
  // Generar clave única para la consulta
  const queryKey = [
    "prescripciones",
    credentials.nit,
    credentials.tokenSubsidiado,
    credentials.tokenContributivo,
    credentials.tokenAccesoSubsidiado,
    credentials.tokenAccesoContributivo,
    tipo,
    params,
  ]

  return useQuery({
    queryKey,
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        nit: credentials.nit,
        tokenSubsidiado: credentials.tokenSubsidiado || "",
        tokenContributivo: credentials.tokenContributivo || "",
        tokenAccesoSubsidiado: credentials.tokenAccesoSubsidiado || "",
        tokenAccesoContributivo: credentials.tokenAccesoContributivo || "",
        tipo,
        ...(params.fecha && { fecha: params.fecha }),
        ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
        ...(params.fechaFin && { fechaFin: params.fechaFin }),
        ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
        ...(params.numDoc && { numDoc: params.numDoc }),
        ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), (tipo === "rango" || tipo === "paciente-rango") ? 24 * 60 * 60 * 1000 : 30000)

      try {
        const response = await fetch(`/api/mipres/prescripciones?${queryParams.toString()}`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        
        const result: ApiResponse<Prescripcion> = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Error al consultar prescripciones")
        }

        // Normalizar resultados a array
        let prescriptions: Prescripcion[] = Array.isArray(result.data) 
          ? result.data 
          : result.data ? [result.data] : []
        
        // Deduplicar resultados
        prescriptions = deduplicatePrescriptions(prescriptions)
        
        return prescriptions
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos - más largo por dual queries
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 1, // Reintentar solo una vez
    retryDelay: 1000, // 1 segundo entre reintentos
  })
}

/**
 * Hook para consultar direccionamientos con caché de TanStack Query
 */
export function useDireccionamientos(
  credentials: MipresCredentials,
  tipo: "fecha" | "paciente" | "prescripcion" | "rango",
  params: {
    fecha?: string
    fechaInicio?: string
    fechaFin?: string
    tipoDoc?: string
    numDoc?: string
    noPrescripcion?: string
  },
  enabled: boolean = true
) {
  // Generar clave única para la consulta
  const queryKey = [
    "direccionamientos",
    credentials.nit,
    credentials.tokenAccesoSubsidiado,
    credentials.tokenAccesoContributivo,
    tipo,
    params,
  ]

  return useQuery({
    queryKey,
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        nit: credentials.nit,
        tokenSubsidiado: credentials.tokenSubsidiado || "",
        tokenContributivo: credentials.tokenContributivo || "",
        tokenAccesoSubsidiado: credentials.tokenAccesoSubsidiado || "",
        tokenAccesoContributivo: credentials.tokenAccesoContributivo || "",
        tipo,
        ...(params.fecha && { fecha: params.fecha }),
        ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
        ...(params.fechaFin && { fechaFin: params.fechaFin }),
        ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
        ...(params.numDoc && { numDoc: params.numDoc }),
        ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), tipo === "rango" ? 24 * 60 * 60 * 1000 : 30000)

      try {
        const response = await fetch(`/api/mipres/direccionamiento?${queryParams.toString()}`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        
        const result: ApiResponse<Direccionamiento> = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Error al consultar direccionamientos")
        }
        
        const direccionamientos: Direccionamiento[] = Array.isArray(result.data)
          ? result.data
          : result.data ? [result.data] : []

        return deduplicateDireccionamientos(direccionamientos)
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 1,
    retryDelay: 1000,
  })
}

export function useNoDireccionamientos(
  credentials: MipresCredentials,
  tipo: "fecha" | "paciente" | "prescripcion" | "rango",
  params: {
    fecha?: string
    fechaInicio?: string
    fechaFin?: string
    tipoDoc?: string
    numDoc?: string
    noPrescripcion?: string
  },
  enabled: boolean = true
) {
  const queryKey = [
    "no-direccionamientos",
    credentials.nit,
    credentials.tokenAccesoSubsidiado,
    credentials.tokenAccesoContributivo,
    tipo,
    params,
  ]

  return useQuery({
    queryKey,
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        nit: credentials.nit,
        tokenSubsidiado: credentials.tokenSubsidiado || "",
        tokenContributivo: credentials.tokenContributivo || "",
        tokenAccesoSubsidiado: credentials.tokenAccesoSubsidiado || "",
        tokenAccesoContributivo: credentials.tokenAccesoContributivo || "",
        tipo,
        ...(params.fecha && { fecha: params.fecha }),
        ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
        ...(params.fechaFin && { fechaFin: params.fechaFin }),
        ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
        ...(params.numDoc && { numDoc: params.numDoc }),
        ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), tipo === "rango" ? 24 * 60 * 60 * 1000 : 30000)

      try {
        const response = await fetch(`/api/mipres/no-direccionamiento?${queryParams.toString()}`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const result: ApiResponse<NoDireccionamiento> = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Error al consultar no direccionamientos")
        }

        let noDireccionamientos: NoDireccionamiento[] = Array.isArray(result.data)
          ? result.data
          : result.data ? [result.data] : []

        const map = new Map<string, NoDireccionamiento>()
        noDireccionamientos.forEach((item) => {
          const key = item.IDNODireccionamiento
            ? String(item.IDNODireccionamiento)
            : `${item.NoPrescripcion || ""}-${item.TipoTec || ""}-${item.ConTec || ""}`
          if (!map.has(key)) map.set(key, item)
        })

        return Array.from(map.values())
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  })
}

/**
 * Hook para consultar reportes de entrega
 */
export function useReportesEntrega(
  credentials: MipresCredentials,
  tipo: "fecha" | "paciente" | "prescripcion" | "rango",
  params: {
    fecha?: string
    fechaInicio?: string
    fechaFin?: string
    tipoDoc?: string
    numDoc?: string
    noPrescripcion?: string
  },
  enabled: boolean = true
) {
  const queryKey = [
    "reportes-entrega",
    credentials.nit,
    credentials.tokenAcceso,
    credentials.tokenAccesoSubsidiado,
    credentials.tokenAccesoContributivo,
    tipo,
    params,
  ]

  return useQuery({
    queryKey,
    queryFn: async () => {
      const tokenAcceso =
        credentials.tokenAcceso ||
        credentials.tokenAccesoSubsidiado ||
        credentials.tokenAccesoContributivo ||
        ""

      const queryParams = new URLSearchParams({
        nit: credentials.nit,
        tipo,
        ...(params.fecha && { fecha: params.fecha }),
        ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
        ...(params.fechaFin && { fechaFin: params.fechaFin }),
        ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
        ...(params.numDoc && { numDoc: params.numDoc }),
        ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
      })
      if (tokenAcceso) {
        queryParams.set("tokenAcceso", tokenAcceso)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), tipo === "rango" ? 24 * 60 * 60 * 1000 : 30000)

      try {
        const response = await fetch(`/api/mipres/reporte-entrega?${queryParams.toString()}`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const result: ApiResponse<ReporteEntrega> = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Error al consultar reportes de entrega")
        }

        let reportes: ReporteEntrega[] = Array.isArray(result.data)
          ? result.data
          : result.data ? [result.data] : []

        // Deduplicar por IDReporteEntrega si es necesario
        const map = new Map<string, ReporteEntrega>()
        reportes.forEach((rep) => {
          const key = rep.IDReporteEntrega
            ? String(rep.IDReporteEntrega)
            : `${rep.NoPrescripcion}-${rep.NoEntrega}`
          map.set(key, rep)
        })

        return Array.from(map.values())
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  })
}

/**
 * Hook para acceder al queryClient y ejecutar consultas manualmente
 */
export function useMipresQueryClient() {
  const queryClient = useQueryClient()

  return {
    /**
     * Ejecutar consulta de tutelas con caché automático
     */
    fetchTutelas: async (
      credentials: MipresCredentials,
      tipo: "fecha" | "paciente" | "numero" | "rango" | "novedades" | "paciente-rango",
      params: {
        fecha?: string
        fechaInicio?: string
        fechaFin?: string
        tipoDoc?: string
        numDoc?: string
        noTutela?: string
      }
    ): Promise<Tutela[] | any[]> => {
      const queryKey = [
        "tutelas",
        credentials.nit,
        credentials.tokenSubsidiado,
        credentials.tokenContributivo,
        credentials.tokenAccesoSubsidiado,
        credentials.tokenAccesoContributivo,
        tipo,
        params,
      ]

      return queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          const queryParams = new URLSearchParams({
            nit: credentials.nit,
            tokenSubsidiado: credentials.tokenSubsidiado || "",
            tokenContributivo: credentials.tokenContributivo || "",
            tokenAccesoSubsidiado: credentials.tokenAccesoSubsidiado || "",
            tokenAccesoContributivo: credentials.tokenAccesoContributivo || "",
            tipo,
            ...(params.fecha && { fecha: params.fecha }),
            ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
            ...(params.fechaFin && { fechaFin: params.fechaFin }),
            ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
            ...(params.numDoc && { numDoc: params.numDoc }),
            ...(params.noTutela && { noTutela: params.noTutela }),
          })

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), (tipo === "rango" || tipo === "paciente-rango") ? 24 * 60 * 60 * 1000 : 30000)

          try {
            const response = await fetch(`/api/mipres/tutelas?${queryParams.toString()}`, {
              signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const result: ApiResponse<Tutela> = await response.json()

            if (!result.success) {
              const e: any = new Error(result.error || "Error al consultar tutelas")
              e.details = result.details || null
              throw e
            }

            const data = Array.isArray(result.data)
              ? result.data
              : result.data
              ? [result.data]
              : []

            return data
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
      })
    },
    /**
     * Ejecutar consulta de prescripciones con caché automático
     */
    fetchPrescripciones: async (
      credentials: MipresCredentials,
      tipo: "fecha" | "paciente" | "numero" | "rango" | "paciente-rango",
      params: {
        fecha?: string
        fechaInicio?: string
        fechaFin?: string
        tipoDoc?: string
        numDoc?: string
        noPrescripcion?: string
      }
    ): Promise<Prescripcion[]> => {
      const queryKey = [
        "prescripciones",
        credentials.nit,
        credentials.tokenSubsidiado,
        credentials.tokenContributivo,
        credentials.tokenAccesoSubsidiado,
        credentials.tokenAccesoContributivo,
        tipo,
        params,
      ]

      return queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          const queryParams = new URLSearchParams({
            nit: credentials.nit,
            tokenSubsidiado: credentials.tokenSubsidiado || "",
            tokenContributivo: credentials.tokenContributivo || "",
            tokenAccesoSubsidiado: credentials.tokenAccesoSubsidiado || "",
            tokenAccesoContributivo: credentials.tokenAccesoContributivo || "",
            tipo,
            ...(params.fecha && { fecha: params.fecha }),
            ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
            ...(params.fechaFin && { fechaFin: params.fechaFin }),
            ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
            ...(params.numDoc && { numDoc: params.numDoc }),
            ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
          })

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), (tipo === "rango" || tipo === "paciente-rango") ? 24 * 60 * 60 * 1000 : 30000)

          try {
            const response = await fetch(`/api/mipres/prescripciones?${queryParams.toString()}`, {
              signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const result: ApiResponse<Prescripcion> = await response.json()

            if (!result.success) {
              const e: any = new Error(result.error || "Error al consultar prescripciones")
              e.details = result.details || null
              throw e
            }

            let prescriptions: Prescripcion[] = Array.isArray(result.data)
              ? result.data
              : result.data ? [result.data] : []
            
            prescriptions = deduplicatePrescriptions(prescriptions)
            return prescriptions
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
      })
    },

    /**
     * Ejecutar consulta de direccionamientos con caché automático
     */
    fetchDireccionamientos: async (
      credentials: MipresCredentials,
      tipo: "fecha" | "paciente" | "prescripcion" | "rango",
      params: {
        fecha?: string
        fechaInicio?: string
        fechaFin?: string
        tipoDoc?: string
        numDoc?: string
        noPrescripcion?: string
      }
    ): Promise<Direccionamiento[]> => {
      const queryKey = [
        "direccionamientos",
        credentials.nit,
        credentials.tokenAccesoSubsidiado,
        credentials.tokenAccesoContributivo,
        tipo,
        params,
      ]

      return queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          const queryParams = new URLSearchParams({
            nit: credentials.nit,
            tokenAccesoSubsidiado: credentials.tokenAccesoSubsidiado || "",
            tokenAccesoContributivo: credentials.tokenAccesoContributivo || "",
            tipo,
            ...(params.fecha && { fecha: params.fecha }),
            ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
            ...(params.fechaFin && { fechaFin: params.fechaFin }),
            ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
            ...(params.numDoc && { numDoc: params.numDoc }),
            ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
          })

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), tipo === "rango" ? 24 * 60 * 60 * 1000 : 30000)

          try {
            const response = await fetch(`/api/mipres/direccionamiento?${queryParams.toString()}`, {
              signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const result: ApiResponse<Direccionamiento> = await response.json()

            if (!result.success) {
              throw new Error(result.error || "Error al consultar direccionamientos")
            }

            const direccionamientos: Direccionamiento[] = Array.isArray(result.data)
              ? result.data
              : result.data ? [result.data] : []

            return deduplicateDireccionamientos(direccionamientos)
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
      })
    },

    fetchNoDireccionamientos: async (
      credentials: MipresCredentials,
      tipo: "fecha" | "paciente" | "prescripcion" | "rango",
      params: {
        fecha?: string
        fechaInicio?: string
        fechaFin?: string
        tipoDoc?: string
        numDoc?: string
        noPrescripcion?: string
      }
    ): Promise<NoDireccionamiento[]> => {
      const queryKey = [
        "no-direccionamientos",
        credentials.nit,
        credentials.tokenAccesoSubsidiado,
        credentials.tokenAccesoContributivo,
        tipo,
        params,
      ]

      return queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          const queryParams = new URLSearchParams({
            nit: credentials.nit,
            tokenSubsidiado: credentials.tokenSubsidiado || "",
            tokenContributivo: credentials.tokenContributivo || "",
            tokenAccesoSubsidiado: credentials.tokenAccesoSubsidiado || "",
            tokenAccesoContributivo: credentials.tokenAccesoContributivo || "",
            tipo,
            ...(params.fecha && { fecha: params.fecha }),
            ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
            ...(params.fechaFin && { fechaFin: params.fechaFin }),
            ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
            ...(params.numDoc && { numDoc: params.numDoc }),
            ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
          })

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), tipo === "rango" ? 24 * 60 * 60 * 1000 : 30000)

          try {
            const response = await fetch(`/api/mipres/no-direccionamiento?${queryParams.toString()}`, {
              signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const result: ApiResponse<NoDireccionamiento> = await response.json()

            if (!result.success) {
              throw new Error(result.error || "Error al consultar no direccionamientos")
            }

            let data: NoDireccionamiento[] = Array.isArray(result.data)
              ? result.data
              : result.data ? [result.data] : []

            const map = new Map<string, NoDireccionamiento>()
            data.forEach((item) => {
              const key = item.IDNODireccionamiento
                ? String(item.IDNODireccionamiento)
                : `${item.NoPrescripcion || ""}-${item.TipoTec || ""}-${item.ConTec || ""}`
              if (!map.has(key)) map.set(key, item)
            })

            return Array.from(map.values())
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
      })
    },

    fetchReportesEntrega: async (
      credentials: MipresCredentials,
      tipo: "fecha" | "paciente" | "prescripcion" | "rango",
      params: {
        fecha?: string
        fechaInicio?: string
        fechaFin?: string
        tipoDoc?: string
        numDoc?: string
        noPrescripcion?: string
      }
    ): Promise<ReporteEntrega[]> => {
      const queryKey = [
        "reportes-entrega",
        credentials.nit,
        credentials.tokenAcceso,
        credentials.tokenAccesoSubsidiado,
        credentials.tokenAccesoContributivo,
        tipo,
        params,
      ]

      return queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          const tokenAcceso =
            credentials.tokenAcceso ||
            credentials.tokenAccesoSubsidiado ||
            credentials.tokenAccesoContributivo ||
            ""

          const queryParams = new URLSearchParams({
            nit: credentials.nit,
            tipo,
            ...(params.fecha && { fecha: params.fecha }),
            ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
            ...(params.fechaFin && { fechaFin: params.fechaFin }),
            ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
            ...(params.numDoc && { numDoc: params.numDoc }),
            ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
          })
          if (tokenAcceso) {
            queryParams.set("tokenAcceso", tokenAcceso)
          }

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), tipo === "rango" ? 24 * 60 * 60 * 1000 : 30000)

          try {
            const response = await fetch(`/api/mipres/reporte-entrega?${queryParams.toString()}`, {
              signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const result: ApiResponse<ReporteEntrega> = await response.json()

            if (!result.success) {
              throw new Error(result.error || "Error al consultar reportes de entrega")
            }

            let reportes: ReporteEntrega[] = Array.isArray(result.data)
              ? result.data
              : result.data ? [result.data] : []

            const map = new Map<string, ReporteEntrega>()
            reportes.forEach((rep) => {
              const key = rep.IDReporteEntrega
                ? `${String(rep.IDReporteEntrega)}|${rep.TipoTec || ""}|${rep.ConTec ?? 0}`
                : `${rep.NoPrescripcion || ""}-${rep.TipoTec || ""}-${rep.ConTec ?? 0}-${rep.NoEntrega}`
              map.set(key, rep)
            })

            return Array.from(map.values())
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        retryDelay: 1000,
      })
    },

    fetchSuministros: async (
      credentials: MipresCredentials,
      tipo: "fecha" | "paciente" | "prescripcion" | "rango",
      params: {
        fecha?: string
        fechaInicio?: string
        fechaFin?: string
        tipoDoc?: string
        numDoc?: string
        noPrescripcion?: string
      }
    ): Promise<Suministro[]> => {
      const queryKey = [
        "suministros",
        credentials.nit,
        credentials.tokenAccesoSubsidiado,
        credentials.tokenAccesoContributivo,
        tipo,
        params,
      ]

      return queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          const queryParams = new URLSearchParams({
            nit: credentials.nit,
            tokenAccesoSubsidiado: credentials.tokenAccesoSubsidiado || "",
            tokenAccesoContributivo: credentials.tokenAccesoContributivo || "",
            tipo,
            ...(params.fecha && { fecha: params.fecha }),
            ...(params.fechaInicio && { fechaInicio: params.fechaInicio }),
            ...(params.fechaFin && { fechaFin: params.fechaFin }),
            ...(params.tipoDoc && { tipoDoc: params.tipoDoc }),
            ...(params.numDoc && { numDoc: params.numDoc }),
            ...(params.noPrescripcion && { noPrescripcion: params.noPrescripcion }),
          })

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), tipo === "rango" ? 24 * 60 * 60 * 1000 : 30000)

          try {
            const response = await fetch(`/api/mipres/suministro?${queryParams.toString()}`, {
              signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const result: ApiResponse<Suministro> = await response.json()

            if (!result.success) {
              throw new Error(result.error || "Error al consultar suministros")
            }

            let suministros: Suministro[] = Array.isArray(result.data)
              ? result.data
              : result.data ? [result.data] : []

            const map = new Map<string, Suministro>()
            suministros.forEach((sum) => {
              const key = sum.ID
                ? String(sum.ID)
                : `${sum.NoPrescripcionAsociada || ""}-${sum.ConTecAsociada || ""}`
              map.set(key, sum)
            })

            return Array.from(map.values())
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        retryDelay: 1000,
      })
    },

    invalidatePrescripciones: async (nit: string) => {
      await queryClient.invalidateQueries({
        queryKey: ["prescripciones", nit],
      })
    },

    /**
     * Invalidar todas las queries de direccionamientos para un NIT
     * Útil después de un POST/PUT para refrescar el caché
     */
    invalidateDireccionamientos: async (nit: string) => {
      await queryClient.invalidateQueries({
        queryKey: ["direccionamientos", nit],
      })
    },

    invalidateNoDireccionamientos: async (nit: string) => {
      await queryClient.invalidateQueries({
        queryKey: ["no-direccionamientos", nit],
      })
    },
    
    invalidateReportesEntrega: async (nit: string) => {
      await queryClient.invalidateQueries({
        queryKey: ["reportes-entrega", nit],
      })
    },
  }
}
