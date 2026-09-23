import type { MipresCredentials } from "@/models/credentials.model"
import {
  fetchEntregaPorFecha,
  fetchEntregaPorPaciente,
  fetchEntregaPorPrescripcion,
  type TipoConsultaEntrega,
} from "@/requests/mipres-sispro/entrega.request"
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
 * Helper para extraer entregas de la respuesta raw
 */
function extractEntregas(raw: any): any[] {
  let items: any[] = []

  if (!raw) return []

  if (Array.isArray(raw)) {
    items = raw
  } else if (raw.root && Array.isArray(raw.root)) {
    items = raw.root
  } else if (raw.entregas && Array.isArray(raw.entregas)) {
    items = raw.entregas
  } else {
    items = [raw]
  }

  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      ID: item.ID || item.IDEntrega,
    }))
}

/**
 * Consultar Entrega por fecha
 */
export async function consultarEntregaPorFecha(
  credentials: MipresCredentials,
  fecha: string
): Promise<ControllerResult> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return { success: false, error: "NIT y token de acceso son requeridos" }
    }

    const result = await fetchEntregaPorFecha(credentials.nit, getTokenAcceso(credentials), fecha)

    if (result.success && result.data) {
      return { success: true, data: extractEntregas(result.data) }
    }

    return { success: false, error: result.error || "Error al consultar entregas" }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de entregas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Entrega por prescripción
 */
export async function consultarEntregaPorPrescripcion(
  credentials: MipresCredentials,
  noPrescripcion: string
): Promise<ControllerResult> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return { success: false, error: "NIT y token de acceso son requeridos" }
    }

    const result = await fetchEntregaPorPrescripcion(
      credentials.nit,
      getTokenAcceso(credentials),
      noPrescripcion
    )

    if (result.success && result.data) {
      return { success: true, data: extractEntregas(result.data) }
    }

    return { success: false, error: result.error || "Error al consultar entregas" }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de entregas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Entrega por paciente
 */
export async function consultarEntregaPorPaciente(
  credentials: MipresCredentials,
  fecha: string,
  tipoDoc: string,
  numDoc: string
): Promise<ControllerResult> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return { success: false, error: "NIT y token de acceso son requeridos" }
    }

    const result = await fetchEntregaPorPaciente(
      credentials.nit,
      fecha,
      getTokenAcceso(credentials),
      tipoDoc,
      numDoc
    )

    if (result.success && result.data) {
      return { success: true, data: extractEntregas(result.data) }
    }

    return { success: false, error: result.error || "Error al consultar entregas" }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de entregas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Entrega por rango de fechas (itera día a día)
 */
export async function consultarEntregaPorRangoFechas(
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
        return () => consultarEntregaPorPaciente(
          credentials,
          fecha,
          pacienteParams.tipoDoc,
          pacienteParams.numDoc
        )
      }
      return () => consultarEntregaPorFecha(credentials, fecha)
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

    return { success: false, error: "No se encontraron entregas en el rango especificado" }
  } catch (error) {
    return {
      success: false,
      error: "Error al consultar entregas por rango de fechas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Función genérica para consultar entregas
 */
export async function consultarEntrega(
  credentials: MipresCredentials,
  tipo: TipoConsultaEntrega,
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
      return consultarEntregaPorFecha(credentials, params.fecha)

    case "prescripcion":
      if (!params.noPrescripcion) return { success: false, error: "Número de prescripción es requerido" }
      return consultarEntregaPorPrescripcion(credentials, params.noPrescripcion)

    case "paciente":
      if (!params.fecha || !params.tipoDoc || !params.numDoc) {
        return { success: false, error: "Fecha, tipo y número de documento son requeridos" }
      }
      return consultarEntregaPorPaciente(credentials, params.fecha, params.tipoDoc, params.numDoc)

    default:
      return { success: false, error: "Tipo de consulta no válido" }
  }
}
