import { NextRequest, NextResponse } from "next/server"
import { actualizarEmpresaController, eliminarEmpresaController } from "@/controllers/empresa-controller/empresa.controller"

function getAuthToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  return header ? header.trim() : ""
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id_empresa: string }> }
) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json({ success: false, message: "Authorization requerido" }, { status: 401 })
    }

    const { id_empresa } = await context.params
    const idEmpresa = Number(id_empresa)
    const body = await request.json()

    const result = await actualizarEmpresaController(
      idEmpresa,
      {
        nit: body?.nit,
        nombre: body?.nombre,
        direccion: body?.direccion ?? null,
        id_municipio: Number(body?.id_municipio),
        id_tipo_empresa: Number(body?.id_tipo_empresa),
      },
      authToken
    )

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error || "No se pudo actualizar la empresa" }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, message: result.message, data: result.data }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id_empresa: string }> }
) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json({ success: false, message: "Authorization requerido" }, { status: 401 })
    }

    const { id_empresa } = await context.params
    const idEmpresa = Number(id_empresa)

    const result = await eliminarEmpresaController(idEmpresa, authToken)
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error || "No se pudo eliminar la empresa" }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, message: result.message }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Error interno" }, { status: 500 })
  }
}
