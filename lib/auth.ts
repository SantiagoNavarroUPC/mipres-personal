import { toast } from "sonner"
import { secureStorageGetItem, secureStorageSetItem, secureStorageRemoveItem } from "./secure-storage"

type Credentials = {
  nit?: string
  nitIps?: string
  tokenAcceso?: string
  usuario?: string
  usuarioSesion?: string
  documentoUsuario?: string
  /** @deprecated Ya no se persiste tras el login; se mantiene solo para leer sesiones antiguas. */
  contrasena?: string
  rolMipres?: number
  rol_nombre?: string | null
  authToken?: string
  refreshToken?: string | null
  expiresAt?: number // Timestamp en ms cuando expira el access token
  refreshExpiresAt?: number // Timestamp en ms cuando expira el refresh token
}

function getStoredCredentials(): Credentials | null {
  try {
    const raw = secureStorageGetItem("mipres_credentials")
    if (!raw) return null
    return JSON.parse(raw) as Credentials
  } catch {
    return null
  }
}

function setStoredCredentials(creds: Credentials) {
  try {
    secureStorageSetItem("mipres_credentials", JSON.stringify(creds))
  } catch {
    // noop
  }
}

function clearStoredCredentials() {
  try {
    secureStorageRemoveItem("mipres_credentials")
    secureStorageRemoveItem("mipres_logged_in")
    secureStorageRemoveItem("mipres_session_expires_at")
  } catch {}
}

// Evita notificar/redirigir varias veces si varias peticiones en paralelo detectan
// el mismo problema (token vencido o caída de conexión) casi al mismo tiempo.
let cerrandoSesion = false

/**
 * Notifica al usuario (toast) y cierra la sesión de forma dura: limpia las
 * credenciales guardadas y redirige a /login. Se usa tanto cuando el servidor
 * rechaza explícitamente el token (expirado/inválido) como cuando se pierde la
 * conexión con el backend (fetch no puede ni completar la petición).
 */
export function notifyAndLogout(reason: "expired" | "connection"): void {
  if (cerrandoSesion) return
  cerrandoSesion = true

  const message =
    reason === "expired"
      ? "Su sesión ha expirado. Debe iniciar sesión nuevamente."
      : "Se perdió la conexión con el servidor. Debe iniciar sesión nuevamente."

  toast.error(message)
  clearStoredCredentials()

  if (typeof window !== "undefined") {
    // Pequeño delay para que el toast llegue a pintarse antes de que la navegación
    // descarte la página actual.
    setTimeout(() => {
      window.location.href = "/login"
    }, 1500)
  }
}

function isCredentialsExpired(creds: Credentials | null): boolean {
  if (!creds) return true
  // Si no tiene expiración registrada, asumir que expiró
  if (!creds.expiresAt) {
    // Fallback: verificar si tiene refreshToken, si no lo tiene, está expirado
    return !creds.refreshToken
  }
  return Date.now() > creds.expiresAt
}

function shouldRefreshToken(creds: Credentials | null): boolean {
  if (!creds || !creds.expiresAt) return false
  // Refresh si quedan menos de 15 minutos
  const timeUntilExpiry = creds.expiresAt - Date.now()
  return timeUntilExpiry < 15 * 60 * 1000
}

function isRefreshTokenExpired(creds: Credentials | null): boolean {
  if (!creds?.refreshExpiresAt) return false
  return Date.now() > creds.refreshExpiresAt
}

/**
 * Renueva la sesion usando el refresh token guardado (nunca la contrasena).
 * Reemplaza el mecanismo anterior de "reautenticar con la contrasena guardada
 * en el navegador", que ademas de exponer la contrasena en claro en
 * localStorage, dependia de DUSAKAWI_API_URL -> una variable de entorno sin
 * prefijo NEXT_PUBLIC_ que en el navegador siempre resuelve a undefined, por
 * lo que ese refresh en realidad nunca llegaba a funcionar.
 *
 * Solo se limpia la sesion cuando el servidor RECHAZA explicitamente el
 * refresh token (invalido, revocado o vencido). Un error de red no borra la
 * sesion: se reintentara en la siguiente peticion con el access token vigente.
 */
