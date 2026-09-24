import { NextRequest, NextResponse } from "next/server"
import {
  obtenerPermisosPorRolController,
  actualizarPermisoController,
  crearPermisoController,
} from "@/controllers/permisos-controller/permisos.controller"

export async function GET(request: NextRequest) {
  try {
    const consecutivoRolParam = request.nextUrl.searchParams.get("consecutivo_rol")

    if (!consecutivoRolParam) {
      return NextResponse.json(
        { error: "consecutivo_rol es requerido" },
        { status: 400 }
      )
    }

    const consecutivoRol = parseInt(consecutivoRolParam, 10)
    const authHeader = request.headers.get("authorization") || undefined
    const result = await obtenerPermisosPorRolController(consecutivoRol, authHeader)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al obtener permisos" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    console.error("Error en GET /api/permisos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { consecutivo_rol, modulo_id, activo } = await request.json()
    const authHeader = request.headers.get("authorization") || undefined

    const result = await actualizarPermisoController(consecutivo_rol, Number(modulo_id), activo, authHeader)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al actualizar permiso" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    console.error("Error en PATCH /api/permisos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { consecutivo_rol, modulo_id, activo } = await request.json()
    const authHeader = request.headers.get("authorization") || undefined

    const result = await crearPermisoController(consecutivo_rol, Number(modulo_id), activo ?? true, authHeader)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al crear permiso" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    console.error("Error en POST /api/permisos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
