import { NextRequest, NextResponse } from "next/server"
import { obtenerModulosController } from "@/controllers/permisos-controller/permisos.controller"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || undefined
    const result = await obtenerModulosController(authHeader)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al obtener módulos" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    console.error("Error en GET /api/permisos/modulos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
