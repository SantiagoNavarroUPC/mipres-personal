import { NextRequest, NextResponse } from "next/server"
import { fetchGenerarToken } from "@/requests/mipres-sispro/token.request"

export async function POST(request: NextRequest) {
  try {
    const { nit, token } = await request.json()

    if (!nit || !token) {
      return NextResponse.json(
        { success: false, error: "NIT y Token son requeridos" },
        { status: 400 }
      )
    }

    // Solicitar a MIPRES
    const result = await fetchGenerarToken(nit, token)

    if (result.success && result.tokenAcceso) {
      return NextResponse.json({
        success: true,
        message: "Token de acceso generado exitosamente",
        tokenAcceso: result.tokenAcceso,
      })
    }

    return NextResponse.json({
      success: false,
      error: result.error || "Error al generar token",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error de conexion con el servidor MIPRES",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
