import { NextRequest, NextResponse } from "next/server"
import { consultarDetalleFacturacion } from "@/controllers/mipres-controller/facturacion-controller/facturacion.controller"
import type { MipresCredentials } from "@/models/credentials.model"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const tokenAcceso = searchParams.get("tokenAcceso")
    const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
    const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
    const noPrescripcion = searchParams.get("noPrescripcion")
    const conTec = searchParams.get("conTec")
    const noEntrega = searchParams.get("noEntrega")
    const tipoTec = searchParams.get("tipoTec")

    if (!nit) return NextResponse.json({ success: false, error: "NIT es requerido" }, { status: 400 })

    const token = tokenAcceso || tokenAccesoSubsidiado || tokenAccesoContributivo
    if (!token) return NextResponse.json({ success: false, error: "Token de acceso es requerido" }, { status: 400 })

    if (!noPrescripcion || !conTec || !noEntrega) {
      return NextResponse.json({ success: false, error: "noPrescripcion, conTec y noEntrega son requeridos" }, { status: 400 })
    }

    const credentials: MipresCredentials = {
      nit,
      tokenAcceso: token,
      tokenAccesoSubsidiado: tokenAccesoSubsidiado || undefined,
      tokenAccesoContributivo: tokenAccesoContributivo || undefined,
    }

    const result = await consultarDetalleFacturacion(
      credentials,
      noPrescripcion,
      Number(conTec),
      Number(noEntrega),
      tipoTec || ""
    )

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error interno del servidor", details: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
