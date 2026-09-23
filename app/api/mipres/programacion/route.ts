import { NextRequest, NextResponse } from "next/server"
import type { MipresCredentials } from "@/models/credentials.model"
import type { TipoConsultaProgramacion } from "@/requests/mipres-sispro/programacion.request"
import {
  consultarProgramacion,
  consultarProgramacionPorRangoFechas,
} from "@/controllers/mipres-controller/programacion-controller/programacion.controller"

function buildCredentials(
  nit: string,
  tokenAcceso?: string | null,
  tokenSubsidiado?: string | null,
  tokenContributivo?: string | null
): MipresCredentials {
  return {
    nit,
    tokenAcceso: tokenAcceso || "",
    tokenAccesoSubsidiado: tokenSubsidiado || undefined,
    tokenAccesoContributivo: tokenContributivo || undefined,
  }
}

type ControllerResult = { success: boolean; data?: any[]; error?: string; details?: string }

function mergeRegimenes(resultSubsidiado: ControllerResult, resultContributivo: ControllerResult) {
  const dataSubsidiado = (resultSubsidiado.success ? resultSubsidiado.data : []) || []
  const dataContributivo = (resultContributivo.success ? resultContributivo.data : []) || []

  return [
    ...dataSubsidiado.map((item) => ({ ...item, tipoRegimen: "Subsidiado" })),
    ...dataContributivo.map((item) => ({ ...item, tipoRegimen: "Contributivo" })),
  ]
}

function buildMergedResponse(
  resultSubsidiado: ControllerResult,
  resultContributivo: ControllerResult,
  emptyMessage: string
) {
  const merged = mergeRegimenes(resultSubsidiado, resultContributivo)

  if (merged.length > 0) {
    return NextResponse.json({ success: true, data: merged, total: merged.length })
  }

  return NextResponse.json(
    {
      success: false,
      error: emptyMessage,
      details: {
        subsidiado: resultSubsidiado.success ? undefined : resultSubsidiado.error,
        contributivo: resultContributivo.success ? undefined : resultContributivo.error,
      },
    },
    { status: 400 }
  )
}

function buildSingleResponse(result: ControllerResult) {
  if (result.success) {
    return NextResponse.json({ success: true, data: result.data, total: result.data?.length || 0 })
  }

  return NextResponse.json(
    { success: false, error: result.error, details: result.details },
    { status: 400 }
  )
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const tokenAcceso = searchParams.get("tokenAcceso")
    const tokenSubsidiado = searchParams.get("tokenSubsidiado")
    const tokenContributivo = searchParams.get("tokenContributivo")
    const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
    const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
    const tipo = searchParams.get("tipo") as TipoConsultaProgramacion | "rango"
    const fecha = searchParams.get("fecha")
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")
    const tipoDoc = searchParams.get("tipoDoc")
    const numDoc = searchParams.get("numDoc")
    const noPrescripcion = searchParams.get("noPrescripcion")

    if (!nit || (!tokenAcceso && !tokenAccesoSubsidiado && !tokenAccesoContributivo)) {
      return NextResponse.json(
        { success: false, error: "NIT y token son requeridos" },
        { status: 400 }
      )
    }

    if (!tipo) {
      return NextResponse.json(
        { success: false, error: "Tipo de consulta es requerido (fecha|prescripcion|paciente|rango)" },
        { status: 400 }
      )
    }

    const tieneTokensAcceso = Boolean(tokenAccesoSubsidiado && tokenAccesoContributivo)
    const credentialsSubsidiado = buildCredentials(nit, tokenAccesoSubsidiado, tokenAccesoSubsidiado, tokenAccesoContributivo)
    const credentialsContributivo = buildCredentials(nit, tokenAccesoContributivo, tokenAccesoSubsidiado, tokenAccesoContributivo)

    // Manejo especial para rango
    if (tipo === "rango") {
      if (!fechaInicio) {
        return NextResponse.json(
          { success: false, error: "fechaInicio es requerida para consulta por rango" },
          { status: 400 }
        )
      }

      const pacienteParams = (tipoDoc && numDoc) ? { tipoDoc, numDoc } : undefined

      if (tieneTokensAcceso) {
        const [resultSubsidiado, resultContributivo] = await Promise.all([
          consultarProgramacionPorRangoFechas(credentialsSubsidiado, fechaInicio, fechaFin || undefined, pacienteParams),
          consultarProgramacionPorRangoFechas(credentialsContributivo, fechaInicio, fechaFin || undefined, pacienteParams),
        ])

        return buildMergedResponse(
          resultSubsidiado,
          resultContributivo,
          "No se encontraron programaciones en el rango especificado"
        )
      }

      // Un solo token
      const credentials = buildCredentials(nit, tokenAcceso, tokenSubsidiado, tokenContributivo)
      const result = await consultarProgramacionPorRangoFechas(credentials, fechaInicio, fechaFin || undefined, pacienteParams)
      return buildSingleResponse(result)
    }

    // Consultas normales
    const params = {
      fecha: fecha || undefined,
      tipoDoc: tipoDoc || undefined,
      numDoc: numDoc || undefined,
      noPrescripcion: noPrescripcion || undefined,
    }

    if (tieneTokensAcceso) {
      const [resultSubsidiado, resultContributivo] = await Promise.all([
        consultarProgramacion(credentialsSubsidiado, tipo, params),
        consultarProgramacion(credentialsContributivo, tipo, params),
      ])

      return buildMergedResponse(resultSubsidiado, resultContributivo, "No se encontraron programaciones")
    }

    const credentials = buildCredentials(nit, tokenAcceso, tokenSubsidiado, tokenContributivo)
    const result = await consultarProgramacion(credentials, tipo, params)
    return buildSingleResponse(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
