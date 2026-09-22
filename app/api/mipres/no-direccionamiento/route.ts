import { NextRequest, NextResponse } from "next/server"
import type { MipresCredentials } from "@/models/credentials.model"
import type { TipoConsultaNoDireccionamiento } from "@/requests/mipres-sispro/no-direccionamiento.request"
import {
  anularNoDireccionamiento,
  consultarNoDireccionamientos,
  consultarNoDireccionamientosMany,
  registrarNoDireccionamiento,
} from "@/controllers/mipres-controller/no-direccionamiento-controller/no-direccionamiento.controller"

function buildCredentials(
  nit: string,
  tokenAcceso?: string | null,
  tokenAccesoSubsidiado?: string | null,
  tokenAccesoContributivo?: string | null
): MipresCredentials {
  return {
    nit,
    tokenAcceso: tokenAcceso || "",
    tokenAccesoSubsidiado: tokenAccesoSubsidiado || undefined,
    tokenAccesoContributivo: tokenAccesoContributivo || undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const tokenAcceso = searchParams.get("tokenAcceso")
    
    // Tokens específicos (raw y acceso)
    const tokenSubsidiado = searchParams.get("tokenSubsidiado")
    const tokenContributivo = searchParams.get("tokenContributivo")
    const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
    const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
    
    const tipo = searchParams.get("tipo") as TipoConsultaNoDireccionamiento
    const fecha = searchParams.get("fecha")
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")
    const tipoDoc = searchParams.get("tipoDoc")
    const numDoc = searchParams.get("numDoc")
    const noPrescripcion = searchParams.get("noPrescripcion")

    if (!nit) {
      return NextResponse.json(
        { success: false, error: "NIT es requerido" },
        { status: 400 }
      )
    }

    const tieneTokensRaw = Boolean(tokenSubsidiado && tokenContributivo)
    const tieneTokensAcceso = Boolean(tokenAccesoSubsidiado && tokenAccesoContributivo)

    if (!tieneTokensRaw || !tieneTokensAcceso) {
      // Intentar fallback a comportamiento legacy si falta alguno, pero lo ideal es validar todo
      // Si tenemos tokenAcceso (legacy), permitimos continuar
      if (!tokenAcceso && (!tokenAccesoSubsidiado || !tokenAccesoContributivo)) {
         return NextResponse.json(
          { success: false, error: "Tokens subsidiado y contributivo (raw y acceso) son requeridos" },
          { status: 400 }
        )
      }
    }

    if (!tipo) {
      return NextResponse.json(
        { success: false, error: "Tipo de consulta es requerido (fecha|prescripcion|paciente|rango)" },
        { status: 400 }
      )
    }

    const params = {
      fecha: fecha || undefined,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      tipoDoc: tipoDoc || undefined,
      numDoc: numDoc || undefined,
      noPrescripcion: noPrescripcion || undefined,
    }

    if (tieneTokensAcceso && tieneTokensRaw) {
      const credentialsSubsidiado: MipresCredentials = {
        nit,
        tokenSubsidiado: tokenSubsidiado || undefined,
        tokenContributivo: undefined,
        tokenAcceso: tokenAccesoSubsidiado || "",
        tokenAccesoSubsidiado: tokenAccesoSubsidiado || undefined,
        tokenAccesoContributivo: tokenAccesoContributivo || undefined,
      }

      const credentialsContributivo: MipresCredentials = {
        nit,
        tokenSubsidiado: undefined,
        tokenContributivo: tokenContributivo || undefined,
        tokenAcceso: tokenAccesoContributivo || "",
        tokenAccesoSubsidiado: tokenAccesoSubsidiado || undefined,
        tokenAccesoContributivo: tokenAccesoContributivo || undefined,
      }

      const [resultSubsidiado, resultContributivo] = await Promise.all([
        consultarNoDireccionamientos(credentialsSubsidiado, tipo, params),
        consultarNoDireccionamientos(credentialsContributivo, tipo, params),
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
          meta: {
            subsidiado: dataSubsidiado.length,
            contributivo: dataContributivo.length,
          },
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: "No se encontraron no direccionamientos",
          details: {
            subsidiado: resultSubsidiado.success ? undefined : resultSubsidiado.error,
            contributivo: resultContributivo.success ? undefined : resultContributivo.error,
          },
        },
        { status: 400 }
      )
    }

    // Fallback para token genérico (comportamiento legacy)
    const primaryToken = tokenAcceso || tokenAccesoSubsidiado || tokenAccesoContributivo
    const credentials = buildCredentials(
      nit,
      primaryToken,
      tokenAccesoSubsidiado,
      tokenAccesoContributivo
    )
    const result = await consultarNoDireccionamientos(credentials, tipo, params)

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

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    const { nit, tokenAcceso, tipo, body: payload } = requestData

    if (!nit || !tokenAcceso) {
      return NextResponse.json(
        { success: false, error: "NIT y token son requeridos" },
        { status: 400 }
      )
    }

    const credentials = buildCredentials(nit, tokenAcceso)

    switch (tipo) {
      case "registrar": {
        if (!payload) {
          return NextResponse.json(
            { success: false, error: "Body es requerido para registrar" },
            { status: 400 }
          )
        }
        const result = await registrarNoDireccionamiento(credentials, payload)
        if (result.success) {
          return NextResponse.json({ success: true, data: result.data })
        }
        return NextResponse.json(
          { success: false, error: result.error, details: result.details },
          { status: 400 }
        )
      }

      case "many": {
        if (!payload) {
          return NextResponse.json(
            { success: false, error: "Body es requerido para consulta many" },
            { status: 400 }
          )
        }
        const result = await consultarNoDireccionamientosMany(credentials, payload)
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

      default:
        return NextResponse.json(
          { success: false, error: "Tipo de operacion no valido (registrar|many)" },
          { status: 400 }
        )
    }
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

export async function PUT(request: NextRequest) {
  try {
    const { nit, tokenAcceso, idNoDireccionamiento } = await request.json()

    if (!nit || !tokenAcceso) {
      return NextResponse.json(
        { success: false, error: "NIT y token son requeridos" },
        { status: 400 }
      )
    }

    if (!idNoDireccionamiento) {
      return NextResponse.json(
        { success: false, error: "idNoDireccionamiento es requerido" },
        { status: 400 }
      )
    }

    const credentials = buildCredentials(nit, tokenAcceso)
    const result = await anularNoDireccionamiento(credentials, String(idNoDireccionamiento))

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
