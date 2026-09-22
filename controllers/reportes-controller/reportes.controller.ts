import {
  descargarReporteExcelRequest,
  obtenerDashboardRequest,
  type ReporteDashboardItemRaw,
  type ReporteExcelTipo,
} from "@/requests/Backend/reportes.requests"

export interface ReporteExcelControllerResult {
  success: boolean
  status?: number
  data?: ArrayBuffer
  contentType?: string
  contentDisposition?: string
  error?: string
}

export interface ReporteDashboardItem {
  tipo: string
  total_prescripciones: number
  total_direccionadas: number
  total_no_direccionadas: number
  total_sin_proceso: number
  total_reportadas: number
  total_reportadas_incompletas: number
  total_suministradas: number
  total_suministradas_incompletas: number
}

export interface ReporteDashboardControllerResult {
  success: boolean
  status?: number
  data?: ReporteDashboardItem[]
  error?: string
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

function toSafeNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeDashboardItem(raw: ReporteDashboardItemRaw): ReporteDashboardItem {
  return {
    tipo: String(raw.tipo || "SIN_TIPO").trim() || "SIN_TIPO",
    total_prescripciones: toSafeNumber(raw.total_prescripciones),
    total_direccionadas: toSafeNumber(raw.total_direccionadas),
    total_no_direccionadas: toSafeNumber(raw.total_no_direccionadas),
    total_sin_proceso: toSafeNumber(raw.total_sin_proceso),
    total_reportadas: toSafeNumber(raw.total_reportadas),
    total_reportadas_incompletas: toSafeNumber(raw.total_reportadas_incompletas),
    total_suministradas: toSafeNumber(raw.total_suministradas),
    total_suministradas_incompletas: toSafeNumber(raw.total_suministradas_incompletas),
  }
}

export async function descargarReporteExcelController(
  tipo: ReporteExcelTipo,
  fechaInicio: string,
  fechaFin?: string,
  authToken?: string,
  nitPrestador?: string
): Promise<ReporteExcelControllerResult> {
  const inicio = String(fechaInicio || "").trim()
  const fin = String(fechaFin || "").trim() || inicio

  if (!inicio) {
    return {
      success: false,
      status: 400,
      error: "fechaInicio es requerida",
    }
  }

  const requestResult = await descargarReporteExcelRequest(
    tipo,
    { fechaInicio: inicio, fechaFin: fin, nitPrestador },
    authToken
  )

  if (!requestResult.success || !requestResult.data) {
    return {
      success: false,
      status: requestResult.status || 500,
      error: requestResult.error || "No se pudo descargar el reporte",
    }
  }

  const fallbackName = sanitizeFilename(`reporte-${tipo}-${inicio}-${fin}.xlsx`)

  return {
    success: true,
    status: requestResult.status || 200,
    data: requestResult.data,
    contentType:
      requestResult.contentType ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentDisposition:
      requestResult.contentDisposition || `attachment; filename="${fallbackName}"`,
  }
}

export async function obtenerDashboardReportesController(
  fechaInicio: string,
  fechaFin?: string,
  authToken?: string
): Promise<ReporteDashboardControllerResult> {
  const inicio = String(fechaInicio || "").trim()
  const fin = String(fechaFin || "").trim() || inicio

  if (!inicio) {
    return {
      success: false,
      status: 400,
      error: "fechaInicio es requerida",
    }
  }

  const requestResult = await obtenerDashboardRequest(
    { fechaInicio: inicio, fechaFin: fin },
    authToken
  )

  if (!requestResult.success || !requestResult.data) {
    return {
      success: false,
      status: requestResult.status || 500,
      error: requestResult.error || "No se pudo consultar el dashboard",
    }
  }

  return {
    success: true,
    status: requestResult.status || 200,
    data: requestResult.data.map(normalizeDashboardItem),
  }
}
