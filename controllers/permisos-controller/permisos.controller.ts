import { obtenerPermisosPorRol, actualizarPermiso, agregarPermiso } from "@/requests/Backend/permisos.requests"
import type { Permiso, PermisosResponse } from "@/models/permisos.model"

export interface ObtenerPermisosResult {
  success: boolean
  message?: string
  data?: PermisosResponse
  status?: number
  error?: string
}

export interface ActualizarPermisoResult {
  success: boolean
  message?: string
  data?: Permiso
  status?: number
  error?: string
}

export interface CrearPermisoResult {
  success: boolean
  message?: string
  data?: Permiso
  status?: number
  error?: string
}

/**
 * Obtiene los permisos para un rol específico
 */
export async function obtenerPermisosPorRolController(
  consecutivoRol: number,
  authToken?: string
): Promise<ObtenerPermisosResult> {
  try {
    // Validar que consecutivoRol sea un número válido
    if (!Number.isFinite(consecutivoRol) || consecutivoRol <= 0) {
      return {
        success: false,
        status: 400,
        error: "consecutivo_rol debe ser un número válido mayor a 0",
      }
    }

    if (!authToken || !String(authToken).trim()) {
      return {
        success: false,
        status: 401,
        error: "Token de autorización requerido",
      }
    }

    const permisos = await obtenerPermisosPorRol(consecutivoRol, authToken)

    return {
      success: true,
      status: 200,
      message: "Permisos obtenidos exitosamente",
      data: {
        permisos,
        rol: consecutivoRol,
      },
    }
  } catch (error) {
    console.error("Error en obtenerPermisosPorRolController:", error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error interno del servidor",
    }
  }
}

/**
 * Actualiza el estado de un permiso
 */
export async function actualizarPermisoController(
  consecutivoRol: number,
  moduloId: string,
  activo: boolean,
  authToken?: string
): Promise<ActualizarPermisoResult> {
  try {
    // Validar parámetros
    if (!Number.isFinite(consecutivoRol) || consecutivoRol <= 0) {
      return {
        success: false,
        status: 400,
        error: "consecutivo_rol debe ser un número válido mayor a 0",
      }
    }

    if (!moduloId || typeof moduloId !== "string" || !moduloId.trim()) {
      return {
        success: false,
        status: 400,
        error: "modulo_id es requerido",
      }
    }

    if (typeof activo !== "boolean") {
      return {
        success: false,
        status: 400,
        error: "activo debe ser un booleano",
      }
    }

    const permiso = await actualizarPermiso(consecutivoRol, moduloId, activo, authToken)

    return {
      success: true,
      status: 200,
      message: "Permiso actualizado exitosamente",
      data: permiso,
    }
  } catch (error) {
    console.error("Error en actualizarPermisoController:", error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error interno del servidor",
    }
  }
}

/**
 * Crea un nuevo permiso
 */
export async function crearPermisoController(
  consecutivoRol: number,
  moduloId: string,
  activo: boolean = true,
  authToken?: string
): Promise<CrearPermisoResult> {
  try {
    // Validar parámetros
    if (!Number.isFinite(consecutivoRol) || consecutivoRol <= 0) {
      return {
        success: false,
        status: 400,
        error: "consecutivo_rol debe ser un número válido mayor a 0",
      }
    }

    if (!moduloId || typeof moduloId !== "string" || !moduloId.trim()) {
      return {
        success: false,
        status: 400,
        error: "modulo_id es requerido",
      }
    }

    if (typeof activo !== "boolean") {
      return {
        success: false,
        status: 400,
        error: "activo debe ser un booleano",
      }
    }

    const permiso = await agregarPermiso(consecutivoRol, moduloId, activo, authToken)

    return {
      success: true,
      status: 201,
      message: "Permiso creado exitosamente",
      data: permiso,
    }
  } catch (error) {
    console.error("Error en crearPermisoController:", error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error interno del servidor",
    }
  }
}
