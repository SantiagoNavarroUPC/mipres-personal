import { getRequiredEnv } from "@/lib/env"
import { Pool } from "undici"

const BASE_URL_TOKEN = getRequiredEnv("BASE_URL_TOKEN")

export const SUMINISTRO_ENDPOINTS = {
  // PUT api/Suministro/{nit}/{token}
  reporteSuministro: (nit: string, token: string) =>
    `${BASE_URL_TOKEN}/Suministro/${nit}/${token}`,

  // GET api/SuministroXFecha/{nit}/{token}/{fecha}
  suministroPorFecha: (nit: string, token: string, fecha: string) =>
    `${BASE_URL_TOKEN}/SuministroXFecha/${nit}/${token}/${fecha}`,

  // GET api/SuministroXPrescripcion/{nit}/{token}/{noPrescripcion}
  suministroPorPrescripcion: (nit: string, token: string, noPrescripcion: string) =>
    `${BASE_URL_TOKEN}/SuministroXPrescripcion/${nit}/${token}/${noPrescripcion}`,

  // GET api/SuministroXPacienteFecha/{nit}/{fecha}/{token}/{tipodoc}/{numdoc}
  suministroPorPaciente: (nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) =>
    `${BASE_URL_TOKEN}/SuministroXPacienteFecha/${nit}/${fecha}/${token}/${tipoDoc}/${numDoc}`,

  // PUT api/AnularSuministro/{nit}/{token}/{IdSuministro}
  anularSuministro: (nit: string, token: string, idSuministro: string) =>
    `${BASE_URL_TOKEN}/AnularSuministro/${nit}/${token}/${idSuministro}`,
}

export type TipoConsultaSuministro = "fecha" | "prescripcion" | "paciente"

export interface ConsultaSuministroParams {
  nit: string
  token: string
  tipo: TipoConsultaSuministro
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
        } catch (err) {
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

// PUT Reporte Suministro (Crear/Actualizar)
export async function putReporteSuministro(nit: string, token: string, data: any) {
  const url = SUMINISTRO_ENDPOINTS.reporteSuministro(nit, token)
  return requestToMipres(url, { method: "PUT", body: data })
}

// GET Suministro por fecha
export async function fetchSuministroPorFecha(nit: string, token: string, fecha: string) {
  const url = SUMINISTRO_ENDPOINTS.suministroPorFecha(nit, token, fecha)
  return requestToMipres(url)
}

// GET Suministro por prescripcion
export async function fetchSuministroPorPrescripcion(nit: string, token: string, noPrescripcion: string) {
  const url = SUMINISTRO_ENDPOINTS.suministroPorPrescripcion(nit, token, noPrescripcion)
  return requestToMipres(url)
}

// GET Suministro por paciente
export async function fetchSuministroPorPaciente(nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) {
  const url = SUMINISTRO_ENDPOINTS.suministroPorPaciente(nit, fecha, token, tipoDoc, numDoc)
  return requestToMipres(url)
}

// PUT Anular Suministro
export async function putAnularSuministro(nit: string, token: string, idSuministro: string) {
  const url = SUMINISTRO_ENDPOINTS.anularSuministro(nit, token, idSuministro)
  return requestToMipres(url, { method: "PUT" })
}
