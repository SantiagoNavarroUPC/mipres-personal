import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/env"

export async function GET(request: NextRequest) {
  try {
    const idAfiliado = request.nextUrl.searchParams.get("idAfiliado")

    if (!idAfiliado) {
      return NextResponse.json(
        { error: "idAfiliado es requerido" },
        { status: 400 }
      )
    }

    const baseUrl = getBackendApiUrl()
    const url = `${baseUrl}/api/mipres/portabilidad-paciente?idAfiliado=${encodeURIComponent(idAfiliado)}`

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    const data = await response.json()

    if (Array.isArray(data) && data.length === 0) {
      return NextResponse.json(data, { status: 200 })
    }

    if (data && Array.isArray((data as { portabilidades?: unknown }).portabilidades) && (data as { portabilidades: unknown[] }).portabilidades.length === 0) {
      return NextResponse.json(data, { status: 200 })
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error en GET /api/afiliado/portabilidad-paciente:", error)
    return NextResponse.json(
      { error: "Error consultando portabilidad del paciente" },
      { status: 500 }
    )
  }
}
