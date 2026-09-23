import { getRequiredEnv } from "@/lib/env"
import { Pool } from "undici"

const BASE_URL_TOKEN = getRequiredEnv("BASE_URL_TOKEN")

export const ENTREGA_ENDPOINTS = {
  // GET api/EntregaXFecha/{nit}/{token}/{fecha}
  entregaPorFecha: (nit: string, token: string, fecha: string) =>
    `${BASE_URL_TOKEN}/EntregaXFecha/${nit}/${token}/${fecha}`,

  // GET api/EntregaXPrescripcion/{nit}/{token}/{noPrescripcion}
  entregaPorPrescripcion: (nit: string, token: string, noPrescripcion: string) =>
    `${BASE_URL_TOKEN}/EntregaXPrescripcion/${nit}/${token}/${noPrescripcion}`,

  // GET api/EntregaXPacienteFecha/{nit}/{fecha}/{token}/{tipodoc}/{numdoc}
  entregaPorPaciente: (nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) =>
    `${BASE_URL_TOKEN}/EntregaXPacienteFecha/${nit}/${fecha}/${token}/${tipoDoc}/${numDoc}`,
}

export type TipoConsultaEntrega = "fecha" | "prescripcion" | "paciente"

export interface ConsultaEntregaParams {
  nit: string
  token: string
  tipo: TipoConsultaEntrega
  fecha?: string
  tipoDoc?: string
  numDoc?: string
  noPrescripcion?: string
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
      } else {
        // Intentar parsear el error como JSON para obtener detalles
        try {
          const errorData = JSON.parse(text) as any
          let errorMessage = `Error HTTP ${statusCode}`

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

// GET Entrega por fecha
export async function fetchEntregaPorFecha(nit: string, token: string, fecha: string) {
  const url = ENTREGA_ENDPOINTS.entregaPorFecha(nit, token, fecha)
  return requestToMipres(url)
}

// GET Entrega por prescripcion
export async function fetchEntregaPorPrescripcion(nit: string, token: string, noPrescripcion: string) {
  const url = ENTREGA_ENDPOINTS.entregaPorPrescripcion(nit, token, noPrescripcion)
  return requestToMipres(url)
}

// GET Entrega por paciente
export async function fetchEntregaPorPaciente(nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) {
  const url = ENTREGA_ENDPOINTS.entregaPorPaciente(nit, fecha, token, tipoDoc, numDoc)
  return requestToMipres(url)
}
