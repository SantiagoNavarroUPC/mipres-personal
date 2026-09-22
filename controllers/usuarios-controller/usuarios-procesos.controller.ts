import type { UsuarioMipres } from "@/requests/Backend/usuarios.request"

export interface RolUsuarioSimple {
  consecutivo_rol: number
  rol_nombre: string
  rol_descripcion?: string
  estado?: boolean
}

function toStr(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim()
}

function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true" || normalized === "1") return true
    if (normalized === "false" || normalized === "0") return false
  }
  return fallback
}

export function normalizeUsuario(input: unknown): UsuarioMipres {
  const raw = (input ?? {}) as Record<string, unknown>

  const nombre = toStr(raw.nombre)
  const apellido = toStr(raw.apellido)
  const nombreCompleto = toStr(raw.nombre_completo) || `${nombre} ${apellido}`.trim()

  const rolRaw = (raw.rol ?? {}) as Record<string, unknown>

  return {
    id_usuario_mipres: toStr(raw.id_usuario_mipres),
    nombre,
    apellido,
    email: toStr(raw.email),
    nombre_completo: nombreCompleto,
    rol: {
      consecutivo_rol: Number(rolRaw.consecutivo_rol ?? 0),
      rol_nombre: toStr(rolRaw.rol_nombre),
    },
    usuario_activo: toBool(raw.usuario_activo, toBool(raw.sw_activo, false)),
    sw_activo: toBool(raw.sw_activo, toBool(raw.usuario_activo, false)),
  }
}

export function extractUsuarios(payload: unknown): UsuarioMipres[] {
  const asObj = (payload ?? {}) as Record<string, unknown>
  const data = asObj.data
  if (!Array.isArray(data)) return []
  return data.map((item) => normalizeUsuario(item))
}

export function normalizeRol(input: unknown): RolUsuarioSimple {
  const raw = (input ?? {}) as Record<string, unknown>
  return {
    consecutivo_rol: Number(raw.consecutivo_rol ?? 0),
    rol_nombre: toStr(raw.rol_nombre) || toStr(raw.nombre),
    rol_descripcion: toStr(raw.rol_descripcion) || toStr(raw.descripcion),
    estado: toBool(raw.estado, toBool(raw.sw_activo, true)),
  }
}

export function extractRoles(payload: unknown): RolUsuarioSimple[] {
  const asObj = (payload ?? {}) as Record<string, unknown>
  const data = asObj.data
  if (!Array.isArray(data)) return []
  return data.map((item) => normalizeRol(item))
}

export function buildActualizarUsuarioPayload(usuarioActivo: boolean) {
  return {
    usuario_activo: usuarioActivo,
    sw_activo: usuarioActivo,
  }
}

export function buildActualizarRolPayload(idUsuarioMipres: string, consecutivoRol: number) {
  return {
    id_usuario_mipres: idUsuarioMipres,
    rol_mipres: consecutivoRol,
  }
}
