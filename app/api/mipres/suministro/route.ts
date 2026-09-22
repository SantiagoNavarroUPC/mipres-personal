import { NextRequest, NextResponse } from "next/server"
import type { MipresCredentials } from "@/models/credentials.model"
import type { TipoConsultaSuministro } from "@/requests/mipres-sispro/suministro.request"
import {
  anularSuministro,
  consultarSuministro,
  consultarSuministroPorRangoFechas,
  crearReporteSuministro,
} from "@/controllers/mipres-controller/suministro-controller/suministro.controller"

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const tokenAcceso = searchParams.get("tokenAcceso")
    const tokenSubsidiado = searchParams.get("tokenSubsidiado")
    const tokenContributivo = searchParams.get("tokenContributivo")
    const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
    const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
    const tipo = searchParams.get("tipo") as TipoConsultaSuministro | "rango"
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

    // Manejo especial para rango
    if (tipo === "rango") {
      if (!fechaInicio) {
        return NextResponse.json(
          { success: false, error: "fechaInicio es requerida para consulta por rango" },
          { status: 400 }
        )
      }

      const pacienteParams = (tipoDoc && numDoc) ? { tipoDoc, numDoc } : undefined
      const tieneTokensAcceso = Boolean(tokenAccesoSubsidiado && tokenAccesoContributivo)

      if (tieneTokensAcceso) {
        const credentialsSubsidiado = buildCredentials(
          nit,
          tokenAccesoSubsidiado,
          tokenAccesoSubsidiado,
          tokenAccesoContributivo
        )
        const credentialsContributivo = buildCredentials(
          nit,
          tokenAccesoContributivo,
          tokenAccesoSubsidiado,
          tokenAccesoContributivo
        )

        const [resultSubsidiado, resultContributivo] = await Promise.all([
          consultarSuministroPorRangoFechas(credentialsSubsidiado, fechaInicio, fechaFin || undefined, pacienteParams),
          consultarSuministroPorRangoFechas(credentialsContributivo, fechaInicio, fechaFin || undefined, pacienteParams),
        ])

        const dataSubsidiado = (resultSubsidiado.success ? resultSubsidiado.data : []) || []
        const dataContributivo = (resultContributivo.success ? resultContributivo.data : []) || []

        const merged = [
          ...dataSubsidiado.map((item) => ({ ...item, tipoRegimen: "Subsidiado" })),
          ...dataContributivo.map((item) => ({ ...item, tipoRegimen: "Contributivo" })),
        ]

        if (merged.length > 0) {
          return NextResponse.json({
            success: true,
            data: merged,
            total: merged.length,
          })
        }

        return NextResponse.json(
          {
            success: false,
            error: "No se encontraron suministros en el rango especificado",
            details: {
              subsidiado: resultSubsidiado.success ? undefined : resultSubsidiado.error,
              contributivo: resultContributivo.success ? undefined : resultContributivo.error,
            },
          },
          { status: 400 }
        )
      } else {
        // Un solo token
        const credentials = buildCredentials(nit, tokenAcceso, tokenSubsidiado, tokenContributivo)
        const result = await consultarSuministroPorRangoFechas(credentials, fechaInicio, fechaFin || undefined, pacienteParams)
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            data: result.data,
            total: result.data?.length || 0,
          })
        }
        
        return NextResponse.json(
          { success: false, error: result.error, details: result.details },
          { status: 400 }
        )
      }
    }

    // Consultas normales
    const params = {
      fecha: fecha || undefined,
      tipoDoc: tipoDoc || undefined,
      numDoc: numDoc || undefined,
      noPrescripcion: noPrescripcion || undefined,
    }

    const tieneTokensAcceso = Boolean(tokenAccesoSubsidiado && tokenAccesoContributivo)

    if (tieneTokensAcceso) {
      const credentialsSubsidiado = buildCredentials(
        nit,
        tokenAccesoSubsidiado,
        tokenAccesoSubsidiado,
        tokenAccesoContributivo
      )
      const credentialsContributivo = buildCredentials(
        nit,
        tokenAccesoContributivo,
        tokenAccesoSubsidiado,
        tokenAccesoContributivo
      )

      const [resultSubsidiado, resultContributivo] = await Promise.all([
        consultarSuministro(credentialsSubsidiado, tipo as TipoConsultaSuministro, params),
        consultarSuministro(credentialsContributivo, tipo as TipoConsultaSuministro, params),
      ])

      const dataSubsidiado = (resultSubsidiado.success ? resultSubsidiado.data : []) || []
      const dataContributivo = (resultContributivo.success ? resultContributivo.data : []) || []

      const merged = [
        ...dataSubsidiado.map((item) => ({ ...item, tipoRegimen: "Subsidiado" })),
        ...dataContributivo.map((item) => ({ ...item, tipoRegimen: "Contributivo" })),
      ]

      if (merged.length > 0) {
        return NextResponse.json({
          success: true,
          data: merged,
          total: merged.length,
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: "No se encontraron suministros",
          details: {
            subsidiado: resultSubsidiado.success ? undefined : resultSubsidiado.error,
            contributivo: resultContributivo.success ? undefined : resultContributivo.error,
          },
        },
        { status: 400 }
      )
    }

    const credentials = buildCredentials(nit, tokenAcceso, tokenSubsidiado, tokenContributivo)
    const result = await consultarSuministro(credentials, tipo as TipoConsultaSuministro, params)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        total: result.data?.length || 0,
      })
    }

    return NextResponse.json(
      { success: false, error: result.error, details: result.details },
      { status: 400 }
    )
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

// POST para Crear/Actualizar Suministro (mapea a PUT /Suministro externo)
export async function POST(request: NextRequest) {
  try {
    const { nit, tokenAcceso, body: payload } = await request.json()

    if (!nit || !tokenAcceso) {
      return NextResponse.json(
        { success: false, error: "NIT y token son requeridos" },
        { status: 400 }
      )
    }

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Body es requerido para registrar suministro" },
        { status: 400 }
      )
    }

    const credentials = buildCredentials(nit, tokenAcceso)
    const result = await crearReporteSuministro(credentials, payload)

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data })
    }

    return NextResponse.json(
      { success: false, error: result.error, details: result.details },
      { status: 400 }
    )
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

// PUT para Anular Suministro (mapea a PUT /AnularSuministro externo)
export async function PUT(request: NextRequest) {
  try {
    const { nit, tokenAcceso, idSuministro } = await request.json()

    if (!nit || !tokenAcceso) {
      return NextResponse.json(
        { success: false, error: "NIT y token son requeridos" },
        { status: 400 }
      )
    }

    if (!idSuministro) {
      return NextResponse.json(
        { success: false, error: "idSuministro es requerido" },
        { status: 400 }
      )
    }

    const credentials = buildCredentials(nit, tokenAcceso)
    const result = await anularSuministro(credentials, idSuministro)

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data })
    }

    return NextResponse.json(
      { success: false, error: result.error, details: result.details },
      { status: 400 }
    )
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
