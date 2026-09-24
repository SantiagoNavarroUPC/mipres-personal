import { NextResponse } from "next/server"
import { renovarSesion } from "@/controllers"

/**
 * Renueva la sesion usando el refresh token guardado en el navegador, sin
 * volver a pedir usuario/contrasena. Reemplaza el mecanismo anterior que
 * reautenticaba con la contrasena guardada en secureStorage.
 */
export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken || typeof refreshToken !== "string") {
      return NextResponse.json(
        { message: "refreshToken es requerido" },
        { status: 400 }
      )
    }

    const result = await renovarSesion(refreshToken)

    if (!result.success || !result.session) {
      return NextResponse.json(
        { message: result.error || "No fue posible renovar la sesión", details: result.details },
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
      nit: result.session.nit ?? null,
      nombre_empresa: result.session.nombreEmpresa ?? null,
      direccion_empresa: result.session.direccionEmpresa ?? null,
      municipio_empresa: result.session.municipioEmpresa ?? null,
      municipio_codigo_empresa: result.session.municipioCodigoEmpresa ?? null,
      departamento_empresa: result.session.departamentoEmpresa ?? null,
      departamento_codigo_empresa: result.session.departamentoCodigoEmpresa ?? null,
      id_tipo_empresa: result.session.idTipoEmpresa ?? null,
    })
  } catch {
    return NextResponse.json(
      { message: "Error procesando solicitud" },
      { status: 500 }
    )
  }
}
