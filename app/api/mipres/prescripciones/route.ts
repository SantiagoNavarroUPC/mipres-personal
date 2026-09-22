import { NextRequest, NextResponse } from "next/server"
import { consultarPrescripciones, consultarPrescripcionesPorRangoFechas } from "@/controllers/mipres-controller/prescripcion-controller/prescripcion.controller"
import type { MipresCredentials } from "@/models/credentials.model"
import type { TipoConsultaPrescripcion } from "@/requests/mipres-sispro/prescripcion.request"

function normalizeCodDANE(codigo: string | undefined | null): string {
  const trimmed = String(codigo || "").trim()
  return trimmed.replace(/\D/g, "") || ""
}

function deduplicateAndCleanPrescriptions(prescriptions: any[]): any[] {
  const seen = new Map<string, any>()

  prescriptions.forEach((presc) => {
    const key = String(presc.NoPrescripcion || "").trim()
    if (!key) return

    // Normalizar CodDANEMunIPS a solo dígitos
    const normalized = {
      ...presc,
      CodDANEMunIPS: normalizeCodDANE(presc.CodDANEMunIPS),
    }

    // Guardar o reemplazar con versión más reciente/completa
    if (!seen.has(key) || (normalized.FPrescripcion && (!seen.get(key).FPrescripcion || normalized.FPrescripcion > seen.get(key).FPrescripcion))) {
      seen.set(key, normalized)
    }
  })

  return Array.from(seen.values())
}

export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de query
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const tokenSubsidiado = searchParams.get("tokenSubsidiado")
    const tokenContributivo = searchParams.get("tokenContributivo")
    const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
    const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
    const tipo = searchParams.get("tipo") as TipoConsultaPrescripcion
    const fecha = searchParams.get("fecha")
    const tipoDoc = searchParams.get("tipoDoc")
    const numDoc = searchParams.get("numDoc")
    const noPrescripcion = searchParams.get("noPrescripcion")
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")

    // Validar parámetros requeridos
    if (!nit) {
      return NextResponse.json(
        { success: false, error: "NIT es requerido" },
        { status: 400 }
      )
    }

    const tieneTokensRaw = Boolean(tokenSubsidiado && tokenContributivo)
    const tieneTokensAcceso = Boolean(tokenAccesoSubsidiado && tokenAccesoContributivo)

    if (!tieneTokensRaw || !tieneTokensAcceso) {
      return NextResponse.json(
        { success: false, error: "Tokens subsidiado y contributivo (raw y acceso) son requeridos" },
        { status: 400 }
      )
    }

    if (!tipo) {
      return NextResponse.json(
        { success: false, error: "Tipo de consulta es requerido (fecha|paciente|numero|novedades|rango)" },
        { status: 400 }
      )
    }

    // Prescripciones usan token RAW por consulta (sin generar token de acceso)
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

    // Si el tipo es "rango" o "paciente-rango", usar el controller de rango con hilos
    if (tipo === "rango" || tipo === "paciente-rango") {
      if (!fechaInicio) {
        return NextResponse.json(
          { success: false, error: "fechaInicio es requerida para consulta por rango" },
          { status: 400 }
        )
      }

      const params = {
        fechaInicio,
        fechaFin,
        tipoDoc,
        numDoc
      }

      // Si es paciente-rango, validar documentos
      if (tipo === "paciente-rango" && (!tipoDoc || !numDoc)) {
        return NextResponse.json(
          { success: false, error: "tipoDoc y numDoc son requeridos para consulta por paciente en rango" },
          { status: 400 }
        )
      }

      const pacienteParams = (tipoDoc && numDoc) ? { tipoDoc: tipoDoc, numDoc: numDoc } : undefined

      const [resultSubsidiado, resultContributivo] = await Promise.all([
        consultarPrescripcionesPorRangoFechas(
          credentialsSubsidiado,
          fechaInicio,
          fechaFin || undefined,
          pacienteParams
        ),
        consultarPrescripcionesPorRangoFechas(
          credentialsContributivo,
          fechaInicio,
          fechaFin || undefined,
          pacienteParams
        ),
      ])

      const dataSubsidiado = (resultSubsidiado.success ? resultSubsidiado.data : []) || []
      const dataContributivo = (resultContributivo.success ? resultContributivo.data : []) || []

      const merged = [
        ...dataSubsidiado.map((item) => ({ ...item, tipoRegimen: "Subsidiado" })),
        ...dataContributivo.map((item) => ({ ...item, tipoRegimen: "Contributivo" })),
      ]

      const deduplicated = deduplicateAndCleanPrescriptions(merged)

      if (deduplicated.length > 0) {
        return NextResponse.json({
          success: true,
          data: deduplicated,
          total: deduplicated.length,
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: "No se encontraron prescripciones en el rango especificado",
          details: {
            subsidiado: resultSubsidiado.success ? undefined : resultSubsidiado.error,
            contributivo: resultContributivo.success ? undefined : resultContributivo.error,
          },
        },
        { status: 400 }
      )
    }

    // Validar fecha si es requerida para los otros tipos
    if ((tipo === "fecha" || tipo === "novedades") && !fecha) {
      return NextResponse.json(
        { success: false, error: "Fecha es requerida para este tipo de consulta" },
        { status: 400 }
      )
    }

    // Construir parámetros según tipo de consulta
    const params = {
      fecha: fecha || undefined,
      tipoDoc: tipoDoc || undefined,
      numDoc: numDoc || undefined,
      noPrescripcion: noPrescripcion || undefined,
    }

    // Llamar al controlador generico
    const [resultSubsidiado, resultContributivo] = await Promise.all([
      consultarPrescripciones(credentialsSubsidiado, tipo, params),
      consultarPrescripciones(credentialsContributivo, tipo, params),
    ])

    const dataSubsidiado = (resultSubsidiado.success ? resultSubsidiado.data : []) || []
    const dataContributivo = (resultContributivo.success ? resultContributivo.data : []) || []

    const merged = [
      ...dataSubsidiado.map((item) => ({ ...item, tipoRegimen: "Subsidiado" })),
      ...dataContributivo.map((item) => ({ ...item, tipoRegimen: "Contributivo" })),
    ]

    const deduplicated = deduplicateAndCleanPrescriptions(merged)

    if (deduplicated.length > 0) {
      return NextResponse.json({
        success: true,
        data: deduplicated,
        total: deduplicated.length,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "No se encontraron prescripciones",
        details: {
          subsidiado: resultSubsidiado.success ? undefined : resultSubsidiado.error,
          contributivo: resultContributivo.success ? undefined : resultContributivo.error,
        },
      },
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

