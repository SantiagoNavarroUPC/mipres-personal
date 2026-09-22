"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import LoginPage from "@/modules/LoginModule"
import { secureStorageGetItem, secureStorageRemoveItem } from "@/lib/secure-storage"

function normalizeAuthHeader(token?: string) {
  const raw = String(token || "").trim()
  if (!raw) return ""
  return raw.toLowerCase().startsWith("bearer ") ? raw : `Bearer ${raw}`
}

export default function Page() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const loggedIn = secureStorageGetItem("mipres_logged_in") === "true"
      const expiresAtRaw = secureStorageGetItem("mipres_session_expires_at")
      const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : NaN
      const sessionValid = loggedIn && Number.isFinite(expiresAt) && Date.now() < expiresAt

      if (!sessionValid) {
        secureStorageRemoveItem("mipres_logged_in")
        secureStorageRemoveItem("mipres_session_expires_at")
        secureStorageRemoveItem("mipres_credentials")
        if (!cancelled) setCheckingSession(false)
        return
      }

      let consecutivoRol = 1
      let authHeader = ""
      const savedCredentials = secureStorageGetItem("mipres_credentials")

      if (savedCredentials) {
        try {
          const parsed = JSON.parse(savedCredentials)
          const parsedRol = Number(parsed?.rolMipres)
          if (Number.isFinite(parsedRol) && parsedRol > 0) {
            consecutivoRol = parsedRol
          }
          authHeader = normalizeAuthHeader(parsed?.authToken)
        } catch {
        }
      }

      try {
        const res = await fetch(`/api/permisos?consecutivo_rol=${consecutivoRol}`, {
          method: "GET",
          headers: {
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
        })

        if (res.ok) {
          if (!cancelled) router.replace("/mipres")
          return
        }
      } catch {
      }

      // permission check failed or returned non-OK — clear session and show login
      secureStorageRemoveItem("mipres_logged_in")
      secureStorageRemoveItem("mipres_session_expires_at")
      secureStorageRemoveItem("mipres_credentials")
      if (!cancelled) setCheckingSession(false)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [router])

  if (checkingSession) {
    return null
  }

  return <LoginPage />
}
