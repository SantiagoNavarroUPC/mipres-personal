import {
  fetchUsuarios,
  fetchRolesUsuarios,
  patchUsuarioActivo,
  patchUsuarioRol,
  type UsuarioMipres,
} from "@/requests/Backend/usuarios.request"
import { crearRolRequest, patchRolEstadoRequest } from "@/requests/Backend/roles.request"

export interface CrearRolResult {
  success: boolean
  message?: string
  data?: unknown
  status?: number
  error?: string
}

export async function crearRol(
  nombre: string,
  descripcion: string | null,
  estado: boolean,
  authToken: string
): Promise<CrearRolResult> {
  const token = authToken.trim()
  if (!token) {
    return {
      success: false,
      status: 401,
      error: "Token JWT requerido",
    }
  }
  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return {
      success: false,
      status: 400,
      error: "nombre es requerido",
    }
  }
  const response = await crearRolRequest(nombre.trim(), descripcion, estado, token)
  if (!response.success) {
    return {
      success: false,
      status: response.status,
      error: response.message || "No se pudo crear el rol",
    }
  }
  return {
    success: true,
    status: response.status,
    message: response.message || "Rol creado",
    data: response.data,
  }
}

export async function actualizarEstadoRol(
  consecutivoRol: number,
  estado: boolean,
  authToken: string
): Promise<ActualizarRolResult> {
  const token = authToken.trim()

  if (!Number.isFinite(consecutivoRol) || consecutivoRol <= 0) {
    return {
      success: false,
      status: 400,
      error: "consecutivo_rol es requerido",
    }
  }

  if (typeof estado !== "boolean") {
    return {
      success: false,
      status: 400,
      error: "estado es requerido",
    }
  }

  if (!token) {
    return {
      success: false,
      status: 401,
      error: "Token JWT requerido",
    }
  }

  const response = await patchRolEstadoRequest(consecutivoRol, estado, token)

  if (!response.success) {
    return {
      success: false,
      status: response.status,
      error: response.message || "No se pudo actualizar el estado del rol",
    }
  }

  return {
    success: true,
    status: response.status,
    message: response.message || "Estado del rol actualizado",
  }
}
import {
  type RolUsuarioSimple,
  buildActualizarRolPayload,
  buildActualizarUsuarioPayload,
  extractRoles,
  extractUsuarios,
} from "./usuarios-procesos.controller"

export interface UsuariosResult {
  success: boolean
  message?: string
  data?: UsuarioMipres[]
  total?: number
  status?: number
  error?: string
}

export interface RolesResult {
  success: boolean
  message?: string
  data?: RolUsuarioSimple[]
  total?: number
  status?: number
  error?: string
}

export interface ActualizarUsuarioResult {
  success: boolean
  message?: string
  status?: number
  error?: string
}

export interface ActualizarRolResult {
  success: boolean
  message?: string
  status?: number
  error?: string
}

export async function listarUsuarios(authToken: string): Promise<UsuariosResult> {
  const token = authToken.trim()
  if (!token) {
    return {
      success: false,
      status: 401,
      error: "Token JWT requerido",
    }
  }

  const response = await fetchUsuarios(token)
  if (!response.success) {
    return {
      success: false,
      status: response.status,
      error: response.message || "No se pudieron consultar usuarios",
    }
  }

  const usuarios = extractUsuarios(response.data)

  return {
    success: true,
    status: response.status,
    message: response.message,
    data: usuarios,
    total: usuarios.length,
  }
}

export async function actualizarUsuarioActivo(
  idUsuarioMipres: string,
  usuarioActivo: boolean,
  authToken: string
): Promise<ActualizarUsuarioResult> {
  const id = idUsuarioMipres.trim()
  const token = authToken.trim()

  if (!id) {
    return {
      success: false,
      status: 400,
      error: "id_usuario_mipres es requerido",
    }
  }

  if (!token) {
    return {
      success: false,
      status: 401,
      error: "Token JWT requerido",
    }
  }

  const payload = buildActualizarUsuarioPayload(usuarioActivo)
  const response = await patchUsuarioActivo(id, payload.usuario_activo, token)

  if (!response.success) {
    return {
      success: false,
      status: response.status,
      error: response.message || "No se pudo actualizar el usuario",
    }
  }

  return {
    success: true,
    status: response.status,
    message: response.message || "Usuario actualizado",
  }
}

export async function listarRoles(authToken: string): Promise<RolesResult> {
  const token = authToken.trim()
  if (!token) {
    return {
      success: false,
      status: 401,
      error: "Token JWT requerido",
    }
  }

  const response = await fetchRolesUsuarios(token)
  if (!response.success) {
    return {
      success: false,
      status: response.status,
      error: response.message || "No se pudieron consultar roles",
    }
  }

  const roles = extractRoles(response.data)

  return {
    success: true,
    status: response.status,
    message: response.message,
    data: roles,
    total: roles.length,
  }
}

export async function actualizarUsuarioRol(
  idUsuarioMipres: string,
  consecutivoRol: number,
  authToken: string
): Promise<ActualizarRolResult> {
  const id = idUsuarioMipres.trim()
  const token = authToken.trim()

  if (!id) {
    return {
      success: false,
      status: 400,
      error: "id_usuario_mipres es requerido",
    }
  }

  if (!Number.isFinite(consecutivoRol) || consecutivoRol <= 0) {
    return {
      success: false,
      status: 400,
      error: "consecutivo_rol es requerido",
    }
  }

  if (!token) {
    return {
      success: false,
      status: 401,
      error: "Token JWT requerido",
    }
  }

  const payload = buildActualizarRolPayload(id, consecutivoRol)
  const response = await patchUsuarioRol(payload.id_usuario_mipres, payload.rol_mipres, token)

  if (!response.success) {
    return {
      success: false,
      status: response.status,
      error: response.message || "No se pudo actualizar el rol",
    }
  }

  return {
    success: true,
    status: response.status,
    message: response.message || "Rol actualizado",
  }
}
