import { NextRequest, NextResponse } from "next/server"
import { consultarFacturacion } from "@/controllers/mipres-controller/facturacion-controller/facturacion.controller"
import type { MipresCredentials } from "@/models/credentials.model"
import type { TipoConsultaFacturacion } from "@/requests/mipres-sispro/facturacion.request"

function deduplicateFacturaciones(items: any[]): any[] {
  const seen = new Map<string, any>()
  items.forEach((item) => {
    const key = String(item.IDFacturacion ?? item.ID ?? `${item.NoPrescripcion}-${item.TipoTec}-${item.ConTec}-${item.NoEntrega}`)
    if (!seen.has(key)) seen.set(key, item)
  })
  return Array.from(seen.values())
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const tokenAcceso = searchParams.get("tokenAcceso")
    const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
    const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
    const tipo = searchParams.get("tipo") as TipoConsultaFacturacion
    const fecha = searchParams.get("fecha")
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")
    const noPrescripcion = searchParams.get("noPrescripcion")

    if (!nit) {
      return NextResponse.json({ success: false, error: "NIT es requerido" }, { status: 400 })
    }

    const token = tokenAcceso || tokenAccesoSubsidiado || tokenAccesoContributivo
    if (!token) {
      return NextResponse.json({ success: false, error: "Token de acceso es requerido" }, { status: 400 })
    }

    if (!tipo) {
      return NextResponse.json(
        { success: false, error: "Tipo de consulta es requerido (fecha|prescripcion|rango)" },
        { status: 400 }
      )
    }

    if (tipo === "fecha" && !fecha) {
      return NextResponse.json({ success: false, error: "Fecha es requerida para este tipo de consulta" }, { status: 400 })
    }

    if (tipo === "prescripcion" && !noPrescripcion) {
      return NextResponse.json({ success: false, error: "noPrescripcion es requerida para este tipo de consulta" }, { status: 400 })
    }

    if (tipo === "rango" && (!fechaInicio || !fechaFin)) {
      return NextResponse.json({ success: false, error: "fechaInicio y fechaFin son requeridas para consulta por rango" }, { status: 400 })
    }

    const credentials: MipresCredentials = {
      nit,
      tokenAcceso: token,
      tokenAccesoSubsidiado: tokenAccesoSubsidiado || undefined,
      tokenAccesoContributivo: tokenAccesoContributivo || undefined,
    }

    const result = await consultarFacturacion(credentials, tipo, {
      fecha: fecha || undefined,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      noPrescripcion: noPrescripcion || undefined,
    })

    if (result.success && result.data && result.data.length > 0) {
      const data = deduplicateFacturaciones(result.data)
      return NextResponse.json({ success: true, data, total: data.length })
    }

    return NextResponse.json(
      { success: false, error: result.error || "No se encontraron registros de facturación" },
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
