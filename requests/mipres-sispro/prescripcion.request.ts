
import { getRequiredEnv } from "@/lib/env"

const BASE_URL = getRequiredEnv("BASE_URL")

// Endpoints disponibles
export const MIPRES_ENDPOINTS = {
  // 1. Prescripción por Fecha
  // GET api/Prescripcion/{nit}/{fecha}/{token}
  prescripcionPorFecha: (nit: string, fecha: string, token: string) => 
    `${BASE_URL}/Prescripcion/${nit}/${fecha}/${token}`,

  // 2. Prescripción por Paciente
  // GET api/PrescripcionPaciente/{nit}/{fecha}/{token}/{tipodoc}/{numdoc}
  prescripcionPorPaciente: (nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) => 
    `${BASE_URL}/PrescripcionPaciente/${nit}/${fecha}/${token}/${tipoDoc}/${numDoc}`,

  // 3. Prescripción por Número
  // GET api/PrescripcionXNumero/{nit}/{token}/{NoPresc}
  prescripcionPorNumero: (nit: string, token: string, noPrescripcion: string) => 
    `${BASE_URL}/PrescripcionXNumero/${nit}/${token}/${noPrescripcion}`,

  // 4. Novedades de Prescripción
  // GET api/NovedadesPrescripcion/{nit}/{fecha}/{token}
  novedadesPrescripcion: (nit: string, fecha: string, token: string) => 
    `${BASE_URL}/NovedadesPrescripcion/${nit}/${fecha}/${token}`,
}

// Tipos de consulta disponibles
export type TipoConsultaPrescripcion = "fecha" | "paciente" | "numero" | "novedades" | "rango" | "paciente-rango"

// Interfaz para parámetros de consulta de prescripciones
export interface ConsultaPrescripcionParams {
  nit: string
  token: string // Token sin validar (UUID original)
  tipo: TipoConsultaPrescripcion
  fecha?: string
  tipoDoc?: string
  numDoc?: string
  noPrescripcion?: string
}

// NOTA: Prescripciones usan el token sin validar (UUID original)
export function buildPrescripcionUrl(params: ConsultaPrescripcionParams): string {
  const { nit, token, tipo, fecha, tipoDoc, numDoc, noPrescripcion } = params

  switch (tipo) {
    case "fecha":
      if (!fecha) throw new Error("Fecha es requerida para consulta por fecha")
      return MIPRES_ENDPOINTS.prescripcionPorFecha(nit, fecha, token)

    case "paciente":
      if (!fecha || !tipoDoc || !numDoc) {
        throw new Error("Fecha, tipo y número de documento son requeridos para consulta por paciente")
      }
      return MIPRES_ENDPOINTS.prescripcionPorPaciente(nit, fecha, token, tipoDoc, numDoc)

    case "numero":
      if (!noPrescripcion) throw new Error("Número de prescripción es requerido")
      return MIPRES_ENDPOINTS.prescripcionPorNumero(nit, token, noPrescripcion)

    case "novedades":
      if (!fecha) throw new Error("Fecha es requerida para consulta de novedades")
      return MIPRES_ENDPOINTS.novedadesPrescripcion(nit, fecha, token)

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
 * Hacer petición GET a MIPRES usando undici Pool (mejor reutilización de conexiones)
 */
import { Pool } from "undici"

const poolCache = new Map<string, Pool>()

function getPool(origin: string) {
  if (poolCache.has(origin)) return poolCache.get(origin) as Pool
  const p = new Pool(origin, { connections: 4, pipelining: 1 })
  poolCache.set(origin, p)
  return p
}

export async function fetchFromMipres<T>(urlString: string): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const maxRetries = 2
  const timeoutMs = 30000 // 30s

  const url = new URL(urlString)
  const origin = `${url.protocol}//${url.host}`
  const path = `${url.pathname}${url.search}`
  const pool = getPool(origin)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { statusCode, body } = await pool.request({ path, method: "GET", headers: DEFAULT_HEADERS, bodyTimeout: timeoutMs, headersTimeout: 10000 })

      const text = await body.text()

      if (statusCode >= 200 && statusCode < 300) {
        try {
          const data = JSON.parse(text) as T
          return { success: true, data, status: statusCode }
        } catch (err) {
          // podría no ser JSON
          return { success: true, data: (text as unknown as T), status: statusCode }
        }
      } else {
        return { success: false, error: `Error HTTP ${statusCode}`, status: statusCode }
      }
    } catch (error: any) {
      const isTimeout = error && (error.name === 'TimeoutError' || error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.name === 'AbortError')
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
 * Consultar prescripciones por fecha
 */
export async function fetchPrescripcionesPorFecha(nit: string, fecha: string, token: string) {
  const url = MIPRES_ENDPOINTS.prescripcionPorFecha(nit, fecha, token)
  return fetchFromMipres(url)
}

/**
 * Consultar prescripciones por paciente
 */
export async function fetchPrescripcionesPorPaciente(
  nit: string,
  fecha: string,
  token: string,
  tipoDoc: string,
  numDoc: string
) {
  const url = MIPRES_ENDPOINTS.prescripcionPorPaciente(nit, fecha, token, tipoDoc, numDoc)
  return fetchFromMipres(url)
}

/**
 * Consultar prescripciones por número
 */
export async function fetchPrescripcionesPorNumero(nit: string, token: string, noPrescripcion: string) {
  const url = MIPRES_ENDPOINTS.prescripcionPorNumero(nit, token, noPrescripcion)
  return fetchFromMipres(url)
}

/**
 * Consultar novedades de prescripciones
 */
export async function fetchNovedadesPrescripciones(nit: string, fecha: string, token: string) {
  const url = MIPRES_ENDPOINTS.novedadesPrescripcion(nit, fecha, token)
  return fetchFromMipres(url)
}
