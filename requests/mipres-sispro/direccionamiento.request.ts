import { getRequiredEnv } from "@/lib/env"
import { Pool } from "undici"

const BASE_URL_TOKEN = getRequiredEnv("BASE_URL_TOKEN")

// Endpoints disponibles de Direccionamiento
export const DIRECCIONAMIENTO_ENDPOINTS = {
  // PUT api/Direccionamiento/{nit}/{token}
  putDireccionamiento: (nit: string, token: string) =>
    `${BASE_URL_TOKEN}/Direccionamiento/${nit}/${token}`,

  // GET api/DireccionamientoXFecha/{nit}/{token}/{fecha}
  direccionamientoPorFecha: (nit: string, token: string, fecha: string) =>
    `${BASE_URL_TOKEN}/DireccionamientoXFecha/${nit}/${token}/${fecha}`,

  // GET api/DireccionamientoXPrescripcion/{nit}/{token}/{noPrescripcion}
  direccionamientoPorPrescripcion: (nit: string, token: string, noPrescripcion: string) =>
    `${BASE_URL_TOKEN}/DireccionamientoXPrescripcion/${nit}/${token}/${noPrescripcion}`,

  // GET api/DireccionamientoXPacienteFecha/{nit}/{fecha}/{token}/{tipodoc}/{numdoc}
  direccionamientoPorPaciente: (nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) =>
    `${BASE_URL_TOKEN}/DireccionamientoXPacienteFecha/${nit}/${fecha}/${token}/${tipoDoc}/${numDoc}`,

  // PUT api/AnularDireccionamiento/{nit}/{token}/{IdDireccionamiento}
  anularDireccionamiento: (nit: string, token: string, idDireccionamiento: string) =>
    `${BASE_URL_TOKEN}/AnularDireccionamiento/${nit}/${token}/${idDireccionamiento}`,

  // POST api/DireccionamientoXMany/{nit}/{token}
  direccionamientoMany: (nit: string, token: string) =>
    `${BASE_URL_TOKEN}/DireccionamientoXMany/${nit}/${token}`,
}

export type TipoConsultaDireccionamiento = "fecha" | "prescripcion" | "paciente" | "rango"

export interface ConsultaDireccionamientoParams {
  nit: string
  token: string
  tipo: TipoConsultaDireccionamiento
  fecha?: string
  tipoDoc?: string
  numDoc?: string
  noPrescripcion?: string
}

export function buildDireccionamientoUrl(params: ConsultaDireccionamientoParams): string {
  const { nit, token, tipo, fecha, tipoDoc, numDoc, noPrescripcion } = params

  switch (tipo) {
    case "fecha":
      if (!fecha) throw new Error("Fecha es requerida para consulta por fecha")
      return DIRECCIONAMIENTO_ENDPOINTS.direccionamientoPorFecha(nit, token, fecha)

    case "prescripcion":
      if (!noPrescripcion) throw new Error("Número de prescripción es requerido")
      return DIRECCIONAMIENTO_ENDPOINTS.direccionamientoPorPrescripcion(nit, token, noPrescripcion)

    case "paciente":
      if (!fecha || !tipoDoc || !numDoc) {
        throw new Error("Fecha, tipo y número de documento son requeridos para consulta por paciente")
      }
      return DIRECCIONAMIENTO_ENDPOINTS.direccionamientoPorPaciente(nit, fecha, token, tipoDoc, numDoc)

    default:
      throw new Error("Tipo de consulta no válido")
  }
}

export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
}

const poolCache = new Map<string, Pool>()

function getPool(origin: string) {
  if (poolCache.has(origin)) return poolCache.get(origin) as Pool
  const p = new Pool(origin, { connections: 4, pipelining: 1 })
  poolCache.set(origin, p)
  return p
}

