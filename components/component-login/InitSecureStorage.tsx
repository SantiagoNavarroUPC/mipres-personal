"use client"

import { useEffect } from "react"

const KEYS_TO_PROTECT = [
  "mipres_credentials",
  "mipres_session_expires_at",
  "mipres_logged_in",
]

function getSecret(): string | null {
  try {
    return process?.env?.NEXT_PUBLIC_STORAGE_SECRET || null
  } catch {
    return null
  }
}

async function deriveKey(secret: string) {
  const enc = new TextEncoder()
  const salt = enc.encode("mipres_storage_salt_v1")
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

function bufToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBuf(b64: string) {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export default function InitSecureStorage() {
  useEffect(() => {
    const secret = getSecret()
    if (!secret) {
      console.warn("NEXT_PUBLIC_STORAGE_SECRET not set — storage will NOT be encrypted")
      return
    }

    let encryptionKey: CryptoKey | null = null
    const decryptedCache = new Map<string, string>()

    const ready = deriveKey(secret).then((k) => {
      encryptionKey = k
    }).catch(() => {
      // noop
    })

    const originalGet = Storage.prototype.getItem
    const originalSet = Storage.prototype.setItem
    const originalRemove = Storage.prototype.removeItem

    Storage.prototype.setItem = function (key: string, value: string) {
      try {
        if (KEYS_TO_PROTECT.includes(key) && encryptionKey) {
          decryptedCache.set(key, value)
          const iv = crypto.getRandomValues(new Uint8Array(12))
          const enc = new TextEncoder().encode(value)
          crypto.subtle.encrypt({ name: "AES-GCM", iv }, encryptionKey, enc).then((ct) => {
            const payload = `${bufToBase64(iv.buffer)}:${bufToBase64(ct)}`
            originalSet.call(this, key, payload)
          }).catch(() => originalSet.call(this, key, value))
          return
        }
      } catch {
        // fallback
      }
      return originalSet.call(this, key, value)
    }

    Storage.prototype.getItem = function (key: string): string | null {
      try {
        if (KEYS_TO_PROTECT.includes(key) && encryptionKey) {
          const cached = decryptedCache.get(key)
          if (cached !== undefined) return cached
          
          const raw = originalGet.call(this, key)
          if (!raw) return raw
          if (typeof raw === "string" && raw.includes(":")) {
            const [ivB64, ctB64] = raw.split(":")
            const iv = new Uint8Array(base64ToBuf(ivB64))
            const ct = base64ToBuf(ctB64)
            crypto.subtle.decrypt({ name: "AES-GCM", iv }, encryptionKey, ct).then((pt) => {
              const dec = new TextDecoder().decode(pt)
              decryptedCache.set(key, dec)
            }).catch(() => {
              decryptedCache.set(key, raw)
            })
            return raw
          }
        }
        return originalGet.call(this, key)
      } catch {
        return originalGet.call(this, key)
      }
    }

    Storage.prototype.removeItem = function (key: string) {
      try {
        if (KEYS_TO_PROTECT.includes(key)) {
          return originalRemove.call(this, key)
        }
      } catch {
        // noop
      }
      return originalRemove.call(this, key)
    }

    // cleanup on unmount
    return () => {
      Storage.prototype.getItem = originalGet
      Storage.prototype.setItem = originalSet
      Storage.prototype.removeItem = originalRemove
    }
  }, [])

  return null
}
