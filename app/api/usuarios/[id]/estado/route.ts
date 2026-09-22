import { NextRequest, NextResponse } from "next/server"
import { actualizarUsuarioActivo } from "@/controllers/usuarios-controller/usuarios.controller"

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
    const body = (await request.json()) as { usuario_activo?: unknown }
    const usuarioActivo = typeof body?.usuario_activo === "boolean" ? body.usuario_activo : null

    if (usuarioActivo === null) {
      return NextResponse.json(
        { success: false, message: "usuario_activo es requerido" },
        { status: 400 }
      )
    }

    const result = await actualizarUsuarioActivo(id, usuarioActivo, authToken)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "No se pudo actualizar el estado" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: result.message || "Estado actualizado" },
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