import { getRequiredEnv } from "@/lib/env"
import { Pool } from "undici"

const BASE_URL_TOKEN = getRequiredEnv("BASE_URL_TOKEN")

export const REPORTE_ENTREGA_ENDPOINTS = {
  // GET api/ReporteEntregaXFecha/{nit}/{token}/{fecha}
  reporteEntregaPorFecha: (nit: string, token: string, fecha: string) =>
    `${BASE_URL_TOKEN}/ReporteEntregaXFecha/${nit}/${token}/${fecha}`,

  // GET api/ReporteEntregaXPrescripcion/{nit}/{token}/{noPrescripcion}
  reporteEntregaPorPrescripcion: (nit: string, token: string, noPrescripcion: string) =>
    `${BASE_URL_TOKEN}/ReporteEntregaXPrescripcion/${nit}/${token}/${noPrescripcion}`,

  // GET api/ReporteEntregaXPacienteFecha/{nit}/{fecha}/{token}/{tipodoc}/{numdoc}
  reporteEntregaPorPaciente: (nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) =>
    `${BASE_URL_TOKEN}/ReporteEntregaXPacienteFecha/${nit}/${fecha}/${token}/${tipoDoc}/${numDoc}`,

  // PUT api/AnularReporteEntrega/{nit}/{token}/{IdReporteEntrega}
  anularReporteEntrega: (nit: string, token: string, idReporteEntrega: string) =>
    `${BASE_URL_TOKEN}/AnularReporteEntrega/${nit}/${token}/${idReporteEntrega}`,
}

export type TipoConsultaReporteEntrega = "fecha" | "prescripcion" | "paciente"

export interface ConsultaReporteEntregaParams {
  nit: string
  token: string
  tipo: TipoConsultaReporteEntrega
  fecha?: string
  tipoDoc?: string
  numDoc?: string
  noPrescripcion?: string
}

export function buildReporteEntregaUrl(params: ConsultaReporteEntregaParams): string {
  const { nit, token, tipo, fecha, tipoDoc, numDoc, noPrescripcion } = params

  switch (tipo) {
    case "fecha":
      if (!fecha) throw new Error("Fecha es requerida para consulta por fecha")
      return REPORTE_ENTREGA_ENDPOINTS.reporteEntregaPorFecha(nit, token, fecha)

    case "prescripcion":
      if (!noPrescripcion) throw new Error("Número de prescripción es requerido")
      return REPORTE_ENTREGA_ENDPOINTS.reporteEntregaPorPrescripcion(nit, token, noPrescripcion)

    case "paciente":
      if (!fecha || !tipoDoc || !numDoc) {
        throw new Error("Fecha, tipo y número de documento son requeridos para consulta por paciente")
      }
      return REPORTE_ENTREGA_ENDPOINTS.reporteEntregaPorPaciente(nit, fecha, token, tipoDoc, numDoc)

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

// GET ReporteEntrega por fecha
export async function fetchReporteEntregaPorFecha(nit: string, token: string, fecha: string) {
  const url = REPORTE_ENTREGA_ENDPOINTS.reporteEntregaPorFecha(nit, token, fecha)
  return requestToMipres(url)
}

// GET ReporteEntrega por prescripcion
export async function fetchReporteEntregaPorPrescripcion(nit: string, token: string, noPrescripcion: string) {
  const url = REPORTE_ENTREGA_ENDPOINTS.reporteEntregaPorPrescripcion(nit, token, noPrescripcion)
  return requestToMipres(url)
}

// GET ReporteEntrega por paciente
export async function fetchReporteEntregaPorPaciente(nit: string, fecha: string, token: string, tipoDoc: string, numDoc: string) {
  const url = REPORTE_ENTREGA_ENDPOINTS.reporteEntregaPorPaciente(nit, fecha, token, tipoDoc, numDoc)
  return requestToMipres(url)
}

// PUT Anular ReporteEntrega
export async function putAnularReporteEntrega(nit: string, token: string, idReporteEntrega: string) {
  const url = REPORTE_ENTREGA_ENDPOINTS.anularReporteEntrega(nit, token, idReporteEntrega)
  return requestToMipres(url, { method: "PUT" })
}
