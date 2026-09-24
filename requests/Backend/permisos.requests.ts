import type { Permiso, PermisosResponse, ModuloApp } from "@/models/permisos.model"
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

function getPermisosList(json: any): any[] {
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.data)) return json.data
  if (Array.isArray(json?.permisos)) return json.permisos
  if (Array.isArray(json?.data?.permisos)) return json.data.permisos
  return []
}

export function foldAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

// El slug de UI se resuelve por NOMBRE contra mipres.modulos_app (fuente de
// verdad), nunca por posición en el array MODULOS de este frontend. La
// comparación ignora tildes porque modulos_app tiene nombres sin acentuar
// (ej. "Facturacion") mientras el frontend usa la forma acentuada.
function normalizeModuloId(rawModuloId: unknown, moduloName: unknown): string {
  if (typeof moduloName === "string" && moduloName.trim()) {
    const target = foldAccents(moduloName)
    const found = MODULOS.find((m) => foldAccents(m.label) === target)
    if (found) return found.id
  }

  if (typeof rawModuloId === "string" && rawModuloId.trim()) {
    return rawModuloId
  }

  return String(rawModuloId ?? "")
}

function buildPermisoWriteRequest(params: {
  consecutivoRol: number
  moduloId: number
  activo: boolean
}) {
  const { consecutivoRol, moduloId, activo } = params

  if (isBrowser) {
    return {
      url: getPermisosRequestTarget(),
      body: { consecutivo_rol: consecutivoRol, modulo_id: moduloId, activo },
    }
  }

  return {
    url: `${getBackendApiUrl()}/api/permisos/${consecutivoRol}/${moduloId}`,
    body: { activo },
  }
}

export async function obtenerModulos(authToken?: string): Promise<ModuloApp[]> {
  try {
    const url = isBrowser ? "/api/permisos/modulos" : `${getBackendApiUrl()}/api/permisos/modulos`
    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(authToken),
    })

    if (!response.ok) {
      throw new Error(`Error al obtener módulos: ${response.status}`)
    }

    const json = await response.json()
    const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []

    return list.map((it: any) => ({
      id: Number(it.id),
      nombre: String(it.nombre ?? ""),
      descripcion: it.descripcion ? String(it.descripcion) : undefined,
      id_tipo_empresa: it.id_tipo_empresa != null ? Number(it.id_tipo_empresa) : undefined,
    }))
  } catch (error) {
    console.error("Error en obtenerModulos:", error)
    throw error
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
  moduloId: number,
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
  moduloId: number,
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
