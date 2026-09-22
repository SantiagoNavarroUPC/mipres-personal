import { NextRequest, NextResponse } from "next/server"
import type { MipresCredentials } from "@/models/credentials.model"
import type { TipoConsultaTutela } from "@/requests/mipres-sispro/tutelas.request"
import { consultarTutelas, consultarTutelasPorRangoFechas } from "@/controllers/mipres-controller/tutela-controller/tutela.controller"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const tokenSubsidiado = searchParams.get("tokenSubsidiado")
    const tokenContributivo = searchParams.get("tokenContributivo")
    const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
    const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
    const tipo = searchParams.get("tipo") as TipoConsultaTutela
    const fecha = searchParams.get("fecha")
    const tipoDoc = searchParams.get("tipoDoc")
    const numDoc = searchParams.get("numDoc")
    const noTutela = searchParams.get("noTutela")
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")

    if (!nit) {
      return NextResponse.json(
        { success: false, error: "NIT es requerido" },
        { status: 400 }
      )
    }

    const tieneTokensRaw = Boolean(tokenSubsidiado && tokenContributivo)
    if (!tieneTokensRaw) {
      return NextResponse.json(
        { success: false, error: "Tokens subsidiado y contributivo (raw) son requeridos" },
        { status: 400 }
      )
    }

    if (!tipo) {
      return NextResponse.json(
        { success: false, error: "Tipo de consulta es requerido (fecha|paciente|numero|novedades|rango)" },
        { status: 400 }
      )
    }

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

    if (tipo === "rango" || tipo === "paciente-rango") {
      if (!fechaInicio) {
        return NextResponse.json(
          { success: false, error: "fechaInicio es requerida para consulta por rango" },
          { status: 400 }
        )
      }

      if (tipo === "paciente-rango" && (!tipoDoc || !numDoc)) {
        return NextResponse.json(
          { success: false, error: "tipoDoc y numDoc son requeridos para consulta por paciente en rango" },
          { status: 400 }
        )
      }

      const pacienteParams = (tipoDoc && numDoc) ? { tipoDoc: tipoDoc, numDoc: numDoc } : undefined

      const [resultSubsidiado, resultContributivo] = await Promise.all([
        consultarTutelasPorRangoFechas(credentialsSubsidiado, fechaInicio, fechaFin || undefined, pacienteParams),
        consultarTutelasPorRangoFechas(credentialsContributivo, fechaInicio, fechaFin || undefined, pacienteParams),
      ])

      const dataSubsidiado = (resultSubsidiado.success ? resultSubsidiado.data : []) || []
      const dataContributivo = (resultContributivo.success ? resultContributivo.data : []) || []

      const merged = [
        ...dataSubsidiado.map((item) => ({ ...item, tipoRegimen: "Subsidiado" })),
        ...dataContributivo.map((item) => ({ ...item, tipoRegimen: "Contributivo" })),
      ]

      return NextResponse.json({
        success: true,
        data: merged,
        total: merged.length,
      })
    }

    const params = {
      fecha: fecha || undefined,
      tipoDoc: tipoDoc || undefined,
      numDoc: numDoc || undefined,
      noTutela: noTutela || undefined,
    }

    const [resultSubsidiado, resultContributivo] = await Promise.all([
      consultarTutelas(credentialsSubsidiado, tipo, params),
      consultarTutelas(credentialsContributivo, tipo, params),
    ])

    const dataSubsidiado = (resultSubsidiado.success ? resultSubsidiado.data : []) || []
    const dataContributivo = (resultContributivo.success ? resultContributivo.data : []) || []

    const merged = [
      ...dataSubsidiado.map((item) => ({ ...item, tipoRegimen: "Subsidiado" })),
      ...dataContributivo.map((item) => ({ ...item, tipoRegimen: "Contributivo" })),
    ]

    return NextResponse.json({
      success: true,
      data: merged,
      total: merged.length,
    })
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