async function requestToMipres<T>(
  urlString: string,
  options?: {
    method?: "GET" | "PUT" | "POST"
    body?: unknown
    headers?: Record<string, string>
    retryOnNetworkError?: boolean
  }
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const timeoutMs = 30000
  const method = options?.method ?? "GET"
  const retryOnNetworkError = options?.retryOnNetworkError ?? method === "GET"
  const maxRetries = retryOnNetworkError ? 2 : 0

  const url = new URL(urlString)
  const origin = `${url.protocol}//${url.host}`
  const path = `${url.pathname}${url.search}`
  const pool = getPool(origin)

  const headers = { ...DEFAULT_HEADERS, ...(options?.headers ?? {}) }
  const body = method === "GET" || options?.body === undefined ? undefined : JSON.stringify(options.body)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { statusCode, body: responseBody } = await pool.request({
        path,
        method,
        headers,
        body,
        bodyTimeout: timeoutMs,
        headersTimeout: timeoutMs,
      })

      const text = await responseBody.text()

      if (statusCode >= 200 && statusCode < 300) {
        try {
          const data = JSON.parse(text) as T
          return { success: true, data, status: statusCode }
        } catch (err) {
          return { success: true, data: (text as unknown as T), status: statusCode }
        }
      } else {
        // Intentar parsear el error como JSON para obtener detalles
        try {
          const errorData = JSON.parse(text) as any
          let errorMessage = `Error HTTP ${statusCode}`
          
          // Manejar errores 422 de MIPRES con estructura específica
          if (statusCode === 422 && errorData.Errors && Array.isArray(errorData.Errors)) {
            errorMessage = errorData.Errors.join('\n')
            if (errorData.Message) {
              errorMessage = `${errorData.Message}\n${errorMessage}`
            }
          } else if (errorData.Message) {
            errorMessage = errorData.Message
          } else if (errorData.error) {
            errorMessage = errorData.error
          } else if (errorData.message) {
            errorMessage = errorData.message
          }
          
          return { success: false, error: errorMessage, status: statusCode, data: errorData }
        } catch {
          // Si no es JSON válido, retornar el texto plano
          return { success: false, error: text || `Error HTTP ${statusCode}`, status: statusCode }
        }
      }
    } catch (error: any) {
      const isTimeout = error && (error.name === "TimeoutError" || error.code === "UND_ERR_CONNECT_TIMEOUT" || error.name === "AbortError")
      const msg = isTimeout ? "Connect timeout" : (error instanceof Error ? error.message : String(error))
      if (attempt < maxRetries) {
        const backoff = 1000 * (attempt + 1)
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }
      return { success: false, error: msg }
    }
  }

  return { success: false, error: "Unknown error" }
}

// PUT Direccionamiento
export async function putDireccionamiento(nit: string, token: string, payload: unknown) {
  const url = DIRECCIONAMIENTO_ENDPOINTS.putDireccionamiento(nit, token)
  // Evita reintentos automáticos en creación para no duplicar registros ante timeouts.
  return requestToMipres(url, { method: "PUT", body: payload, retryOnNetworkError: false })
}

// PUT Anular Direccionamiento
export async function putAnularDireccionamiento(nit: string, token: string, idDireccionamiento: string) {
  const url = DIRECCIONAMIENTO_ENDPOINTS.anularDireccionamiento(nit, token, idDireccionamiento)
  return requestToMipres(url, { method: "PUT", retryOnNetworkError: false })
}

// GET Direccionamiento por fecha
export async function fetchDireccionamientoPorFecha(nit: string, token: string, fecha: string) {
  const url = DIRECCIONAMIENTO_ENDPOINTS.direccionamientoPorFecha(nit, token, fecha)
  return requestToMipres(url)
}

// GET Direccionamiento por prescripcion
export async function fetchDireccionamientoPorPrescripcion(nit: string, token: string, noPrescripcion: string) {
  const url = DIRECCIONAMIENTO_ENDPOINTS.direccionamientoPorPrescripcion(nit, token, noPrescripcion)
  return requestToMipres(url)
}

// GET Direccionamiento por paciente y fecha
export async function fetchDireccionamientoPorPaciente(
  nit: string,
  fecha: string,
  token: string,
  tipoDoc: string,
  numDoc: string
) {
  const url = DIRECCIONAMIENTO_ENDPOINTS.direccionamientoPorPaciente(nit, fecha, token, tipoDoc, numDoc)
  return requestToMipres(url)
}

// POST Direccionamiento por varios
export async function fetchDireccionamientoMany(nit: string, token: string, payload: unknown) {
  const url = DIRECCIONAMIENTO_ENDPOINTS.direccionamientoMany(nit, token)
  return requestToMipres(url, { method: "POST", body: payload, retryOnNetworkError: true })
}

