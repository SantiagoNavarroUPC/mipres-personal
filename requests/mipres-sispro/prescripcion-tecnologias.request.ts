// Tipos de datos
export interface ProductoNutricional {
  nombre_comercial: string
  forma?: string
}

export interface ServicioComplementario {
  descripcion: string
}

// Headers por defecto
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
}

/**
 * Hacer petición GET a API MIPRES (siempre URLs relativas apuntan a nuestros routes)
 */
async function fetchFromMipresAPI<T>(urlString: string): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const maxRetries = 2
  const timeoutMs = 30000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(urlString, {
        method: "GET",
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        try {
          const data = (await response.json()) as T
          return { success: true, data, status: response.status }
        } catch (err) {
          const text = await response.text()
          return { success: true, data: (text as unknown as T), status: response.status }
        }
      } else {
        return { success: false, error: `Error HTTP ${response.status}`, status: response.status }
      }
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError'
      const msg = isTimeout ? 'Connect timeout' : (error instanceof Error ? error.message : String(error))
      
      if (attempt < maxRetries) {
        const backoff = 1000 * (attempt + 1)
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }
      return { success: false, error: msg }
    }
  }

  return { success: false, error: 'Unknown error' }
}

export async function fetchProductoNutricional(codigoMipres: string) {
  const url = `/api/mipres/prescripciones/productos-nutricionales?codigo_mipres=${encodeURIComponent(codigoMipres)}`
  return fetchFromMipresAPI(url)
}

export async function fetchServicioComplementario(codigo: string) {
  const url = `/api/mipres/prescripciones/servicios-complementarios?codigo=${encodeURIComponent(codigo)}`
  return fetchFromMipresAPI(url)
}
