import { NextRequest, NextResponse } from "next/server"
import { listarRoles } from "@/controllers/usuarios-controller/usuarios.controller"
import { crearRol } from "@/controllers/usuarios-controller/usuarios.controller"
import { actualizarEstadoRol } from "@/controllers/usuarios-controller/usuarios.controller"
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
    const nombre = typeof body?.nombre === "string"
      ? body.nombre.trim()
      : typeof body?.rol_nombre === "string"
        ? body.rol_nombre.trim()
        : ""
    const descripcion = typeof body?.descripcion === "string"
      ? body.descripcion.trim()
      : typeof body?.rol_descripcion === "string"
        ? body.rol_descripcion.trim()
        : ""
    const estado = typeof body?.estado === "boolean" ? body.estado : true

    if (!nombre) {
      return NextResponse.json(
        { success: false, message: "nombre es requerido" },
        { status: 400 }
      )
    }
    const result = await crearRol(nombre, descripcion || null, estado, authToken)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "No se pudo crear el rol" },
        { status: result.status || 500 }
      )
    }
    return NextResponse.json(
      {
        success: true,
        message: result.message || "Rol creado",
        data: result.data || null,
      },
      { status: 201 }
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

export async function PATCH(request: NextRequest) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json(
        { success: false, message: "Authorization requerido" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const consecutivoRol =
      typeof body?.consecutivo_rol === "number"
        ? body.consecutivo_rol
        : Number(body?.consecutivo_rol)
    const estado = typeof body?.estado === "boolean" ? body.estado : undefined

    if (!Number.isFinite(consecutivoRol) || consecutivoRol <= 0) {
      return NextResponse.json(
        { success: false, message: "consecutivo_rol es requerido" },
        { status: 400 }
      )
    }

    if (typeof estado !== "boolean") {
      return NextResponse.json(
        { success: false, message: "estado es requerido" },
        { status: 400 }
      )
    }

    const result = await actualizarEstadoRol(consecutivoRol, estado, authToken)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "No se pudo actualizar el estado del rol" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: result.message || "Estado del rol actualizado" },
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

function getAuthToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  return header ? header.trim() : ""
}

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json(
        { success: false, message: "Authorization requerido" },
        { status: 401 }
      )
    }

    const result = await listarRoles(authToken)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "No se pudieron consultar roles" },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message || "Roles consultados",
        data: result.data || [],
        total: result.total || 0,
      },
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