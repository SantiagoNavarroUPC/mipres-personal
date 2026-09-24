import { NextRequest, NextResponse } from "next/server"
import { guardarTokensFuenteController } from "@/controllers/empresa-controller/empresa.controller"

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
    const result = await guardarTokensFuenteController(
      {
        token_subsidiado: body?.token_subsidiado ?? null,
        token_contributivo: body?.token_contributivo ?? null,
      },
      authToken
    )

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error || "No se pudieron guardar las credenciales" }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, message: result.message, data: result.data }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Error interno" }, { status: 500 })
  }
}
