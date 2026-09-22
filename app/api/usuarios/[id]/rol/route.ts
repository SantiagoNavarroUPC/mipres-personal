import { NextRequest, NextResponse } from "next/server"
import { actualizarUsuarioRol } from "@/controllers/usuarios-controller/usuarios.controller"

function getAuthToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  return header ? header.trim() : ""
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json(
        { success: false, message: "Authorization requerido" },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const body = (await request.json()) as { rol_mipres?: unknown; consecutivo_rol?: unknown }
    const consecutivoRol =
      typeof body?.rol_mipres === "number"
        ? body.rol_mipres
        : Number(body?.consecutivo_rol)

    if (!Number.isFinite(consecutivoRol) || consecutivoRol <= 0) {
      return NextResponse.json(
        { success: false, message: "rol_mipres es requerido" },
        { status: 400 }
      )
    }

    const result = await actualizarUsuarioRol(id, consecutivoRol, authToken)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "No se pudo actualizar el rol" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: result.message || "Rol actualizado" },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    )
  }
}