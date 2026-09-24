import { NextResponse } from "next/server"
import { registrarUsuarioMipres } from "@/controllers"

function getRegisterMessageByStatus(status?: number): string {
  switch (status) {
    case 200:
      return "Usuario registrado exitosamente en MIPRES"
    case 400:
      return "Datos inválidos"
    case 404:
      return "Usuario no encontrado en sistema administrativo"
    case 409:
      return "Usuario ya registrado"
    default:
      return "No fue posible registrar el usuario"
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const usuario = typeof body?.usuario === "string" ? body.usuario : ""
    const password = typeof body?.password === "string" ? body.password : ""
    const rolMipres =
      typeof body?.rol_mipres === "number"
        ? body.rol_mipres
        : Number(body?.rol_mipres)
    const idEmpresa = Number(body?.id_empresa)

    if (!usuario || !password) {
      return NextResponse.json(
        { message: getRegisterMessageByStatus(400) },
        { status: 400 }
      )
    }

    if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
      return NextResponse.json(
        { message: "Empresa es requerida" },
        { status: 400 }
      )
    }

    const result = await registrarUsuarioMipres({
      usuario,
      password,
      rol_mipres: Number.isFinite(rolMipres) && rolMipres > 0 ? rolMipres : 3,
      id_empresa: idEmpresa,
    })

    if (!result.success) {
      return NextResponse.json(
        { message: result.error || getRegisterMessageByStatus(result.status), details: result.details },
        { status: result.status || 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message || getRegisterMessageByStatus(result.status),
      },
      { status: result.status || 200 }
    )
  } catch {
    return NextResponse.json(
      { message: getRegisterMessageByStatus(400) },
      { status: 400 }
    )
  }
}
