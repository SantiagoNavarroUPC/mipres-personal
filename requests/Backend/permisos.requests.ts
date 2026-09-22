import type { Permiso, PermisosResponse } from "@/models/permisos.model"
import { MODULOS } from "@/models/permisos.model"
import { getBackendApiUrl } from "@/lib/env"

const isBrowser = typeof window !== "undefined"

function getPermisosRequestTarget() {
  return isBrowser ? "/api/permisos" : `${getBackendApiUrl()}/api/permisos`
}

function buildHeaders(authToken?: string) {
  return {
    "Content-Type": "application/json",
    ...(authToken ? { authorization: authToken } : {}),
  }
}

function getModuloNumericId(moduloId: string): number {
  const index = MODULOS.findIndex((m) => m.id === moduloId)
  return index >= 0 ? index + 1 : 0
}

function getPermisosList(json: any): any[] {
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.data)) return json.data
  if (Array.isArray(json?.permisos)) return json.permisos
  if (Array.isArray(json?.data?.permisos)) return json.data.permisos
  return []
}

function normalizeModuloId(rawModuloId: unknown, moduloName: unknown): string {
  if (typeof rawModuloId === "number") {
    const idx = rawModuloId - 1
    return MODULOS[idx]?.id ?? String(rawModuloId)
  }

  if (typeof rawModuloId === "string" && rawModuloId.trim()) {
    return rawModuloId
  }

  if (typeof moduloName === "string") {
    const found = MODULOS.find((m) => m.label.toLowerCase() === moduloName.toLowerCase())
    return found ? found.id : moduloName.toLowerCase().replace(/\s+/g, "_")
  }

  return String(rawModuloId ?? "")
}

function buildPermisoWriteRequest(params: {
  consecutivoRol: number
  moduloId: string
  activo: boolean
}) {
  const { consecutivoRol, moduloId, activo } = params
  const numericModuloId = getModuloNumericId(moduloId)

  if (numericModuloId === 0) {
    throw new Error(`Módulo no encontrado: ${moduloId}`)
  }

  if (isBrowser) {
    return {
      url: getPermisosRequestTarget(),
      body: { consecutivo_rol: consecutivoRol, modulo_id: moduloId, activo },
    }
  }

  return {
    url: `${getBackendApiUrl()}/api/permisos/${consecutivoRol}/${numericModuloId}`,
    body: { activo },
  }
}

export async function obtenerPermisosPorRol(
  consecutivoRol: number,
  authToken?: string
): Promise<Permiso[]> {
  try {
    const response = await fetch(`${getPermisosRequestTarget()}?consecutivo_rol=${consecutivoRol}`, {
      method: "GET",
      headers: buildHeaders(authToken),
    })

    if (!response.ok) {
      throw new Error(`Error al obtener permisos: ${response.status}`)
    }

    const json = await response.json()

    return getPermisosList(json).map((it: any) => ({
      consecutivo_rol: Number(it.consecutivo_rol ?? consecutivoRol ?? it.rol ?? 0),
      modulo_id: normalizeModuloId(it.modulo_id ?? it.moduloId, it.modulo ?? it.modulo_nombre ?? it.moduloName),
      activo: Boolean(it.activo),
    }))
  } catch (error) {
    console.error("Error en obtenerPermisosPorRol:", error)
    throw error
  }
}

export async function actualizarPermiso(
  consecutivoRol: number,
  moduloId: string,
  activo: boolean,
  authToken?: string
): Promise<Permiso> {
  try {
    const { url, body } = buildPermisoWriteRequest({ consecutivoRol, moduloId, activo })

    const response = await fetch(url, {
      method: "PATCH",
      headers: buildHeaders(authToken),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ PATCH Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(`Error al actualizar permiso: ${response.status} - ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error en actualizarPermiso:", error)
    throw error
  }
}

export async function agregarPermiso(
  consecutivoRol: number,
  moduloId: string,
  activo: boolean = true,
  authToken?: string
): Promise<Permiso> {
  try {
    const url = isBrowser ? getPermisosRequestTarget() : `${getBackendApiUrl()}/api/permisos`
    const body = { consecutivo_rol: consecutivoRol, modulo_id: moduloId, activo }

    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(authToken),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Error al agregar permiso: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error en agregarPermiso:", error)
    throw error
  }
}
