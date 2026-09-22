import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/env"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Sesión sin token" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const rows = Array.isArray(body?.rows) ? body.rows : []

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debe enviar al menos un registro de la plantilla" },
        { status: 400 }
      )
    }

    const endpoint = `${getBackendApiUrl()}/api/reportes/facturas-mipres/plantilla/excel`

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ rows }),
      cache: "no-store",
    })

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ success: false, error: "Sesión inválida o expirada" }, { status: response.status })
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      return NextResponse.json(
        { success: false, error: payload?.error || `No se pudo generar el Excel de la plantilla (HTTP ${response.status})` },
        { status: response.status || 500 }
      )
    }

    const buffer = await response.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": response.headers.get("Content-Disposition") || "attachment; filename=\"plantilla_facturacion.xlsx\"",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno al generar el Excel de la plantilla",
      },
      { status: 500 }
    )
  }
}
