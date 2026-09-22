import type { MipresCredentials } from "@/models/credentials.model"
import {
  fetchReporteEntregaPorFecha,
  fetchReporteEntregaPorPaciente,
  fetchReporteEntregaPorPrescripcion,
  putAnularReporteEntrega,
  type TipoConsultaReporteEntrega,
} from "@/requests/mipres-sispro/reporte-entrega.request"
import {
  ejecutarConConcurrencia,
  generarRangoFechas,
  validarRangoFechas,
} from "../prescripcion-controller/prescripcion-procesos.controller"

function getTokenAcceso(credentials: MipresCredentials): string {
  // Priorizar los tokens específicos si están disponibles
  return credentials.tokenAcceso || credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo || ""
}

/**
 * Helper para extraer reportes de entrega de la respuesta raw
 */
function extractReportesEntrega(raw: any): any[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (raw.root && Array.isArray(raw.root)) return raw.root
  if (raw.reportes && Array.isArray(raw.reportes)) return raw.reportes
  return [raw]
}

/**
 * Consultar Reporte de Entrega por fecha
 */
export async function consultarReporteEntregaPorFecha(
  credentials: MipresCredentials,
  fecha: string
): Promise<{ success: boolean; data?: any[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await fetchReporteEntregaPorFecha(credentials.nit, getTokenAcceso(credentials), fecha)

    if (result.success && result.data) {
      const data = extractReportesEntrega(result.data)
      return { success: true, data }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar reportes de entrega",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de reportes de entrega",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Reporte de Entrega por prescripción
 */
export async function consultarReporteEntregaPorPrescripcion(
  credentials: MipresCredentials,
  noPrescripcion: string
): Promise<{ success: boolean; data?: any[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await fetchReporteEntregaPorPrescripcion(
      credentials.nit,
      getTokenAcceso(credentials),
      noPrescripcion
    )

    if (result.success && result.data) {
      const data = extractReportesEntrega(result.data)
      return { success: true, data }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar reportes de entrega",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de reportes de entrega",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Reporte de Entrega por paciente
 */
export async function consultarReporteEntregaPorPaciente(
  credentials: MipresCredentials,
  fecha: string,
  tipoDoc: string,
  numDoc: string
): Promise<{ success: boolean; data?: any[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await fetchReporteEntregaPorPaciente(
      credentials.nit,
      fecha,
      getTokenAcceso(credentials),
      tipoDoc,
      numDoc
    )

    if (result.success && result.data) {
      const data = extractReportesEntrega(result.data)
      return { success: true, data }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar reportes de entrega",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de reportes de entrega",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Reporte de Entrega por rango de fechas
 */
export async function consultarReporteEntregaPorRangoFechas(
  credentials: MipresCredentials,
  fechaInicio: string,
  fechaFin?: string,
  pacienteParams?: { tipoDoc: string; numDoc: string }
): Promise<{ success: boolean; data?: any[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    if (!fechaInicio && !fechaFin) {
      return {
        success: false,
        error: "Ingrese al menos una fecha (inicio o un rango completo)",
      }
    }

    const fechaParaBuscar = fechaInicio || fechaFin!
    const fechaFinalParaBuscar = fechaFin || fechaParaBuscar

    const validacion = validarRangoFechas(fechaParaBuscar, fechaFinalParaBuscar)
    if (!validacion.valid) {
      return {
        success: false,
        error: validacion.error,
      }
    }

    const fechasArray = generarRangoFechas(fechaParaBuscar, fechaFinalParaBuscar)

    const tareas = fechasArray.map((fecha) => {
      if (pacienteParams) {
        return () => consultarReporteEntregaPorPaciente(
          credentials,
          fecha,
          pacienteParams.tipoDoc,
          pacienteParams.numDoc
        )
      } else {
        return () => consultarReporteEntregaPorFecha(credentials, fecha)
      }
    })

    const resultados = await ejecutarConConcurrencia(tareas, 15)

    let allResults: any[] = []
    resultados.forEach((result) => {
      if (result.success && result.data) {
        allResults = [...allResults, ...result.data]
      }
    })

    if (allResults.length > 0) {
      return {
        success: true,
        data: allResults,
      }
    } else {
      return {
        success: false,
        error: "No se encontraron reportes de entrega en el rango especificado",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error al consultar reportes de entrega por rango de fechas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Anular Reporte de Entrega
 */
export async function anularReporteEntrega(
  credentials: MipresCredentials,
  idReporteEntrega: string
): Promise<{ success: boolean; data?: unknown; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await putAnularReporteEntrega(
      credentials.nit,
      getTokenAcceso(credentials),
      idReporteEntrega
    )

    if (result.success) {
      return { success: true, data: result.data }
    }

    return {
      success: false,
      error: result.error || "Error al anular reporte de entrega",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error al anular reporte de entrega",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Función genérica para consultar reportes de entrega
 */
export async function consultarReporteEntrega(
  credentials: MipresCredentials,
  tipo: TipoConsultaReporteEntrega,
  params: {
    fecha?: string
    tipoDoc?: string
    numDoc?: string
    noPrescripcion?: string
  }
): Promise<{ success: boolean; data?: any[]; error?: string; details?: string }> {
  switch (tipo) {
    case "fecha":
      if (!params.fecha) return { success: false, error: "Fecha es requerida" }
      return consultarReporteEntregaPorFecha(credentials, params.fecha)

    case "prescripcion":
      if (!params.noPrescripcion) return { success: false, error: "Número de prescripción es requerido" }
      return consultarReporteEntregaPorPrescripcion(credentials, params.noPrescripcion)

    case "paciente":
      if (!params.fecha || !params.tipoDoc || !params.numDoc) {
        return { success: false, error: "Fecha, tipo y número de documento son requeridos" }
      }
      return consultarReporteEntregaPorPaciente(
        credentials,
        params.fecha,
        params.tipoDoc,
        params.numDoc
      )

    default:
      return { success: false, error: "Tipo de consulta no válido" }
  }
}