async function tryRefresh(): Promise<boolean> {
  const creds = getStoredCredentials()
  if (!creds) return false

  const refreshToken = String(creds.refreshToken ?? "").trim()
  if (!refreshToken) {
    // Sesion previa a la introduccion del refresh token: no se puede renovar
    // en silencio, se requiere iniciar sesion nuevamente una unica vez.
    return false
  }

  if (isRefreshTokenExpired(creds)) {
    clearStoredCredentials()
    return false
  }

  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })

    let data: any = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok || !data?.token) {
      // El servidor rechazo el refresh token de forma explicita (invalido,
      // revocado o vencido): ahi si hay que forzar reautenticacion manual.
      clearStoredCredentials()
      return false
    }

    const expiresInSeconds = typeof data.expiresIn === "number" && data.expiresIn > 0
      ? data.expiresIn
      : 2 * 60 * 60
    const refreshExpiresInSeconds = typeof data.refreshExpiresIn === "number" && data.refreshExpiresIn > 0
      ? data.refreshExpiresIn
      : creds.refreshExpiresAt
        ? Math.max(0, Math.floor((creds.refreshExpiresAt - Date.now()) / 1000))
        : 7 * 24 * 60 * 60

    const updated: Credentials = {
      ...creds,
      authToken: data.token,
      usuario: data.usuario || creds.usuario,
      usuarioSesion: creds.usuarioSesion || creds.usuario,
      documentoUsuario: data.usuario || creds.documentoUsuario,
      rolMipres: data.rol_mipres ?? creds.rolMipres,
      rol_nombre: data.rol_nombre ?? creds.rol_nombre,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      // El backend rota el refresh token en cada renovacion; si por algun
      // motivo no llega uno nuevo, se conserva el actual como fallback.
      refreshToken: data.refreshToken || refreshToken,
      refreshExpiresAt: Date.now() + refreshExpiresInSeconds * 1000,
    }

    setStoredCredentials(updated)
    // Mantener sincronizada la marca usada por los guards de /mipres y /
    // (app/mipres/page.tsx, app/page.tsx); si no se actualiza aqui, esas
    // paginas siguen comparando contra el expiresAt del login original y
    // fuerzan un logout aunque el token ya se haya refrescado.
    secureStorageSetItem("mipres_session_expires_at", String(updated.expiresAt))
    return true
  } catch {
    // Error de red: no se limpia la sesion, se reintentara en la siguiente peticion.
    return false
  }
}

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let creds = getStoredCredentials()

  // Validar credenciales expiradas
  if (isCredentialsExpired(creds)) {
    clearStoredCredentials()
    creds = null
  }

  // Si expiración está próxima, intentar refresh
  if (shouldRefreshToken(creds) && creds?.refreshToken) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      creds = getStoredCredentials()
    }
  }

  const authHeader = creds?.authToken ? (String(creds.authToken).trim().toLowerCase().startsWith("bearer ") ? String(creds.authToken) : `Bearer ${String(creds.authToken)}`) : undefined

  const mergedInit: RequestInit = {
    ...init,
    headers: {
      ...(init && init.headers ? (init.headers as Record<string, string>) : {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
      Accept: "application/json",
    },
    cache: init?.cache ?? "no-store",
  }

  let res: Response
  try {
    res = await fetch(input, mergedInit)
  } catch (error) {
    // fetch solo lanza por una falla real de red/conexión (servidor caído, sin
    // internet, DNS, etc.), nunca por un status HTTP de error.
    notifyAndLogout("connection")
    throw error
  }

  if ((res.status === 401 || res.status === 403) && creds?.refreshToken) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const newCreds = getStoredCredentials()
      const newAuth = newCreds?.authToken
      const newAuthHeader = newAuth ? (String(newAuth).trim().toLowerCase().startsWith("bearer ") ? String(newAuth) : `Bearer ${String(newAuth)}`) : undefined

      const retryInit: RequestInit = {
        ...init,
        headers: {
          ...(init && init.headers ? (init.headers as Record<string, string>) : {}),
          ...(newAuthHeader ? { Authorization: newAuthHeader } : {}),
          Accept: "application/json",
        },
        cache: init?.cache ?? "no-store",
      }

      try {
        res = await fetch(input, retryInit)
      } catch (error) {
        notifyAndLogout("connection")
        throw error
      }
    }
    // Si el refresh fallo por rechazo explicito del servidor, tryRefresh ya
    // limpio la sesion; si fallo por red, se deja la respuesta 401/403
    // original y se reintentara en la siguiente peticion del usuario.
  }

  if (res.status === 401 || res.status === 403) {
    // Se llega acá cuando no había refreshToken para intentar renovar, o cuando
    // el refresh se intentó y aun así el servidor sigue rechazando la petición:
    // en ambos casos la sesión ya no es válida.
    notifyAndLogout("expired")
  }

  return res
}

export { getStoredCredentials, setStoredCredentials, clearStoredCredentials }

/**
 * Valida credenciales almacenadas al cargar la app.
 * Limpia credenciales expiradas e intenta hacer refresh si es necesario.
 */
export async function validateStoredCredentials(): Promise<boolean> {
  const creds = getStoredCredentials()

  if (isCredentialsExpired(creds)) {
    if (creds?.refreshToken) {
      const refreshed = await tryRefresh()
      if (refreshed) return true
    }

    clearStoredCredentials()
    return false
  }

  if (shouldRefreshToken(creds) && creds?.refreshToken) {
    return tryRefresh()
  }

  return creds !== null
}

export async function getFreshAuthHeader(): Promise<string | null> {
  await validateStoredCredentials()

  const creds = getStoredCredentials()
  const authToken = creds?.authToken ? String(creds.authToken).trim() : ""
  if (!authToken) return null

  return authToken.toLowerCase().startsWith("bearer ") ? authToken : `Bearer ${authToken}`
}
