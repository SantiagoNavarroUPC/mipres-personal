import type {
  AuthLoginRequest,
  AuthLoginResult,
  AuthRegisterRequest,
  AuthRegisterResult,
  AuthRestablecerPasswordRequest,
  AuthRestablecerPasswordResult,
  RolMipres,
} from "@/models/credentials.model"
import { fetchAuthLogin, fetchAuthRefresh, fetchAuthRegister, fetchAuthRestablecerPassword } from "@/requests/auth.request"

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

export async function autenticarUsuario(payload: AuthLoginRequest): Promise<AuthLoginResult> {
  try {
    const usuario = payload.usuario.trim()
    const contrasena = payload.contrasena

    if (!usuario || !contrasena) {
      return {
        success: false,
        error: "Usuario y contraseña son requeridos",
      }
    }

    const result = await fetchAuthLogin({ usuario, contrasena })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "No fue posible iniciar sesión",
        details: result.details,
        status: result.status,
      }
    }

    if (!result.data.token || !result.data.usuario || typeof result.data.rol_mipres !== "number") {
      return {
        success: false,
        error: "La respuesta del servicio de autenticación es inválida",
      }
    }

    // Preserve the exact role id returned by the authentication service.
    const rolMipres = (result.data.rol_mipres as RolMipres)
    const rolNombre = typeof result.data.rol_nombre === "string" && result.data.rol_nombre.trim() ? String(result.data.rol_nombre).trim() : undefined

    return {
      success: true,
      session: {
        authToken: result.data.token,
        expiresIn: typeof result.data.expiresIn === "number" ? result.data.expiresIn : undefined,
        refreshToken: result.data.refreshToken,
        refreshExpiresIn: typeof result.data.refreshExpiresIn === "number" ? result.data.refreshExpiresIn : undefined,
        usuario: result.data.usuario,
        rolMipres,
        rolNombre,
      },
      status: result.status,
    }
  } catch (error) {
    return {
      success: false,
      error: "Error procesando autenticación",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function renovarSesion(refreshToken: string): Promise<AuthLoginResult> {
  try {
    const token = refreshToken.trim()

    if (!token) {
      return {
        success: false,
        error: "refreshToken es requerido",
        status: 400,
      }
    }

    const result = await fetchAuthRefresh(token)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "No fue posible renovar la sesión",
        details: result.details,
        status: result.status,
      }
    }

    if (!result.data.token || !result.data.usuario || typeof result.data.rol_mipres !== "number") {
      return {
        success: false,
        error: "La respuesta del servicio de autenticación es inválida",
      }
    }

    const rolMipres = (result.data.rol_mipres as RolMipres)
    const rolNombre = typeof result.data.rol_nombre === "string" && result.data.rol_nombre.trim() ? String(result.data.rol_nombre).trim() : undefined

    return {
      success: true,
      session: {
        authToken: result.data.token,
        expiresIn: typeof result.data.expiresIn === "number" ? result.data.expiresIn : undefined,
        refreshToken: result.data.refreshToken,
        refreshExpiresIn: typeof result.data.refreshExpiresIn === "number" ? result.data.refreshExpiresIn : undefined,
        usuario: result.data.usuario,
        rolMipres,
        rolNombre,
      },
      status: result.status,
    }
  } catch (error) {
    return {
      success: false,
      error: "Error procesando la renovación de sesión",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function restablecerPasswordUsuario(payload: AuthRestablecerPasswordRequest): Promise<AuthRestablecerPasswordResult> {
  try {
    const id_usuario_mipres = Number(payload.id_usuario_mipres)
    const nueva_password = payload.nueva_password
    const authToken = payload.authToken.trim()

    if (!Number.isFinite(id_usuario_mipres) || id_usuario_mipres <= 0) {
      return { success: false, error: "id_usuario_mipres es requerido y debe ser un número válido", status: 400 }
    }

    if (!nueva_password || !authToken) {
      return { success: false, error: "nueva_password y authToken son requeridos", status: 400 }
    }

    if (nueva_password.length < 6) {
      return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres", status: 400 }
    }

    const result = await fetchAuthRestablecerPassword({ id_usuario_mipres, nueva_password, authToken })

    if (!result.success) {
      return {
        success: false,
        error: result.error || "No se pudo restablecer la contraseña",
        details: result.details,
        status: result.status,
      }
    }

    return {
      success: true,
      message: result.data?.message || "Contraseña restablecida exitosamente",
      status: result.status,
    }
  } catch (error) {
    return {
      success: false,
      error: "Error procesando el restablecimiento de contraseña",
      details: error instanceof Error ? error.message : "Error desconocido",
      status: 500,
    }
  }
}

export async function registrarUsuarioMipres(payload: AuthRegisterRequest): Promise<AuthRegisterResult> {
  try {
    const usuario = payload.usuario.trim()
    const password = payload.password
    const rolMipres =
      typeof payload.rol_mipres === "number" && Number.isFinite(payload.rol_mipres) && payload.rol_mipres > 0
        ? payload.rol_mipres
        : 3

    if (!usuario || !password) {
      return {
        success: false,
        error: "Datos inválidos",
        status: 400,
      }
    }

    const result = await fetchAuthRegister({ usuario, password, rol_mipres: rolMipres })

    if (!result.success) {
      return {
        success: false,
        error: result.error || getRegisterMessageByStatus(result.status),
        details: result.details,
        status: result.status,
      }
    }

    return {
      success: true,
      message: result.data?.message || getRegisterMessageByStatus(result.status),
      status: result.status,
    }
  } catch (error) {
    return {
      success: false,
      error: getRegisterMessageByStatus(400),
      details: error instanceof Error ? error.message : "Error desconocido",
      status: 400,
    }
  }
}