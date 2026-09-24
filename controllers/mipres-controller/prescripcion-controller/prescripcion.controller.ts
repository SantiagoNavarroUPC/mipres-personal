import type { Prescripcion, NovedadPrescripcion } from "@/models/mipres-sispro/prescripcion"
import type { MipresCredentials } from "@/models/credentials.model"
import {
  fetchPrescripcionesPorFecha,
  fetchPrescripcionesPorPaciente,
  fetchPrescripcionesPorNumero,
  fetchNovedadesPrescripciones,
  type TipoConsultaPrescripcion,
} from "@/requests/mipres-sispro/prescripcion.request"
import { fetchIpsByNit } from "@/requests/Backend/ips.request"
import {
  extractPrescripciones,
  extractNovedades,
  generarRangoFechas,
  ejecutarPorChunks,
  ejecutarConConcurrencia,
  validarRangoFechas,
} from "./prescripcion-procesos.controller"
import { fetchDireccionamientoPorPrescripcion } from "@/requests/mipres-sispro/direccionamiento.request"

function getTokenRaw(credentials: MipresCredentials): string {
  return credentials.tokenSubsidiado || credentials.tokenContributivo || ""
}

/**
 * Consultar prescripciones por fecha
 */
export async function consultarPrescripcionesPorFecha(
  credentials: MipresCredentials,
  fecha: string
): Promise<{ success: boolean; data?: Prescripcion[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenRaw(credentials)) {
      return {
        success: false,
        error: "NIT y Token (sin validar) son requeridos",
      }
    }

    if (!credentials.tokenAcceso) {
      return {
        success: false,
        error: "Token validado es requerido",
      }
    }

    const result = await fetchPrescripcionesPorFecha(credentials.nit, fecha, getTokenRaw(credentials))

    if (result.success && result.data) {
      const data = await marcarIpsSolicitante(await marcarDireccionamientos(credentials, extractPrescripciones(result.data)))
      return {
        success: true,
        data,
      }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar prescripciones",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de prescripciones",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar prescripciones por paciente
 */
export async function consultarPrescripcionesPorPaciente(
  credentials: MipresCredentials,
  fecha: string,
  tipoDoc: string,
  numDoc: string
): Promise<{ success: boolean; data?: Prescripcion[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenRaw(credentials)) {
      return {
        success: false,
        error: "NIT y Token (sin validar) son requeridos",
      }
    }

    if (!credentials.tokenAcceso) {
      return {
        success: false,
        error: "Token validado es requerido",
      }
    }

    const result = await fetchPrescripcionesPorPaciente(
      credentials.nit,
      fecha,
      getTokenRaw(credentials),
      tipoDoc,
      numDoc
    )

    if (result.success && result.data) {
      const data = await marcarIpsSolicitante(await marcarDireccionamientos(credentials, extractPrescripciones(result.data)))
      return {
        success: true,
        data,
      }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar prescripciones",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de prescripciones",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar prescripción por número
 */
export async function consultarPrescripcionPorNumero(
  credentials: MipresCredentials,
  noPrescripcion: string
): Promise<{ success: boolean; data?: Prescripcion[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenRaw(credentials)) {
      return {
        success: false,
        error: "NIT y Token (sin validar) son requeridos",
      }
    }

    if (!credentials.tokenAcceso) {
      return {
        success: false,
        error: "Token validado es requerido",
      }
    }

    const result = await fetchPrescripcionesPorNumero(credentials.nit, getTokenRaw(credentials), noPrescripcion)

    if (result.success && result.data) {
      const data = await marcarIpsSolicitante(await marcarDireccionamientos(credentials, extractPrescripciones(result.data)))
      return {
        success: true,
        data,
      }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar prescripción",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de prescripción",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar novedades de prescripciones
 */
export async function consultarNovedadesPrescripciones(
  credentials: MipresCredentials,
  fecha: string
): Promise<{ success: boolean; data?: NovedadPrescripcion[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenRaw(credentials)) {
      return {
        success: false,
        error: "NIT y Token (sin validar) son requeridos",
      }
    }

    const result = await fetchNovedadesPrescripciones(credentials.nit, fecha, getTokenRaw(credentials))

    if (result.success && result.data) {
      const data = extractNovedades(result.data)
      return {
        success: true,
        data,
      }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar novedades",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de novedades",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar prescripciones por rango de fechas (con validación y modelo híbrido)
 */
export async function consultarPrescripcionesPorRangoFechas(
  credentials: MipresCredentials,
  fechaInicio: string,
  fechaFin?: string,
  pacienteParams?: { tipoDoc: string; numDoc: string }
): Promise<{ success: boolean; data?: Prescripcion[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenRaw(credentials)) {
      return {
        success: false,
        error: "NIT y Token (sin validar) son requeridos",
      }
    }

    if (!credentials.tokenAcceso) {
      return {
        success: false,
        error: "Token validado es requerido",
      }
    }

    if (!fechaInicio && !fechaFin) {
      return {
        success: false,
        error: "Ingrese al menos una fecha (inicio o un rango completo)",
      }
    }

    // Determinar las fechas para validar
    const fechaParaBuscar = fechaInicio || fechaFin!
    const fechaFinalParaBuscar = fechaFin || fechaParaBuscar

    // Validar rango de fechas
    const validacion = validarRangoFechas(fechaParaBuscar, fechaFinalParaBuscar)
    if (!validacion.valid) {
      return {
        success: false,
        error: validacion.error,
      }
    }

    // Generar rango de fechas
    const fechasArray = generarRangoFechas(fechaParaBuscar, fechaFinalParaBuscar)

    // Crear funciones lazy para cada fecha (se ejecutan al ser invocadas, no antes)
    // Si hay pacienteParams, usar el endpoint específico de paciente
    const tareas = fechasArray.map((fecha) => {
      if (pacienteParams) {
        return () => consultarPrescripcionesPorPacienteSinDireccionamiento(
          credentials,
          fecha,
          pacienteParams.tipoDoc,
          pacienteParams.numDoc
        )
      } else {
        return () => consultarPrescripcionesPorFechaSinDireccionamiento(credentials, fecha)
      }
    })

    // Ejecutar con concurrencia limitada (I/O no bloqueante)
    const resultados = await ejecutarConConcurrencia(tareas, 15)

    // Compilar resultados
    let allResults: Prescripcion[] = []
    resultados.forEach((result) => {
      if (result.success && result.data) {
        allResults = [...allResults, ...result.data]
      }
    })

    if (allResults.length > 0) {
      const data = await marcarIpsSolicitante(await marcarDireccionamientos(credentials, allResults))
      return {
        success: true,
        data,
      }
    } else {
      return {
        success: false,
        error: "No se encontraron prescripciones en el rango especificado",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error al consultar prescripciones por rango de fechas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

async function consultarPrescripcionesPorPacienteSinDireccionamiento(
  credentials: MipresCredentials,
  fecha: string,
  tipoDoc: string,
  numDoc: string
): Promise<{ success: boolean; data?: Prescripcion[]; error?: string; details?: string }> {
  try {
    const result = await fetchPrescripcionesPorPaciente(
      credentials.nit,
      fecha,
      getTokenRaw(credentials),
      tipoDoc,
      numDoc
    )

    if (result.success && result.data) {
      return {
        success: true,
        data: extractPrescripciones(result.data),
      }
    }

    return {
      success: false,
      error: result.error || "Error al consultar prescripciones",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de prescripciones",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

async function consultarPrescripcionesPorFechaSinDireccionamiento(
  credentials: MipresCredentials,
  fecha: string
): Promise<{ success: boolean; data?: Prescripcion[]; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenRaw(credentials)) {
      return {
        success: false,
        error: "NIT y Token (sin validar) son requeridos",
      }
    }

    if (!credentials.tokenAcceso) {
      return {
        success: false,
        error: "Token validado es requerido",
      }
    }

    const result = await fetchPrescripcionesPorFecha(credentials.nit, fecha, getTokenRaw(credentials))

    if (result.success && result.data) {
      return {
        success: true,
        data: extractPrescripciones(result.data),
      }
    }

    return {
      success: false,
      error: result.error || "Error al consultar prescripciones",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de prescripciones",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

function hasDireccionamientos(raw: any): boolean {
  if (!raw) return false
  if (Array.isArray(raw)) return raw.length > 0
  if (raw.root && Array.isArray(raw.root)) return raw.root.length > 0
  if (raw.direccionamientos && Array.isArray(raw.direccionamientos)) return raw.direccionamientos.length > 0
  return true
}

async function marcarDireccionamientos(credentials: MipresCredentials, prescripciones: Prescripcion[]) {
  const statusByPrescripcion = new Map<string, boolean>()
  const uniquePrescripciones = Array.from(
    new Set(prescripciones.map((presc) => presc.NoPrescripcion).filter(Boolean))
  )

  const tareas = uniquePrescripciones.map((noPrescripcion) => {
    return async () => {
      const result = await fetchDireccionamientoPorPrescripcion(
        credentials.nit,
        credentials.tokenAcceso,
        noPrescripcion
      )

      const direccionada = result.success ? hasDireccionamientos(result.data) : false
      statusByPrescripcion.set(noPrescripcion, direccionada)
    }
  })

  await ejecutarConConcurrencia(tareas, 10)

  return prescripciones.map((presc) => ({
    ...presc,
    direccionada: presc.NoPrescripcion ? statusByPrescripcion.get(presc.NoPrescripcion) || false : false,
  }))
}

function extractIpsNombre(raw: any): string {
  return String(raw?.ips || raw?.razon_social || raw?.nombre || raw?.ips_nombre || "").trim()
}

async function marcarIpsSolicitante(prescripciones: Prescripcion[]) {
  const ipsByNit = new Map<string, string>()
  const uniqueNits = Array.from(
    new Set(
      prescripciones
        .map((presc) => String(presc.NroIDIPS || "").trim())
        .filter(Boolean)
    )
  )

  const tareas = uniqueNits.map((nit) => async () => {
    if (ipsByNit.has(nit)) return

    const result = await fetchIpsByNit(nit)
    if (!result.success || !result.data || result.data.length === 0) return

    const exact = result.data.find((item: any) => String(item.nit || "").trim() === nit) || result.data[0]
    const nombre = extractIpsNombre(exact)
    if (nombre) {
      ipsByNit.set(nit, nombre)
    }
  })

  await ejecutarConConcurrencia(tareas, 10)

  return prescripciones.map((presc) => ({
    ...presc,
    ipsSolicitanteNombre: presc.NroIDIPS ? ipsByNit.get(String(presc.NroIDIPS).trim()) || "" : "",
  }))
}

/**
 * Función genérica para consultar prescripciones según tipo
 */
export async function consultarPrescripciones(
  credentials: MipresCredentials,
  tipo: TipoConsultaPrescripcion,
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
      return consultarPrescripcionesPorFecha(credentials, params.fecha)

    case "paciente":
      if (!params.fecha || !params.tipoDoc || !params.numDoc) {
        return { success: false, error: "Fecha, tipo y número de documento son requeridos" }
      }
      return consultarPrescripcionesPorPaciente(credentials, params.fecha, params.tipoDoc, params.numDoc)

    case "numero":
      if (!params.noPrescripcion) return { success: false, error: "Número de prescripción es requerido" }
      return consultarPrescripcionPorNumero(credentials, params.noPrescripcion)

    case "novedades":
      if (!params.fecha) return { success: false, error: "Fecha es requerida" }
      return consultarNovedadesPrescripciones(credentials, params.fecha)

    default:
      return { success: false, error: "Tipo de consulta no válido" }
  }
}
