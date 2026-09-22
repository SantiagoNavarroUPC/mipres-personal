// Centro de notificaciones de errores: reemplaza el antiguo recordatorio de
// "direccionamientos pendientes" por un log de fallos reales de procesos
// (envio a SISPRO, mapping al backend propio, no-direccionamiento), para que
// el usuario vea de inmediato QUE fallo y por que, en vez de perder el error
// en un toast que desaparece o en la consola del navegador.

export interface ErrorNotification {
  id: string
  timestamp: number
  source: string
  message: string
}

const STORAGE_KEY = "mipres_error_notifications"
const EVENT_NAME = "mipres:error-notification"
const MAX_NOTIFICATIONS = 30

function readAll(): ErrorNotification[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: ErrorNotification[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // noop
  }
}

function notifyListeners() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function getErrorNotifications(): ErrorNotification[] {
  return readAll().sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Registra un error de un proceso (direccionamiento, mapping, etc.) para que
 * aparezca en el centro de notificaciones. `source` identifica el proceso
 * (ej. "Direccionamiento (SISPRO)"), `message` es el detalle del error.
 */
export function reportErrorNotification(source: string, message: string) {
  if (typeof window === "undefined") return

  const trimmedMessage = String(message || "").trim()
  if (!trimmedMessage) return

  const notification: ErrorNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    source: String(source || "Proceso").trim() || "Proceso",
    message: trimmedMessage,
  }

  const next = [notification, ...readAll()].slice(0, MAX_NOTIFICATIONS)
  writeAll(next)
  notifyListeners()
}

export function clearErrorNotifications() {
  writeAll([])
  notifyListeners()
}

/** Se dispara cuando cambian las notificaciones, en esta pestaña o en otra. */
export function subscribeToErrorNotifications(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  window.addEventListener(EVENT_NAME, callback)
  window.addEventListener("storage", callback)

  return () => {
    window.removeEventListener(EVENT_NAME, callback)
    window.removeEventListener("storage", callback)
  }
}
