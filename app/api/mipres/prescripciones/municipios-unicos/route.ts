import { NextRequest, NextResponse } from "next/server"
import { consultarPrescripciones, consultarPrescripcionesPorRangoFechas } from "@/controllers/mipres-controller/prescripcion-controller/prescripcion.controller"
import type { MipresCredentials } from "@/models/credentials.model"
import type { TipoConsultaPrescripcion } from "@/requests/mipres-sispro/prescripcion.request"

function normalizeCodDANE(codigo: string | undefined | null): string {
  const trimmed = String(codigo || "").trim()
  return trimmed.replace(/\D/g, "") || ""
}

/**
 * GET /api/mipres/prescripciones/municipios-unicos
 * Retorna un array de códigos DANE únicos (solo dígitos) que aparecen en las prescripciones
 * Filtra por departamento si es especificado (departamento como 2-3 primeros dígitos de DANE)
 */
export async function GET(request: NextRequest) {
  try {
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
    const departamento = searchParams.get("departamento")

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
        { success: false, error: "Tipo de consulta es requerido" },
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

    let result1: any
    let result2: any

    // Consultar por rango si es especificado
    if (tipo === "rango" || tipo === "paciente-rango") {
      if (!fechaInicio) {
        return NextResponse.json(
          { success: false, error: "fechaInicio es requerida" },
          { status: 400 }
        )
      }

      const pacienteParams = (tipoDoc && numDoc) ? { tipoDoc, numDoc } : undefined

      [result1, result2] = await Promise.all([
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
    } else {
      // Validar fecha si es requerida
      if ((tipo === "fecha" || tipo === "novedades") && !fecha) {
        return NextResponse.json(
          { success: false, error: "Fecha es requerida para este tipo de consulta" },
          { status: 400 }
        )
      }

      const params = {
        fecha: fecha || undefined,
        tipoDoc: tipoDoc || undefined,
        numDoc: numDoc || undefined,
        noPrescripcion: noPrescripcion || undefined,
      }

      [result1, result2] = await Promise.all([
        consultarPrescripciones(credentialsSubsidiado, tipo, params),
        consultarPrescripciones(credentialsContributivo, tipo, params),
      ])
    }

    const data1 = (result1.success ? result1.data : []) || []
    const data2 = (result2.success ? result2.data : []) || []

    const allData = [...data1, ...data2]

    // Extraer y normalizar códigos DANE únicos
    const municipiosSet = new Set<string>()
    const municipiosByDpto = new Map<string, Set<string>>()

    allData.forEach((presc) => {
      const codDANE = normalizeCodDANE(presc.CodDANEMunIPS)
      if (!codDANE) return

      municipiosSet.add(codDANE)

      // Extraer departamento (primeros 2 dígitos del DANE)
      const dpto = codDANE.substring(0, 2)
      if (!municipiosByDpto.has(dpto)) {
        municipiosByDpto.set(dpto, new Set())
      }
      municipiosByDpto.get(dpto)!.add(codDANE)
    })

    // Si se especifica departamento, filtrar
    if (departamento && municipiosByDpto.has(departamento)) {
      const filtrados = Array.from(municipiosByDpto.get(departamento)!).sort()
      return NextResponse.json({
        success: true,
        data: filtrados,
        total: filtrados.length,
        departamento,
      })
    }

    const municipios = Array.from(municipiosSet).sort()

    return NextResponse.json({
      success: true,
      data: municipios,
      total: municipios.length,
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
