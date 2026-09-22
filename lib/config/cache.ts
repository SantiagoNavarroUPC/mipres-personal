
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

interface TokenCacheEntry {
  nit: string
  token: string
  tokenAcceso: string
  expiresAt: number
}

class Cache {
  private tokenCache = new Map<string, TokenCacheEntry>()
  private readonly TTL_MS = 30 * 60 * 1000 // 30 minutos

  /**
   * Generar clave única para credenciales (nit + token)
   */
  private generateKey(nit: string, token: string): string {
    return `${nit}:${token}`
  }

  /**
   * Obtener token de acceso cacheado
   */
  getToken(nit: string, token: string): string | null {
    const key = this.generateKey(nit, token)
    const cached = this.tokenCache.get(key)

    if (!cached) return null

    // Verificar expiración
    if (Date.now() > cached.expiresAt) {
      this.tokenCache.delete(key)
      return null
    }

    return cached.tokenAcceso
  }

  /**
   * Guardar token de acceso en cache (30 min)
   */
  setToken(nit: string, token: string, tokenAcceso: string): void {
    const key = this.generateKey(nit, token)
    this.tokenCache.set(key, {
      nit,
      token,
      tokenAcceso,
      expiresAt: Date.now() + this.TTL_MS,
    })
  }

  /**
   * Limpiar cache expirado periódicamente
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.tokenCache.entries()) {
      if (now > entry.expiresAt) {
        this.tokenCache.delete(key)
      }
    }
  }

  /**
   * Obtener estadísticas de cache
   */
  getStats() {
    return {
      tokensEnCache: this.tokenCache.size,
    }
  }
}

// Instancia singleton
export const tokenCache = new Cache()

// Ejecutar limpieza cada 5 minutos
if (typeof global !== 'undefined') {
  setInterval(() => {
    tokenCache.cleanup()
  }, 5 * 60 * 1000)
}
