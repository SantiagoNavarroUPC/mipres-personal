const STORAGE_KEY_PREFIX = "mipres_token_"
const DEFAULT_VALIDATION_INTERVAL_MS = 10 * 60 * 1000
const DEFAULT_TOKEN_MAX_AGE_MS = 45 * 60 * 1000

interface StoredToken {
  tokenAcceso: string
  timestamp: number
  expiresAt?: number
  lastValidatedAt?: number
}

export type TokenValidationResult =
  | boolean
  | string
  | {
      valid?: boolean
      tokenAcceso?: string | null
      expiresAt?: number | null
    }

export type TokenValidator = (params: {
  nit: string
  token: string
  tokenAcceso: string
  timestamp: number
}) => Promise<TokenValidationResult> | TokenValidationResult

let validationIntervalId: ReturnType<typeof globalThis.setInterval> | null = null

function generateKey(nit: string, token: string): string {
  return `${STORAGE_KEY_PREFIX}${nit}:${token}`
}

function parseStoredToken(nit: string, token: string): StoredToken | null {
  if (typeof window === "undefined") return null

  try {
    const key = generateKey(nit, token)
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const data = JSON.parse(stored) as StoredToken
    if (!data || typeof data.tokenAcceso !== "string") return null
    return data
  } catch {
    return null
  }
}

function writeStoredToken(nit: string, token: string, data: StoredToken): void {
  if (typeof window === "undefined") return

  try {
    const key = generateKey(nit, token)
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Silenciosamente falla si localStorage no está disponible
  }
}

function needsValidation(data: StoredToken | null): boolean {
  if (!data) return false

  const now = Date.now()
  const expiresAt = data.expiresAt || data.timestamp + DEFAULT_TOKEN_MAX_AGE_MS
  const lastValidatedAt = data.lastValidatedAt || data.timestamp

  return now >= expiresAt - 5 * 60 * 1000 || now - lastValidatedAt >= DEFAULT_VALIDATION_INTERVAL_MS
}

export function getStoredToken(nit: string, token: string): string | null {
  if (typeof window === "undefined") return null

  try {
    return parseStoredToken(nit, token)?.tokenAcceso ?? null
  } catch {
    return null
  }
}

export function getStoredTokenInfo(nit: string, token: string): StoredToken | null {
  return parseStoredToken(nit, token)
}

export function storeToken(
  nit: string,
  token: string,
  tokenAcceso: string,
  options?: { expiresAt?: number; lastValidatedAt?: number }
): void {
  if (typeof window === "undefined") return

  try {
    const data: StoredToken = {
      tokenAcceso,
      timestamp: Date.now(),
      expiresAt: options?.expiresAt,
      lastValidatedAt: options?.lastValidatedAt,
    }
    // Persist in localStorage to survive reloads and inactivity
    writeStoredToken(nit, token, data)
  } catch {
    // Silenciosamente falla si localStorage no está disponible
  }
}

export async function validateStoredToken(
  nit: string,
  token: string,
  validator: TokenValidator
): Promise<boolean> {
  if (typeof window === "undefined") return false

  const stored = parseStoredToken(nit, token)
  if (!stored) return false

  try {
    const result = await Promise.resolve(
      validator({
        nit,
        token,
        tokenAcceso: stored.tokenAcceso,
        timestamp: stored.timestamp,
      })
    )

    const now = Date.now()
    if (typeof result === "boolean") {
      if (!result) {
        clearToken(nit, token)
        return false
      }

      writeStoredToken(nit, token, {
        ...stored,
        lastValidatedAt: now,
        expiresAt: stored.expiresAt || now + DEFAULT_TOKEN_MAX_AGE_MS,
      })
      return true
    }

    if (typeof result === "string") {
      storeToken(nit, token, result, {
        expiresAt: now + DEFAULT_TOKEN_MAX_AGE_MS,
        lastValidatedAt: now,
      })
      return true
    }

    if (result && typeof result === "object") {
      if (result.valid === false) {
        clearToken(nit, token)
        return false
      }

      if (typeof result.tokenAcceso === "string" && result.tokenAcceso.trim()) {
        storeToken(nit, token, result.tokenAcceso, {
          expiresAt: result.expiresAt ?? now + DEFAULT_TOKEN_MAX_AGE_MS,
          lastValidatedAt: now,
        })
      } else {
        writeStoredToken(nit, token, {
          ...stored,
          lastValidatedAt: now,
          expiresAt: result.expiresAt ?? stored.expiresAt ?? now + DEFAULT_TOKEN_MAX_AGE_MS,
        })
      }

      return true
    }

    return true
  } catch {
    return false
  }
}

export function startTokenValidationLoop(
  validator: TokenValidator,
  intervalMs: number = DEFAULT_VALIDATION_INTERVAL_MS
): () => void {
  if (typeof window === "undefined") return () => {}

  const runValidation = async () => {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
      for (const key of keys) {
        const raw = localStorage.getItem(key)
        if (!raw) continue

        try {
          const data = JSON.parse(raw) as StoredToken
          if (!data?.tokenAcceso) continue
          if (!needsValidation(data)) continue

          const rawKey = key.slice(STORAGE_KEY_PREFIX.length)
          const separatorIndex = rawKey.indexOf(":")
          if (separatorIndex <= 0) continue

          const nit = rawKey.slice(0, separatorIndex)
          const token = rawKey.slice(separatorIndex + 1)
          if (!nit || !token) continue

          await validateStoredToken(nit, token, validator)
        } catch {
          continue
        }
      }
    } catch {
    }
  }

  if (validationIntervalId) {
    clearInterval(validationIntervalId)
  }

  void runValidation()
  validationIntervalId = globalThis.setInterval(() => {
    void runValidation()
  }, Math.max(60_000, intervalMs))

  return () => {
    if (validationIntervalId) {
      clearInterval(validationIntervalId)
      validationIntervalId = null
    }
  }
}

export function clearToken(nit: string, token: string): void {
  if (typeof window === "undefined") return

  try {
    const key = generateKey(nit, token)
    localStorage.removeItem(key)
  } catch {
    // Silenciosamente falla si localStorage no está disponible
  }
}

export function clearAllTokens(): void {
  if (typeof window === "undefined") return

  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
    if (validationIntervalId) {
      clearInterval(validationIntervalId)
      validationIntervalId = null
    }
  } catch {
  }
}
