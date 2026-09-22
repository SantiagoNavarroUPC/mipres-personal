const ENCRYPTED_PREFIX = "enc::v1::"

export const PROTECTED_STORAGE_KEYS = [
  "mipres_credentials",
  "mipres_logged_in",
  "mipres_session_expires_at",
] as const

const PROTECTED_KEYS_SET = new Set<string>(PROTECTED_STORAGE_KEYS)

function isProtectedKey(key: string) {
  return PROTECTED_KEYS_SET.has(key)
}

function getSecret() {
  const envSecret = process.env.NEXT_PUBLIC_STORAGE_SECRET
  return envSecret && envSecret.trim()
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function xorBytes(data: Uint8Array, secretBytes: Uint8Array) {
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ secretBytes[i % secretBytes.length]
  }
  return out
}

function encryptValue(value: string) {
  const encoder = new TextEncoder()
  const valueBytes = encoder.encode(value)
  const secretBytes = encoder.encode(getSecret())
  const encrypted = xorBytes(valueBytes, secretBytes)
  return `${ENCRYPTED_PREFIX}${bytesToBase64(encrypted)}`
}

function decryptValue(value: string) {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value
  const base64 = value.slice(ENCRYPTED_PREFIX.length)
  const encryptedBytes = base64ToBytes(base64)
  const secretBytes = new TextEncoder().encode(getSecret())
  const decrypted = xorBytes(encryptedBytes, secretBytes)
  return new TextDecoder().decode(decrypted)
}

export function secureStorageSetItem(key: string, value: string) {
  if (typeof window === "undefined") return

  try {
    if (!isProtectedKey(key)) {
      localStorage.setItem(key, value)
      return
    }

    localStorage.setItem(key, encryptValue(value))
  } catch {
    localStorage.setItem(key, value)
  }
}

export function secureStorageGetItem(key: string) {
  if (typeof window === "undefined") return null

  const raw = localStorage.getItem(key)
  if (raw === null) return null

  if (!isProtectedKey(key)) return raw

  try {
    const decrypted = decryptValue(raw)

    // Migración transparente de valores antiguos sin cifrar
    if (!raw.startsWith(ENCRYPTED_PREFIX) && decrypted !== null) {
      secureStorageSetItem(key, decrypted)
    }

    return decrypted
  } catch {
    return raw
  }
}

export function secureStorageRemoveItem(key: string) {
  if (typeof window === "undefined") return
  localStorage.removeItem(key)
}