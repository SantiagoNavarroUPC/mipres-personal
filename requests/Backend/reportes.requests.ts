import { getRequiredEnv } from "@/lib/env"

export type ReporteExcelTipo = "general" | "medicamento" | "producto-nutricional" | "servicio" | "detalle-mipres" | "estructura-giro" | "reserva-tecnica"

export interface ReporteExcelRequestParams {
	fechaInicio: string
	fechaFin?: string
	nitPrestador?: string
}

export interface ReporteExcelRequestResult {
	success: boolean
	status?: number
	data?: ArrayBuffer
	contentType?: string
	contentDisposition?: string
	error?: string
}

export interface ReporteDashboardItemRaw {
	tipo?: string
	total_prescripciones?: string | number
	total_direccionadas?: string | number
	total_no_direccionadas?: string | number
	total_sin_proceso?: string | number
	total_reportadas?: string | number
	total_reportadas_incompletas?: string | number
	total_suministradas?: string | number
	total_suministradas_incompletas?: string | number
}

export interface ReporteDashboardRequestResult {
	success: boolean
	status?: number
	data?: ReporteDashboardItemRaw[]
	error?: string
}

const DUSAKAWI_API_URL = getRequiredEnv("DUSAKAWI_API_URL").trim()

const REPORTES_ENDPOINTS: Record<ReporteExcelTipo, string> = {
	general: "/api/reportes/general/excel",
	medicamento: "/api/reportes/medicamento/excel",
	"producto-nutricional": "/api/reportes/producto-nutricional/excel",
	servicio: "/api/reportes/servicio/excel",
	"detalle-mipres": "/api/reportes/detalle-mipres/excel",
	"estructura-giro": "/api/reportes/facturas-mipres/excel",
	"reserva-tecnica": "/api/reportes/reserva-tecnica/excel",
}

function buildAuthHeader(authToken?: string): Record<string, string> {
	const token = String(authToken ?? "").trim()
	if (!token) return {}

	const normalized = token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`
	return { Authorization: normalized }
}

async function readErrorMessage(response: Response): Promise<string> {
	const raw = await response.text()
	if (!raw) return `HTTP ${response.status}`

	try {
		const parsed = JSON.parse(raw) as { error?: string; message?: string; details?: string }
		return parsed.error || parsed.message || parsed.details || `HTTP ${response.status}`
	} catch {
		return raw
	}
}

export async function descargarReporteExcelRequest(
	tipo: ReporteExcelTipo,
	params: ReporteExcelRequestParams,
	authToken?: string
): Promise<ReporteExcelRequestResult> {
	const endpointPath = REPORTES_ENDPOINTS[tipo]
	const endpoint = `${DUSAKAWI_API_URL}${endpointPath}`

	const url = new URL(endpoint)
	url.searchParams.set("fecha_inicio", params.fechaInicio)
	url.searchParams.set("fecha_fin", params.fechaFin || params.fechaInicio)
	if (params.nitPrestador?.trim()) url.searchParams.set("nit_prestador", params.nitPrestador.trim())

	try {
		const response = await fetch(url.toString(), {
			method: "GET",
			headers: {
				Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream",
				...buildAuthHeader(authToken),
			},
		})

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				error: await readErrorMessage(response),
			}
		}

		const data = await response.arrayBuffer()

		return {
			success: true,
			status: response.status,
			data,
			contentType: response.headers.get("content-type") || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			contentDisposition: response.headers.get("content-disposition") || undefined,
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido al descargar reporte",
		}
	}
}

function getDashboardList(payload: unknown): ReporteDashboardItemRaw[] {
	if (Array.isArray(payload)) return payload as ReporteDashboardItemRaw[]

	if (payload && typeof payload === "object") {
		const asObj = payload as { data?: unknown }
		if (Array.isArray(asObj.data)) return asObj.data as ReporteDashboardItemRaw[]
	}

	return []
}

export async function obtenerDashboardRequest(
	params: ReporteExcelRequestParams,
	authToken?: string
): Promise<ReporteDashboardRequestResult> {
	const endpoint = `${DUSAKAWI_API_URL}/api/reportes/dashboard`
	const url = new URL(endpoint)
	url.searchParams.set("fecha_inicio", params.fechaInicio)
	url.searchParams.set("fecha_fin", params.fechaFin || params.fechaInicio)

	try {
		const response = await fetch(url.toString(), {
			method: "GET",
			headers: {
				Accept: "application/json",
				...buildAuthHeader(authToken),
			},
			cache: "no-store",
		})

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				error: await readErrorMessage(response),
			}
		}

		const payload = (await response.json()) as unknown

		return {
			success: true,
			status: response.status,
			data: getDashboardList(payload),
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido al consultar dashboard",
		}
	}
}
