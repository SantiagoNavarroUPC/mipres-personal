import type {
  AuthLoginApiResponse,
  AuthLoginRequest,
  AuthRegisterApiResponse,
  AuthRegisterRequest,
  AuthRestablecerPasswordRequest,
} from "@/models/credentials.model"

const DUSAKAWI_API_URL = process.env.DUSAKAWI_API_URL

export const AUTH_ENDPOINTS = {
  login: `${DUSAKAWI_API_URL}/api/auth/login`,
  refresh: `${DUSAKAWI_API_URL}/api/auth/refresh`,
  registerMipres: `${DUSAKAWI_API_URL}/api/auth/registro-mipres`,
  restablecerPassword: `${DUSAKAWI_API_URL}/api/auth/restablecer-password`,
}

function tryParseJson<T>(rawData: string): T | undefined {
  if (!rawData) return undefined

  try {
    return JSON.parse(rawData) as T
  } catch {
    return undefined
  }
}

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

export async function fetchAuthLogin(payload: AuthLoginRequest): Promise<{
  success: boolean
  data?: AuthLoginApiResponse
  error?: string
  details?: string
  status?: number
}> {
  try {
    const requestBody = {
      usuario: payload.usuario,
      contrasena: payload.contrasena,
      username: payload.usuario,
      password: payload.contrasena,
    }

    const response = await fetch(AUTH_ENDPOINTS.login, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    })

    const rawData = await response.text()
    const data = tryParseJson<Partial<AuthLoginApiResponse> & { message?: string; error?: string; details?: string }>(rawData)

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || "Credenciales incorrectas",
        details: data?.details,
        status: response.status,
      }
    }

    return {
      success: true,
      data: data as AuthLoginApiResponse,
      status: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: "No fue posible conectar con el servicio de autenticación",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function fetchAuthRefresh(refreshToken: string): Promise<{
  success: boolean
  data?: AuthLoginApiResponse
  error?: string
  details?: string
  status?: number
}> {
  try {
    const response = await fetch(AUTH_ENDPOINTS.refresh, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })

    const rawData = await response.text()
    const data = tryParseJson<Partial<AuthLoginApiResponse> & { message?: string; error?: string; details?: string }>(rawData)

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || "No fue posible renovar la sesión",
        details: data?.details,
        status: response.status,
      }
    }

    return {
      success: true,
      data: data as AuthLoginApiResponse,
      status: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: "No fue posible conectar con el servicio de autenticación",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function fetchAuthRegister(payload: AuthRegisterRequest): Promise<{
  success: boolean
  data?: AuthRegisterApiResponse
  error?: string
  details?: string
  status?: number
}> {
  try {
    const response = await fetch(AUTH_ENDPOINTS.registerMipres, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        usuario: payload.usuario,
        password: payload.password,
        rol_mipres:
          typeof payload.rol_mipres === "number" && Number.isFinite(payload.rol_mipres) && payload.rol_mipres > 0
            ? payload.rol_mipres
            : 3,
        id_empresa: payload.id_empresa,
      }),
      cache: "no-store",
    })

    const rawData = await response.text()
    const data = tryParseJson<AuthRegisterApiResponse & { error?: string; details?: string }>(rawData)

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || getRegisterMessageByStatus(response.status),
        details: data?.details,
        status: response.status,
      }
    }

    return {
      success: true,
      data: data || { message: getRegisterMessageByStatus(response.status) },
      status: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: "No fue posible conectar con el servicio de registro",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function fetchAuthRestablecerPassword(payload: AuthRestablecerPasswordRequest): Promise<{
  success: boolean
  data?: { message?: string }
  error?: string
  details?: string
  status?: number
}> {
  try {
    const baseUrl = process.env.DUSAKAWI_API_URL
    if (!baseUrl) {
      return { success: false, error: "URL del backend no configurada", status: 500 }
    }

    const authHeader = payload.authToken.trim()
    const normalizedAuth = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader
      : `Bearer ${authHeader}`

    const response = await fetch(`${baseUrl}/api/auth/restablecer-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: normalizedAuth,
      },
      body: JSON.stringify({
        id_usuario_mipres: payload.id_usuario_mipres,
        nueva_password: payload.nueva_password,
      }),
      cache: "no-store",
    })

    const rawData = await response.text()
    const data = tryParseJson<{ success?: boolean; message?: string; error?: string; details?: string }>(rawData)

    if (!response.ok || data?.success === false) {
      return {
        success: false,
        error: data?.message || data?.error || "No se pudo restablecer la contraseña",
        details: data?.details,
        status: response.status,
      }
    }

    return {
      success: true,
      data: { message: data?.message || "Contraseña restablecida exitosamente" },
      status: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: "No fue posible conectar con el servicio de autenticación",
      details: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}