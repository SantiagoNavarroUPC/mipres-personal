import { NextResponse } from "next/server"
import { autenticarUsuario } from "@/controllers"

export async function POST(request: Request) {
  try {
    const { usuario, contrasena } = await request.json()

    if (!usuario || !contrasena) {
      return NextResponse.json(
        { message: "Usuario y contraseña son requeridos" },
        { status: 400 }
      )
    }

    const result = await autenticarUsuario({ usuario, contrasena })

    if (!result.success || !result.session) {
      return NextResponse.json(
        { message: result.error || "Credenciales incorrectas", details: result.details },
        { status: result.status || 401 }
      )
    }

    return NextResponse.json({
      success: true,
      token: result.session.authToken,
      expiresIn: result.session.expiresIn,
      refreshToken: result.session.refreshToken,
      refreshExpiresIn: result.session.refreshExpiresIn,
      usuario: result.session.usuario,
      rol_mipres: result.session.rolMipres,
      rol_nombre: result.session.rolNombre ?? null,
    })
  } catch {
    return NextResponse.json(
      { message: "Error procesando solicitud" },
      { status: 500 }
    )
  }
}
