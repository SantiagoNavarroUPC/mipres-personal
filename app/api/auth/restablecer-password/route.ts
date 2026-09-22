import { NextRequest, NextResponse } from "next/server"
import { restablecerPasswordUsuario } from "@/controllers"

function getAuthToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  return header ? header.trim() : ""
}

export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json(
        { success: false, message: "Authorization requerido" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const id_usuario_mipres = typeof body?.id_usuario_mipres === "number"
      ? body.id_usuario_mipres
      : Number(body?.id_usuario_mipres)
    const nueva_password = typeof body?.nueva_password === "string" ? body.nueva_password : ""

    if (!Number.isFinite(id_usuario_mipres) || id_usuario_mipres <= 0 || !nueva_password) {
      return NextResponse.json(
        { success: false, message: "id_usuario_mipres y nueva_password son requeridos" },
        { status: 400 }
      )
    }

    const result = await restablecerPasswordUsuario({ id_usuario_mipres, nueva_password, authToken })

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "No se pudo restablecer la contraseña" },
        { status: result.status || 400 }
      )
    }

    return NextResponse.json(
      { success: true, message: result.message || "Contraseña restablecida exitosamente" },
      { status: result.status || 200 }
    )
  } catch {
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
