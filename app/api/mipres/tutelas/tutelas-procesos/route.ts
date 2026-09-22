import { NextRequest, NextResponse } from "next/server"
import { getRequiredEnv } from "@/lib/env"

export async function GET(request: NextRequest) {
  try {
    const numeroDocumento = String(request.nextUrl.searchParams.get("numero_documento") || "").trim()

    if (!numeroDocumento) {
      return NextResponse.json(
        { success: false, error: "numero_documento es requerido" },
        { status: 400 }
      )
    }

    const baseUrl = getRequiredEnv("DUSAKAWI_API_URL")
    const upstreamUrl = `${baseUrl}/api/mipres/prescripciones-por-paciente?numero_documento=${encodeURIComponent(numeroDocumento)}`

    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const text = await response.text()
    let payload: any = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = text
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: payload?.error || payload?.message || `Error HTTP ${response.status}`,
          details: payload,
        },
        { status: response.status }
      )
    }

    const rawList = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : []

    const data = rawList.map((item: unknown) => String(item || "").trim()).filter(Boolean)

    return NextResponse.json({ success: true, data, total: data.length })
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
