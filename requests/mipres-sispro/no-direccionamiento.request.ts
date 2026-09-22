import { getRequiredEnv } from "@/lib/env"
import { Pool } from "undici"

const BASE_URL_TOKEN = getRequiredEnv("BASE_URL_TOKEN")

// Endpoints disponibles de Direccionamiento
export const NODIRECCIONAMIENTO_ENDPOINTS = {


  putNoDireccionamiento: (nit: string, token: string) =>
    `${BASE_URL_TOKEN}/NODireccionamiento/${nit}/${token}`,

  // GET api/NODireccionamientoXFecha/{nit}/{token}/{fecha}
  nodireccionamientoPorFecha: (nit: string, token: string, fecha: string) =>
    `${BASE_URL_TOKEN}/NODireccionamientoXFecha/${nit}/${token}/${fecha}`,

  // GET api/NODireccionamientoXPrescripcion/{nit}/{token}/{noPrescripcion}
  nodireccionamientoPorPrescripcion: (nit: string, token: string, noPrescripcion: string) =>
    `${BASE_URL_TOKEN}/NODireccionamientoXPrescripcion/${nit}/${token}/${noPrescripcion}`,

  // GET api/NODireccionamientoXPacienteFecha/{nit}/{fecha}/{token}/{tipodoc}/{numdoc}
  nodireccionamientoPorPaciente: (nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) =>
    `${BASE_URL_TOKEN}/NODireccionamientoXPacienteFecha/${nit}/${fecha}/${token}/${tipoDoc}/${numDoc}`,

  // PUT api/AnularNoDireccionamiento/{nit}/{token}/{IdNoDireccionamiento}
  anularNoDireccionamiento: (nit: string, token: string, idNoDireccionamiento: string) =>
    `${BASE_URL_TOKEN}/AnularNODireccionamiento/${nit}/${token}/${idNoDireccionamiento}`,

  // POST api/NODireccionamientoXMany/{nit}/{token}
  nodireccionamientoMany: (nit: string, token: string) =>
    `${BASE_URL_TOKEN}/NODireccionamientoXMany/${nit}/${token}`,
}

export type TipoConsultaNoDireccionamiento = "fecha" | "prescripcion" | "paciente" | "rango"

export interface ConsultaNoDireccionamientoParams {
  nit: string
  token: string
  tipo: TipoConsultaNoDireccionamiento
  fecha?: string
  tipoDoc?: string
  numDoc?: string
  noPrescripcion?: string
}

export function buildNoDireccionamientoUrl(params: ConsultaNoDireccionamientoParams): string {
  const { nit, token, tipo, fecha, tipoDoc, numDoc, noPrescripcion } = params

  switch (tipo) {
    case "fecha":
      if (!fecha) throw new Error("Fecha es requerida para consulta por fecha")
      return NODIRECCIONAMIENTO_ENDPOINTS.nodireccionamientoPorFecha(nit, token, fecha)

    case "prescripcion":
      if (!noPrescripcion) throw new Error("Número de prescripción es requerido")
      return NODIRECCIONAMIENTO_ENDPOINTS.nodireccionamientoPorPrescripcion(nit, token, noPrescripcion)

    case "paciente":
      if (!fecha || !tipoDoc || !numDoc) {
        throw new Error("Fecha, tipo y número de documento son requeridos para consulta por paciente")
      }
      return NODIRECCIONAMIENTO_ENDPOINTS.nodireccionamientoPorPaciente(nit, fecha, token, tipoDoc, numDoc)

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
  options?: { method?: "GET" | "PUT" | "POST"; body?: unknown; headers?: Record<string, string> }
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const maxRetries = 2
  const timeoutMs = 30000
  const method = options?.method ?? "GET"

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
        headersTimeout: 10000,
      })

      const text = await responseBody.text()

      if (statusCode >= 200 && statusCode < 300) {
        try {
          const data = JSON.parse(text) as T
          return { success: true, data, status: statusCode }
        } catch {
          return { success: true, data: (text as unknown as T), status: statusCode }
        }
      }

      try {
        const errorData = JSON.parse(text) as any
        let errorMessage = `Error HTTP ${statusCode}`

        if (statusCode === 422 && errorData.Errors && Array.isArray(errorData.Errors)) {
          errorMessage = errorData.Errors.join("\n")
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
        return { success: false, error: text || `Error HTTP ${statusCode}`, status: statusCode }
      }
    } catch (error: any) {
      const isTimeout =
        error &&
        (error.name === "TimeoutError" || error.code === "UND_ERR_CONNECT_TIMEOUT" || error.name === "AbortError")
      const msg = isTimeout ? "Connect timeout" : error instanceof Error ? error.message : String(error)
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

export async function putNoDireccionamiento(nit: string, token: string, payload: unknown) {
  const url = NODIRECCIONAMIENTO_ENDPOINTS.putNoDireccionamiento(nit, token)
  return requestToMipres(url, { method: "PUT", body: payload })
}

export async function putAnularNoDireccionamiento(nit: string, token: string, idNoDireccionamiento: string) {
  const url = NODIRECCIONAMIENTO_ENDPOINTS.anularNoDireccionamiento(nit, token, idNoDireccionamiento)
  return requestToMipres(url, { method: "PUT" })
}

export async function fetchNoDireccionamientoPorFecha(nit: string, token: string, fecha: string) {
  const url = NODIRECCIONAMIENTO_ENDPOINTS.nodireccionamientoPorFecha(nit, token, fecha)
  return requestToMipres(url)
}

export async function fetchNoDireccionamientoPorPrescripcion(nit: string, token: string, noPrescripcion: string) {
  const url = NODIRECCIONAMIENTO_ENDPOINTS.nodireccionamientoPorPrescripcion(nit, token, noPrescripcion)
  return requestToMipres(url)
}

export async function fetchNoDireccionamientoPorPaciente(
  nit: string,
  fecha: string,
  token: string,
  tipoDoc: string,
  numDoc: string
) {
  const url = NODIRECCIONAMIENTO_ENDPOINTS.nodireccionamientoPorPaciente(nit, fecha, token, tipoDoc, numDoc)
  return requestToMipres(url)
}

export async function fetchNoDireccionamientoMany(nit: string, token: string, payload: unknown) {
  const url = NODIRECCIONAMIENTO_ENDPOINTS.nodireccionamientoMany(nit, token)
  return requestToMipres(url, { method: "POST", body: payload })
}