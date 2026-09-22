import type { ProductoNutricional, ServicioComplementario } from "@/requests/mipres-sispro/prescripcion-tecnologias.request"
import {
  fetchProductoNutricional,
  fetchServicioComplementario,
} from "@/requests/mipres-sispro/prescripcion-tecnologias.request"

/**
 * Obtener datos de producto nutricional por código
 */
export async function obtenerProductoNutricional(
  codigoMipres: string
): Promise<{ success: boolean; data?: ProductoNutricional; error?: string }> {
  try {
    const result = await fetchProductoNutricional(codigoMipres)

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Error al obtener producto nutricional",
      }
    }

    const data = result.data as any
    const producto = Array.isArray(data) ? data[0] : data

    if (!producto?.nombre_comercial) {
      return {
        success: false,
        error: "Producto no encontrado",
      }
    }

    return {
      success: true,
      data: {
        nombre_comercial: String(producto.nombre_comercial),
        forma: producto.forma ? String(producto.forma) : undefined,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Obtener datos de servicio complementario por código
 */
export async function obtenerServicioComplementario(
  codigo: string
): Promise<{ success: boolean; data?: ServicioComplementario; error?: string }> {
  try {
    const result = await fetchServicioComplementario(codigo)

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Error al obtener servicio complementario",
      }
    }

    const data = result.data as any
    const servicio = Array.isArray(data) ? data[0] : data

    if (!servicio?.descripcion) {
      return {
        success: false,
        error: "Servicio no encontrado",
      }
    }

    return {
      success: true,
      data: {
        descripcion: String(servicio.descripcion),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
