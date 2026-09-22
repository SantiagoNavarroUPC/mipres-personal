import { getRequiredEnv } from "@/lib/env"
import { Pool } from "undici"
import type {
  RegistrarDatosFacturadoRequest,
  RegistrarDatosFacturadoResponse,
} from "@/models/mipres-sispro/facturacion/facturacion"

const BASE_URL_FACTURACION = getRequiredEnv("BASE_URL_FACTURACION")

export const FACTURACION_ENDPOINTS = {
  // PUT api/DatosFacturados/{nit}/{token}
  putDatosFacturados: (nit: string, token: string) =>
    `${BASE_URL_FACTURACION}/DatosFacturados/${nit}/${token}`,

  // GET api/FacturacionXFecha/{nit}/{token}/{fecha}
  getFacturacionPorFecha: (nit: string, token: string, fecha: string) =>
    `${BASE_URL_FACTURACION}/FacturacionXFecha/${nit}/${token}/${fecha}`,

  // GET api/FacturacionXPrescripcion/{nit}/{token}/{noPrescripcion}
  getFacturacionPorPrescripcion: (nit: string, token: string, noPrescripcion: string) =>
    `${BASE_URL_FACTURACION}/FacturacionXPrescripcion/${nit}/${token}/${noPrescripcion}`,

  // GET api/DatosFacturadosxPrescripcion/{nit}/{token}/{noPrescripcion}
  getDatosFacturadosPorPrescripcion: (nit: string, token: string, noPrescripcion: string) =>
    `${BASE_URL_FACTURACION}/DatosFacturadosxPrescripcion/${nit}/${token}/${noPrescripcion}`,

  // PUT api/DatosFacturadosAnular/{nit}/{token}/{idDatosFacturado}
  putDatosFacturadosAnular: (nit: string, token: string, idDatosFacturado: string | number) =>
    `${BASE_URL_FACTURACION}/DatosFacturadosAnular/${nit}/${token}/${idDatosFacturado}`,
}

export type TipoConsultaFacturacion = "fecha" | "prescripcion" | "rango"

export interface ConsultaFacturacionParams {
  nit: string
  token: string
  tipo: TipoConsultaFacturacion
  fecha?: string
  noPrescripcion?: string
}

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
}

const poolCache = new Map<string, Pool>()

function getPool(origin: string): Pool {
  if (poolCache.has(origin)) return poolCache.get(origin) as Pool
  const p = new Pool(origin, { connections: 4, pipelining: 1 })
  poolCache.set(origin, p)
  return p
}

async function fetchFromFacturacion<T>(
  urlString: string
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const maxRetries = 2
  const timeoutMs = 30000

  const url = new URL(urlString)
  const origin = `${url.protocol}//${url.host}`
  const path = `${url.pathname}${url.search}`
  const pool = getPool(origin)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { statusCode, body } = await pool.request({
        path,
        method: "GET",
        headers: DEFAULT_HEADERS,
        bodyTimeout: timeoutMs,
        headersTimeout: 10000,
      })

      const text = await body.text()

      if (statusCode >= 200 && statusCode < 300) {
        try {
          const data = JSON.parse(text) as T
          return { success: true, data, status: statusCode }
        } catch {
          return { success: true, data: text as unknown as T, status: statusCode }
        }
      } else {
        return { success: false, error: `Error HTTP ${statusCode}`, status: statusCode }
      }
    } catch (error: any) {
      const isTimeout =
        error?.name === "TimeoutError" ||
        error?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error?.name === "AbortError"
      const msg = isTimeout ? "Connect timeout" : error instanceof Error ? error.message : String(error)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      return { success: false, error: msg }
    }
  }

  return { success: false, error: "Unknown error" }
}

async function putToFacturacion<T>(
  urlString: string,
  payload: unknown
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const maxRetries = 2
  const timeoutMs = 30000

  const url = new URL(urlString)
  const origin = `${url.protocol}//${url.host}`
  const path = `${url.pathname}${url.search}`
  const pool = getPool(origin)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const bodyStr = JSON.stringify(payload)
      const { statusCode, body } = await pool.request({
        path,
        method: "PUT",
        headers: DEFAULT_HEADERS,
        body: bodyStr,
        bodyTimeout: timeoutMs,
        headersTimeout: 10000,
      })

      const text = await body.text()

      if (statusCode >= 200 && statusCode < 300) {
        try {
          return { success: true, data: JSON.parse(text) as T, status: statusCode }
        } catch {
          return { success: true, data: text as unknown as T, status: statusCode }
        }
      }

      return { success: false, error: `Error HTTP ${statusCode}: ${text}`, status: statusCode }
    } catch (error: any) {
      const isTimeout =
        error?.name === "TimeoutError" ||
        error?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error?.name === "AbortError"
      const msg = isTimeout ? "Connect timeout" : error instanceof Error ? error.message : String(error)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      return { success: false, error: msg }
    }
  }

  return { success: false, error: "Unknown error" }
}

export async function fetchFacturacionPorFecha(nit: string, token: string, fecha: string) {
  return fetchFromFacturacion(FACTURACION_ENDPOINTS.getFacturacionPorFecha(nit, token, fecha))
}

export async function fetchFacturacionPorPrescripcion(nit: string, token: string, noPrescripcion: string) {
  return fetchFromFacturacion(FACTURACION_ENDPOINTS.getFacturacionPorPrescripcion(nit, token, noPrescripcion))
}

export async function fetchDatosFacturadosPorPrescripcion(nit: string, token: string, noPrescripcion: string) {
  return fetchFromFacturacion(FACTURACION_ENDPOINTS.getDatosFacturadosPorPrescripcion(nit, token, noPrescripcion))
}

export async function putDatosFacturados(
  nit: string,
  token: string,
  payload: RegistrarDatosFacturadoRequest
): Promise<{ success: boolean; data?: RegistrarDatosFacturadoResponse; error?: string }> {
  return putToFacturacion<RegistrarDatosFacturadoResponse>(
    FACTURACION_ENDPOINTS.putDatosFacturados(nit, token),
    payload
  )
}

export async function putAnularDatosFacturado(
  nit: string,
  token: string,
  idDatosFacturado: string | number
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return putToFacturacion<unknown>(
    FACTURACION_ENDPOINTS.putDatosFacturadosAnular(nit, token, idDatosFacturado),
    {}
  )
}
