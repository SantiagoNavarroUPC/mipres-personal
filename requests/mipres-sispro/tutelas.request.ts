import { getRequiredEnv } from "@/lib/env"

const BASE_URL = getRequiredEnv("BASE_URL")

// Endpoints disponibles
export const TUTELA_ENDPOINTS = {

  // 1. Tutelas por Fecha
  // GET api/Tutelas/{nit}/{fecha}/{token}
  tutelaPorFecha: (nit: string, fecha: string, token: string) => 
    `${BASE_URL}/Tutelas/${nit}/${fecha}/${token}`,

  // 2. Tutelas por Paciente
  // GET api/TutelaXPaciente/{nit}/{fecha}/{token}/{tipodoc}/{numdoc}
  tutelaPorPaciente: (nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) => 
    `${BASE_URL}/TutelaXPaciente/${nit}/${fecha}/${token}/${tipoDoc}/${numDoc}`,

  // 3. Tutelas por Número
  // GET api/TutelaXNumero/{nit}/{token}/{NoPresc}
  tutelaPorNumero: (nit: string, token: string, notutela: string) => 
    `${BASE_URL}/TutelaXNumero/${nit}/${token}/${notutela}`,

  // 4. Novedades de Tutelas
  // GET api/NovedadesTutelas/{nit}/{fecha}/{token}
  novedadesTutela: (nit: string, fecha: string, token: string) => 
    `${BASE_URL}/NovedadesTutelas/${nit}/${fecha}/${token}`,
}

// Tipos de consulta disponibles
export type TipoConsultaTutela = "fecha" | "paciente" | "numero" | "novedades" | "rango" | "paciente-rango"

// Interfaz para parámetros de consulta de tutelaes
export interface ConsultaTutelaParams {
  nit: string
  token: string // Token sin validar (UUID original)
  tipo: TipoConsultaTutela
  fecha?: string
  tipoDoc?: string
  numDoc?: string
  noTutela?: string
}

// NOTA: Tutelas usan el token sin validar (UUID original)
export function buildTutelaUrl(params: ConsultaTutelaParams): string {
  const { nit, token, tipo, fecha, tipoDoc, numDoc, noTutela } = params

  switch (tipo) {
    case "fecha":
      if (!fecha) throw new Error("Fecha es requerida para consulta por fecha")
      return TUTELA_ENDPOINTS.tutelaPorFecha(nit, fecha, token)

    case "paciente":
      if (!fecha || !tipoDoc || !numDoc) {
        throw new Error("Fecha, tipo y número de documento son requeridos para consulta por paciente")
      }
      return TUTELA_ENDPOINTS.tutelaPorPaciente(nit, fecha, token, tipoDoc, numDoc)

    case "numero":
      if (!noTutela) throw new Error("Número de Tutelas es requerido")
      return TUTELA_ENDPOINTS.tutelaPorNumero(nit, token, noTutela)

    case "novedades":
      if (!fecha) throw new Error("Fecha es requerida para consulta de novedades")
      return TUTELA_ENDPOINTS.novedadesTutela(nit, fecha, token)

    default:
      throw new Error("Tipo de consulta no válido")
  }
}

// Headers por defecto para las peticiones
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
}

/**
 * Hacer petición GET a MIPRES
 */
export async function fetchFromMipres<T>(urlString: string): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const maxRetries = 2
  const timeoutMs = 30000 // 30s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(urlString, {
        method: "GET",
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        try {
          const data = (await response.json()) as T
          return { success: true, data, status: response.status }
        } catch (err) {
          // podría no ser JSON
          const text = await response.text()
          return { success: true, data: (text as unknown as T), status: response.status }
        }
      } else {
        return { success: false, error: `Error HTTP ${response.status}`, status: response.status }
      }
    } catch (error: any) {
      const isTimeout = error?.name === "AbortError"
      const msg = isTimeout ? 'Connect timeout' : (error instanceof Error ? error.message : String(error))
      if (attempt < maxRetries) {
        const backoff = 1000 * (attempt + 1)
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }
      return { success: false, error: msg }
    }
  }

  return { success: false, error: 'Unknown error' }
}

/**
 * Consultar Tutelaes por fecha
 */
export async function fetchTutelasPorFecha(nit: string, fecha: string, token: string) {
  const url = TUTELA_ENDPOINTS.tutelaPorFecha(nit, fecha, token)
  return fetchFromMipres(url)
}

/**
 * Consultar Tutelaes por paciente
 */
export async function fetchTutelasPorPaciente(
  nit: string,
  fecha: string,
  token: string,
  tipoDoc: string,
  numDoc: string
) {
  const url = TUTELA_ENDPOINTS.tutelaPorPaciente(nit, fecha, token, tipoDoc, numDoc)
  return fetchFromMipres(url)
}

/**
 * Consultar Tutelaes por número
 */
export async function fetchTutelasPorNumero(nit: string, token: string, noTutela: string) {
  const url = TUTELA_ENDPOINTS.tutelaPorNumero(nit, token, noTutela)
  return fetchFromMipres(url)
}

/**
 * Consultar novedades de Tutelaes
 */
export async function fetchNovedadesTutelas(nit: string, fecha: string, token: string) {
  const url = TUTELA_ENDPOINTS.novedadesTutela(nit, fecha, token)
  return fetchFromMipres(url)
}
