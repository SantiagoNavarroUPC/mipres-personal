"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Bell, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { secureStorageGetItem, secureStorageSetItem } from "@/lib/secure-storage"
import {
  clearErrorNotifications,
  getErrorNotifications,
  subscribeToErrorNotifications,
  type ErrorNotification,
} from "@/lib/error-notifications"

const NOTIFICATION_VIEWED_KEY = "mipres_notifications_viewed"

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "hace un momento"
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `hace ${diffHoras} h`
  const diffDias = Math.floor(diffHoras / 24)
  return `hace ${diffDias} d`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<ErrorNotification[]>([])
  const [lastViewedAt, setLastViewedAt] = useState(0)

  useEffect(() => {
    const load = () => setNotifications(getErrorNotifications())
    load()

    const rawViewed = secureStorageGetItem(NOTIFICATION_VIEWED_KEY)
    setLastViewedAt(rawViewed ? Number(rawViewed) || 0 : 0)

    return subscribeToErrorNotifications(load)
  }, [])

  const hasUnread = useMemo(
    () => notifications.some((n) => n.timestamp > lastViewedAt),
    [notifications, lastViewedAt]
  )

  const handleOpenChange = (val: boolean) => {
    setOpen(val)
    if (val) {
      const now = Date.now()
      setLastViewedAt(now)
      secureStorageSetItem(NOTIFICATION_VIEWED_KEY, String(now))
    }
  }

  const handleClear = () => {
    clearErrorNotifications()
    setNotifications([])
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary/80">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notificaciones</span>
          {notifications.length > 0 && (
            <span
              className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-primary ${
                hasUnread ? "bg-red-500" : "bg-green-500"
              }`}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">Notificaciones de errores</h4>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleClear}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin errores recientes.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm dark:border-red-900 dark:bg-red-950/40"
                >
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-red-800 dark:text-red-200">{n.source}</p>
                    <p className="text-red-700 dark:text-red-300 break-words">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(n.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
