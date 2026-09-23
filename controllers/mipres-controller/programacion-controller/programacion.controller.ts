import type { MipresCredentials } from "@/models/credentials.model"
import {
  fetchProgramacionPorFecha,
  fetchProgramacionPorPaciente,
  fetchProgramacionPorPrescripcion,
  type TipoConsultaProgramacion,
} from "@/requests/mipres-sispro/programacion.request"
import {
  ejecutarConConcurrencia,
  generarRangoFechas,
  validarRangoFechas,
} from "../prescripcion-controller/prescripcion-procesos.controller"

type ControllerResult = { success: boolean; data?: any[]; error?: string; details?: string }

function getTokenAcceso(credentials: MipresCredentials): string {
  // Priorizar los tokens específicos si están disponibles
  return credentials.tokenAcceso || credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo || ""
}

/**
 * Helper para extraer programaciones de la respuesta raw
 */
function extractProgramaciones(raw: any): any[] {
  let items: any[] = []

  if (!raw) return []

  if (Array.isArray(raw)) {
    items = raw
  } else if (raw.root && Array.isArray(raw.root)) {
    items = raw.root
  } else if (raw.programaciones && Array.isArray(raw.programaciones)) {
    items = raw.programaciones
  } else {
    items = [raw]
  }

  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      ID: item.ID || item.IDProgramacion,
    }))
}

/**
 * Consultar Programación por fecha
 */
export async function consultarProgramacionPorFecha(
  credentials: MipresCredentials,
  fecha: string
): Promise<ControllerResult> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return { success: false, error: "NIT y token de acceso son requeridos" }
    }

    const result = await fetchProgramacionPorFecha(credentials.nit, getTokenAcceso(credentials), fecha)

    if (result.success && result.data) {
      return { success: true, data: extractProgramaciones(result.data) }
    }

    return { success: false, error: result.error || "Error al consultar programaciones" }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de programaciones",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Programación por prescripción
 */
export async function consultarProgramacionPorPrescripcion(
  credentials: MipresCredentials,
  noPrescripcion: string
): Promise<ControllerResult> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return { success: false, error: "NIT y token de acceso son requeridos" }
    }

    const result = await fetchProgramacionPorPrescripcion(
      credentials.nit,
      getTokenAcceso(credentials),
      noPrescripcion
    )

    if (result.success && result.data) {
      return { success: true, data: extractProgramaciones(result.data) }
    }

    return { success: false, error: result.error || "Error al consultar programaciones" }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de programaciones",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Programación por paciente
 */
export async function consultarProgramacionPorPaciente(
  credentials: MipresCredentials,
  fecha: string,
  tipoDoc: string,
  numDoc: string
): Promise<ControllerResult> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return { success: false, error: "NIT y token de acceso son requeridos" }
    }

    const result = await fetchProgramacionPorPaciente(
      credentials.nit,
      fecha,
      getTokenAcceso(credentials),
      tipoDoc,
      numDoc
    )

    if (result.success && result.data) {
      return { success: true, data: extractProgramaciones(result.data) }
    }

    return { success: false, error: result.error || "Error al consultar programaciones" }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de programaciones",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Programación por rango de fechas (itera día a día)
 */
export async function consultarProgramacionPorRangoFechas(
  credentials: MipresCredentials,
  fechaInicio: string,
  fechaFin?: string,
  pacienteParams?: { tipoDoc: string; numDoc: string }
): Promise<ControllerResult> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return { success: false, error: "NIT y token de acceso son requeridos" }
    }

    if (!fechaInicio && !fechaFin) {
      return { success: false, error: "Ingrese al menos una fecha (inicio o un rango completo)" }
    }

    const fechaParaBuscar = fechaInicio || fechaFin!
    const fechaFinalParaBuscar = fechaFin || fechaParaBuscar

    const validacion = validarRangoFechas(fechaParaBuscar, fechaFinalParaBuscar)
    if (!validacion.valid) {
      return { success: false, error: validacion.error }
    }

    const fechasArray = generarRangoFechas(fechaParaBuscar, fechaFinalParaBuscar)

    const tareas = fechasArray.map((fecha) => {
      if (pacienteParams) {
        return () => consultarProgramacionPorPaciente(
          credentials,
          fecha,
          pacienteParams.tipoDoc,
          pacienteParams.numDoc
        )
      }
      return () => consultarProgramacionPorFecha(credentials, fecha)
    })

    const resultados = await ejecutarConConcurrencia(tareas, 15)

    const allResults: any[] = []
    resultados.forEach((result) => {
      if (result.success && result.data) {
        allResults.push(...result.data)
      }
    })

    if (allResults.length > 0) {
      return { success: true, data: allResults }
    }

    return { success: false, error: "No se encontraron programaciones en el rango especificado" }
  } catch (error) {
    return {
      success: false,
      error: "Error al consultar programaciones por rango de fechas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Función genérica para consultar programaciones
 */
export async function consultarProgramacion(
  credentials: MipresCredentials,
  tipo: TipoConsultaProgramacion,
  params: {
    fecha?: string
    tipoDoc?: string
    numDoc?: string
    noPrescripcion?: string
  }
): Promise<ControllerResult> {
  switch (tipo) {
    case "fecha":
      if (!params.fecha) return { success: false, error: "Fecha es requerida" }
      return consultarProgramacionPorFecha(credentials, params.fecha)

    case "prescripcion":
      if (!params.noPrescripcion) return { success: false, error: "Número de prescripción es requerido" }
      return consultarProgramacionPorPrescripcion(credentials, params.noPrescripcion)

    case "paciente":
      if (!params.fecha || !params.tipoDoc || !params.numDoc) {
        return { success: false, error: "Fecha, tipo y número de documento son requeridos" }
      }
      return consultarProgramacionPorPaciente(credentials, params.fecha, params.tipoDoc, params.numDoc)

    default:
      return { success: false, error: "Tipo de consulta no válido" }
  }
}
