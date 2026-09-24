import { NextRequest, NextResponse } from "next/server"
import { listarEmpresasController, crearEmpresaController } from "@/controllers/empresa-controller/empresa.controller"

function getAuthToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  return header ? header.trim() : ""
}

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json({ success: false, message: "Authorization requerido" }, { status: 401 })
    }

    const result = await listarEmpresasController(authToken)
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error || "No se pudieron consultar empresas" }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, data: result.data || [] }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Error interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json({ success: false, message: "Authorization requerido" }, { status: 401 })
    }

    const body = await request.json()
    const result = await crearEmpresaController(
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
      return NextResponse.json({ success: false, message: result.error || "No se pudo crear la empresa" }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, message: result.message, data: result.data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Error interno" }, { status: 500 })
  }
}
