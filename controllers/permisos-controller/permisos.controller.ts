import { obtenerPermisosPorRol, actualizarPermiso, agregarPermiso, obtenerModulos } from "@/requests/Backend/permisos.requests"
import type { Permiso, PermisosResponse, ModuloApp } from "@/models/permisos.model"

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

export interface ObtenerModulosResult {
  success: boolean
  message?: string
  data?: ModuloApp[]
  status?: number
  error?: string
}

/**
 * Obtiene el listado real de módulos (mipres.modulos_app)
 */
export async function obtenerModulosController(authToken?: string): Promise<ObtenerModulosResult> {
  try {
    if (!authToken || !String(authToken).trim()) {
      return {
        success: false,
        status: 401,
        error: "Token de autorización requerido",
      }
    }

    const modulos = await obtenerModulos(authToken)

    return {
      success: true,
      status: 200,
      message: "Módulos obtenidos exitosamente",
      data: modulos,
    }
  } catch (error) {
    console.error("Error en obtenerModulosController:", error)
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error interno del servidor",
    }
  }
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
  moduloId: number,
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

    if (!Number.isFinite(moduloId) || moduloId <= 0) {
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
  moduloId: number,
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

    if (!Number.isFinite(moduloId) || moduloId <= 0) {
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
