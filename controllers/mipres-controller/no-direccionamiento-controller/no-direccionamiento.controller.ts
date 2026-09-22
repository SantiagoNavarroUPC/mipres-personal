import type { MipresCredentials } from "@/models/credentials.model"
import type { NoDireccionamiento } from "@/models/mipres-sispro/no_direccionamiento/no_direccionamiento"
import {
  fetchNoDireccionamientoMany,
  fetchNoDireccionamientoPorFecha,
  fetchNoDireccionamientoPorPaciente,
  fetchNoDireccionamientoPorPrescripcion,
  putAnularNoDireccionamiento,
  putNoDireccionamiento,
  type TipoConsultaNoDireccionamiento,
} from "@/requests/mipres-sispro/no-direccionamiento.request"
import {
  combinarResultadosNoDireccionamientos,
  ejecutarPorChunks,
  generarRangoFechas,
  validarRangoFechas,
} from "./no-direccionamiento-procesos.controller"

function getTokenAcceso(credentials: MipresCredentials): string {
  return credentials.tokenAcceso || credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo || ""
}

function extractNoDireccionamientos(raw: any): NoDireccionamiento[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (raw.root && Array.isArray(raw.root)) return raw.root
  if (raw.noDireccionamientos && Array.isArray(raw.noDireccionamientos)) return raw.noDireccionamientos
  return [raw]
}

export async function registrarNoDireccionamiento(
  credentials: MipresCredentials,
  payload: unknown
): Promise<{ success: boolean; data?: unknown; error?: string; details?: string }> {
  try {
    const token = getTokenAcceso(credentials)

    if (!credentials.nit || !token) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await putNoDireccionamiento(credentials.nit, token, payload)

    if (result.success) {
      return { success: true, data: result.data }
    }

    return {
      success: false,
      error: result.error || "Error al registrar no direccionamiento",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en el registro de no direccionamiento",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function anularNoDireccionamiento(
  credentials: MipresCredentials,
  idNoDireccionamiento: string
): Promise<{ success: boolean; data?: unknown; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !credentials.tokenAcceso) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await putAnularNoDireccionamiento(credentials.nit, getTokenAcceso(credentials), idNoDireccionamiento)

    if (result.success) {
      return { success: true, data: result.data }
    }

    return {
      success: false,
      error: result.error || "Error al anular no direccionamiento",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error al anular no direccionamiento",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function consultarNoDireccionamientosPorFecha(
  credentials: MipresCredentials,
  fecha: string
): Promise<{ success: boolean; data?: NoDireccionamiento[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !credentials.tokenAcceso) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await fetchNoDireccionamientoPorFecha(credentials.nit, getTokenAcceso(credentials), fecha)

    if (result.success && result.data) {
      const data = extractNoDireccionamientos(result.data)
      return { success: true, data }
    }

    return {
      success: false,
      error: result.error || "Error al consultar no direccionamientos",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de no direccionamientos",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function consultarNoDireccionamientosPorRangoFechas(
  credentials: MipresCredentials,
  fechaInicio: string,
  fechaFin?: string
): Promise<{ success: boolean; data?: NoDireccionamiento[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !credentials.tokenAcceso) {
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
      return async () => {
        const result = await fetchNoDireccionamientoPorFecha(credentials.nit, getTokenAcceso(credentials), fecha)
        if (result.success && result.data) {
          return extractNoDireccionamientos(result.data)
        }
        return []
      }
    })

    const resultados = await ejecutarPorChunks(tareas, 15)
    const data = combinarResultadosNoDireccionamientos(resultados)

    if (data.length > 0) {
      return { success: true, data }
    }

    return {
      success: false,
      error: "No se encontraron no direccionamientos en el rango especificado",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error al consultar no direccionamientos por rango de fechas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function consultarNoDireccionamientosPorPrescripcion(
  credentials: MipresCredentials,
  noPrescripcion: string
): Promise<{ success: boolean; data?: NoDireccionamiento[]; error?: string; details?: string }> {
  try {
    const token = getTokenAcceso(credentials)
    
    if (!credentials.nit || !token) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await fetchNoDireccionamientoPorPrescripcion(credentials.nit, token, noPrescripcion)

    if (result.success && result.data) {
      const data = extractNoDireccionamientos(result.data)
      return { success: true, data }
    }

    return {
      success: false,
      error: result.error || "Error al consultar no direccionamientos",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de no direccionamientos",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function consultarNoDireccionamientosPorPaciente(
  credentials: MipresCredentials,
  fecha: string,
  tipoDoc: string,
  numDoc: string
): Promise<{ success: boolean; data?: NoDireccionamiento[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !credentials.tokenAcceso) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await fetchNoDireccionamientoPorPaciente(credentials.nit, fecha, getTokenAcceso(credentials), tipoDoc, numDoc)

    if (result.success && result.data) {
      const data = extractNoDireccionamientos(result.data)
      return { success: true, data }
    }

    return {
      success: false,
      error: result.error || "Error al consultar no direccionamientos",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de no direccionamientos",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function consultarNoDireccionamientosMany(
  credentials: MipresCredentials,
  payload: unknown
): Promise<{ success: boolean; data?: NoDireccionamiento[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !credentials.tokenAcceso) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await fetchNoDireccionamientoMany(credentials.nit, getTokenAcceso(credentials), payload)

    if (result.success && result.data) {
      const data = extractNoDireccionamientos(result.data)
      return { success: true, data }
    }

    return {
      success: false,
      error: result.error || "Error al consultar no direccionamientos",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de no direccionamientos",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function consultarNoDireccionamientos(
  credentials: MipresCredentials,
  tipo: TipoConsultaNoDireccionamiento,
  params: {
    fecha?: string
    fechaInicio?: string
    fechaFin?: string
    tipoDoc?: string
    numDoc?: string
    noPrescripcion?: string
  }
): Promise<{ success: boolean; data?: NoDireccionamiento[]; error?: string; details?: string }> {
  switch (tipo) {
    case "fecha":
      if (!params.fecha) return { success: false, error: "Fecha es requerida" }
      return consultarNoDireccionamientosPorFecha(credentials, params.fecha)

    case "rango":
      if (!params.fechaInicio) return { success: false, error: "fechaInicio es requerida" }
      return consultarNoDireccionamientosPorRangoFechas(credentials, params.fechaInicio, params.fechaFin)

    case "prescripcion":
      if (!params.noPrescripcion) return { success: false, error: "Número de prescripción es requerido" }
      return consultarNoDireccionamientosPorPrescripcion(credentials, params.noPrescripcion)

    case "paciente":
      if (!params.fecha || !params.tipoDoc || !params.numDoc) {
        return { success: false, error: "Fecha, tipo y número de documento son requeridos" }
      }
      return consultarNoDireccionamientosPorPaciente(credentials, params.fecha, params.tipoDoc, params.numDoc)

    default:
      return { success: false, error: "Tipo de consulta no válido" }
  }
}
