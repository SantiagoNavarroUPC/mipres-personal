import { NextRequest, NextResponse } from "next/server"
import { guardarTokensValidadosController } from "@/controllers/empresa-controller/empresa.controller"

function getAuthToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  return header ? header.trim() : ""
}

export async function PUT(request: NextRequest) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json({ success: false, message: "Authorization requerido" }, { status: 401 })
    }

    const body = await request.json()
    const result = await guardarTokensValidadosController(
      {
        token_subsidiado_validado: body?.token_subsidiado_validado ?? null,
        token_contributivo_validado: body?.token_contributivo_validado ?? null,
      },
      authToken
    )

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error || "No se pudo guardar el token de acceso" }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, message: result.message, data: result.data }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Error interno" }, { status: 500 })
  }
}
