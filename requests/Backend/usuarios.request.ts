const DUSAKAWI_API_URL = process.env.DUSAKAWI_API_URL

export interface RolUsuario {
  consecutivo_rol: number
  rol_nombre: string
  rol_descripcion?: string
}

export interface UsuarioMipres {
  id_usuario_mipres: string
  numero_identificacion: string
  rol: RolUsuario
  usuario_activo: boolean
}

export interface RolesApiResponse {
  success: boolean
  message?: string
  data?: unknown
}

interface UsuariosApiResponse {
  success: boolean
  message?: string
  data?: unknown
  total?: number
}

interface RequestResult<T = unknown> {
  success: boolean
  status: number
  message?: string
  data?: T
  raw?: unknown
}

function withAuthHeader(token: string): Record<string, string> {
  const normalized = token.trim().toLowerCase().startsWith("bearer ") ? token.trim() : `Bearer ${token.trim()}`
  return {
    Authorization: normalized,
    Accept: "application/json",
  }
}

function tryParseJson(raw: string): unknown {
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export async function fetchUsuarios(authToken: string): Promise<RequestResult<UsuariosApiResponse>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/usuarios`, {
    method: "GET",
    headers: withAuthHeader(authToken),
    cache: "no-store",
  })

  const rawText = await response.text()
  const parsed = tryParseJson(rawText)
  const body = (parsed ?? {}) as UsuariosApiResponse

  return {
    success: response.ok && body.success !== false,
    status: response.status,
    message: body.message,
    data: body,
    raw: parsed,
  }
}

export async function patchUsuarioActivo(
  idUsuarioMipres: string,
  usuarioActivo: boolean,
  authToken: string
): Promise<RequestResult<UsuariosApiResponse>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/usuarios/${encodeURIComponent(idUsuarioMipres)}/estado`, {
    method: "PATCH",
    headers: {
      ...withAuthHeader(authToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      usuario_activo: usuarioActivo,
    }),
    cache: "no-store",
  })

  const rawText = await response.text()
  const parsed = tryParseJson(rawText)
  const body = (parsed ?? {}) as UsuariosApiResponse

  return {
    success: response.ok && body.success !== false,
    status: response.status,
    message: body.message,
    data: body,
    raw: parsed,
  }
}

export async function fetchRolesUsuarios(authToken: string): Promise<RequestResult<RolesApiResponse>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/usuarios/roles`, {
    method: "GET",
    headers: withAuthHeader(authToken),
    cache: "no-store",
  })

  const rawText = await response.text()
  const parsed = tryParseJson(rawText)
  const body = (parsed ?? {}) as RolesApiResponse

  return {
    success: response.ok && body.success !== false,
    status: response.status,
    message: body.message,
    data: body,
    raw: parsed,
  }
}

export async function patchUsuarioRol(
  idUsuarioMipres: string,
  consecutivoRol: number,
  authToken: string
): Promise<RequestResult<RolesApiResponse>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/usuarios/${encodeURIComponent(idUsuarioMipres)}/rol`, {
    method: "PATCH",
    headers: {
      ...withAuthHeader(authToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rol_mipres: consecutivoRol,
    }),
    cache: "no-store",
  })

  const rawText = await response.text()
  const parsed = tryParseJson(rawText)
  const body = (parsed ?? {}) as RolesApiResponse

  return {
    success: response.ok && body.success !== false,
    status: response.status,
    message: body.message,
    data: body,
    raw: parsed,
  }
}
