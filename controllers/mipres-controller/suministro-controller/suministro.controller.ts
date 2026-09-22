import type { MipresCredentials } from "@/models/credentials.model"
import {
  fetchSuministroPorFecha,
  fetchSuministroPorPaciente,
  fetchSuministroPorPrescripcion,
  putAnularSuministro,
  putReporteSuministro,
  type TipoConsultaSuministro,
} from "@/requests/mipres-sispro/suministro.request"
import {
  ejecutarConConcurrencia,
  generarRangoFechas,
  validarRangoFechas,
} from "../prescripcion-controller/prescripcion-procesos.controller"
import { consultarReporteEntregaPorPrescripcion } from "../reporte-entrega-controller/reporte-entrega.controller"

function getTokenAcceso(credentials: MipresCredentials): string {
  // Priorizar los tokens específicos si están disponibles
  return credentials.tokenAcceso || credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo || ""
}

/**
 * Helper para extraer suministros de la respuesta raw
 */
function extractSuministros(raw: any): any[] {
  let items: any[] = []
  
  if (!raw) return []
  
  if (Array.isArray(raw)) {
    items = raw
  } else if (raw.root && Array.isArray(raw.root)) {
    items = raw.root
  } else if (raw.suministros && Array.isArray(raw.suministros)) {
    items = raw.suministros
  } else {
    items = [raw]
  }

  // Normalizar datos para asegurar que campos críticos existan
  return items.map(item => {
    // Si el item es null o undefined, retornarlo tal cual (se filtrará después si es necesario)
    if (!item) return item

    // Asegurar que NoPrescripcionAsociada tenga valor
    // La API puede devolver NoPrescripcion o NoPrescripcionAsociada
    const noPrescripcion = item.NoPrescripcionAsociada || item.NoPrescripcion

    // Asegurar que ConTecAsociada tenga valor
    // La API puede devolver ConTec o ConTecAsociada
    const conTec = item.ConTecAsociada || item.ConTec

    return {
      ...item,
      NoPrescripcionAsociada: noPrescripcion,
      ConTecAsociada: conTec,
      // Mapear otros campos si es necesario
      ID: item.ID || item.IdSuministro, // A veces viene como IdSuministro
    }
  })
}

/**
 * Consultar Suministro por fecha
 */
export async function consultarSuministroPorFecha(
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

    const result = await fetchSuministroPorFecha(credentials.nit, getTokenAcceso(credentials), fecha)

    if (result.success && result.data) {
      const data = extractSuministros(result.data)
      return { success: true, data }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar suministros",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de suministros",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Suministro por prescripción
 */
export async function consultarSuministroPorPrescripcion(
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

    const result = await fetchSuministroPorPrescripcion(
      credentials.nit,
      getTokenAcceso(credentials),
      noPrescripcion
    )

    if (result.success && result.data) {
      let data = extractSuministros(result.data)

      // Enriquecer con CodTecEntregado desde Reporte de Entrega
      try {
        const reportesResult = await consultarReporteEntregaPorPrescripcion(
          credentials,
          noPrescripcion
        )

        if (reportesResult.success && reportesResult.data) {
          const reportesMap = new Map()
          reportesResult.data.forEach((reporte: any) => {
            if (reporte.ConTec) {
              reportesMap.set(String(reporte.ConTec), reporte)
            }
          })

          data = data.map(suministro => {
            // Buscar reporte correspondiente usando ConTecAsociada
            const conTecAsociada = suministro.ConTecAsociada || suministro.ConTec
            if (conTecAsociada) {
              const reporte = reportesMap.get(String(conTecAsociada))
              if (reporte && reporte.CodTecEntregado) {
                return {
                  ...suministro,
                  CodTecEntregado: reporte.CodTecEntregado
                }
              }
            }
            return suministro
          })
        }
      } catch (error) {
        console.warn("No se pudo enriquecer suministros con datos de reporte", error)
      }

      return { success: true, data }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar suministros",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de suministros",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Suministro por paciente
 */
export async function consultarSuministroPorPaciente(
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

    const result = await fetchSuministroPorPaciente(
      credentials.nit,
      fecha,
      getTokenAcceso(credentials),
      tipoDoc,
      numDoc
    )

    if (result.success && result.data) {
      const data = extractSuministros(result.data)
      return { success: true, data }
    } else {
      return {
        success: false,
        error: result.error || "Error al consultar suministros",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error en la consulta de suministros",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Consultar Suministro por rango de fechas
 */
export async function consultarSuministroPorRangoFechas(
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
        return () => consultarSuministroPorPaciente(
          credentials,
          fecha,
          pacienteParams.tipoDoc,
          pacienteParams.numDoc
        )
      } else {
        return () => consultarSuministroPorFecha(credentials, fecha)
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
        error: "No se encontraron suministros en el rango especificado",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Error al consultar suministros por rango de fechas",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Crear Reporte de Suministro (PUT)
 */
export async function crearReporteSuministro(
  credentials: MipresCredentials,
  data: any
): Promise<{ success: boolean; data?: unknown; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await putReporteSuministro(
      credentials.nit,
      getTokenAcceso(credentials),
      data
    )

    if (result.success) {
      return { success: true, data: result.data }
    }

    return {
      success: false,
      error: result.error || "Error al crear reporte de suministro",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error al crear reporte de suministro",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Anular Suministro
 */
export async function anularSuministro(
  credentials: MipresCredentials,
  idSuministro: string
): Promise<{ success: boolean; data?: unknown; error?: string; details?: string }> {
  try {
    if (!credentials.nit || !getTokenAcceso(credentials)) {
      return {
        success: false,
        error: "NIT y token de acceso son requeridos",
      }
    }

    const result = await putAnularSuministro(
      credentials.nit,
      getTokenAcceso(credentials),
      idSuministro
    )

    if (result.success) {
      return { success: true, data: result.data }
    }

    return {
      success: false,
      error: result.error || "Error al anular suministro",
    }
  } catch (error) {
    return {
      success: false,
      error: "Error al anular suministro",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Función genérica para consultar suministros
 */
export async function consultarSuministro(
  credentials: MipresCredentials,
  tipo: TipoConsultaSuministro,
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
      return consultarSuministroPorFecha(credentials, params.fecha)

    case "prescripcion":
      if (!params.noPrescripcion) return { success: false, error: "Número de prescripción es requerido" }
      return consultarSuministroPorPrescripcion(credentials, params.noPrescripcion)

    case "paciente":
      if (!params.fecha || !params.tipoDoc || !params.numDoc) {
        return { success: false, error: "Fecha, tipo y número de documento son requeridos" }
      }
      return consultarSuministroPorPaciente(
        credentials,
        params.fecha,
        params.tipoDoc,
        params.numDoc
      )

    default:
      return { success: false, error: "Tipo de consulta no válido" }
  }
}
