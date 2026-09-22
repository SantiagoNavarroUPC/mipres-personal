import { NextRequest, NextResponse } from "next/server"
import { obtenerDashboardReportesController } from "@/controllers/reportes-controller/reportes.controller"

function getAuthToken(request: NextRequest): string | undefined {
  const token =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    request.headers.get("x-mipres-token")

  return token?.trim() || undefined
}

export async function GET(request: NextRequest) {
  try {
    const fechaInicio =
      request.nextUrl.searchParams.get("fechaInicio") ||
      request.nextUrl.searchParams.get("fecha_inicio") ||
      ""
    const fechaFin =
      request.nextUrl.searchParams.get("fechaFin") ||
      request.nextUrl.searchParams.get("fecha_fin") ||
      undefined

    const result = await obtenerDashboardReportesController(
      fechaInicio,
      fechaFin,
      getAuthToken(request)
    )

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "No se pudo consultar dashboard" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(result.data, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno al consultar dashboard",
      },
      { status: 500 }
    )
  }
}
