import { NextRequest, NextResponse } from "next/server"
import { descargarReporteExcelController } from "@/controllers/reportes-controller/reportes.controller"

function getAuthToken(request: NextRequest): string | undefined {
  const token = request.headers.get("authorization") || request.headers.get("Authorization")
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
    const nitPrestador =
      request.nextUrl.searchParams.get("nit_prestador") || undefined

    const result = await descargarReporteExcelController(
      "estructura-giro",
      fechaInicio,
      fechaFin,
      getAuthToken(request),
      nitPrestador
    )

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "No se pudo descargar reporte estructura de giro" },
        { status: result.status || 500 }
      )
    }

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": result.contentDisposition || "attachment; filename=\"reporte-estructura-giro.xlsx\"",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno al descargar reporte estructura de giro",
      },
      { status: 500 }
    )
  }
}
