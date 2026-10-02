import { NextRequest, NextResponse } from "next/server"
import { registrarEntregaCodigos } from "@/controllers/mipres-controller/entrega-controller/entrega.controller"

export async function POST(request: NextRequest) {
  try {
    const { nit, tokenAcceso, payload } = await request.json()

    if (!nit || !tokenAcceso) {
      return NextResponse.json(
        { success: false, error: "NIT y token son requeridos" },
        { status: 400 }
      )
    }

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Datos de entrega códigos requeridos" },
        { status: 400 }
      )
    }

    const result = await registrarEntregaCodigos({ nit, tokenAcceso }, payload)

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data })
    }

    return NextResponse.json(
      { success: false, error: result.error, details: result.details },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
