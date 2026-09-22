import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/env"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Sesión sin token" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const numerosRecepcion = Array.isArray(body?.numeros_recepcion)
      ? body.numeros_recepcion.map((f: unknown) => String(f ?? "").trim()).filter(Boolean)
      : []

    if (numerosRecepcion.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debe enviar al menos un número de recepción" },
        { status: 400 }
      )
    }

    const endpoint = `${getBackendApiUrl()}/api/reportes/facturas-mipres/por-numero-recepcion`

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ numeros_recepcion: numerosRecepcion }),
      cache: "no-store",
    })

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ success: false, error: "Sesión inválida o expirada" }, { status: response.status })
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      return NextResponse.json(
        { success: false, error: payload?.error || `No se pudo generar el reporte (HTTP ${response.status})` },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json({ success: true, data: payload.data ?? [], total: payload.total ?? 0 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno al generar el reporte por número de recepción",
      },
      { status: 500 }
    )
  }
}
