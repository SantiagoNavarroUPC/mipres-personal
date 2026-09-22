import { fetchFromMipres } from "./prescripcion.request"
import { getRequiredEnv } from "@/lib/env"

const BASE_URL_TOKEN = getRequiredEnv("BASE_URL_TOKEN")

export const TOKEN_ENDPOINTS = {
  // GET api/GenerarToken/{nit}/{token}
  generarToken: (nit: string, token: string) =>
    `${BASE_URL_TOKEN}/GenerarToken/${nit}/${token}`,
}

/**
 * Generar Token de Acceso
 */
export async function fetchGenerarToken(
  nit: string,
  token: string
): Promise<{ success: boolean; tokenAcceso?: string; error?: string }> {
  try {
    const url = TOKEN_ENDPOINTS.generarToken(nit, token)
    const result = await fetchFromMipres<string>(url)

    if (result.success && result.data) {
      return {
        success: true,
        tokenAcceso: typeof result.data === "string" ? result.data : JSON.stringify(result.data),
      }
    }

    return {
      success: false,
      error: result.error || "Error al generar token",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
