import type { Prescripcion, NovedadPrescripcion } from "@/models/mipres-sispro/prescripcion"

/**
 * Extraer y transformar prescripciones desde diferentes estructuras de respuesta
 */
export function extractPrescripciones(raw: any): Prescripcion[] {
  if (!raw) return []

  if (Array.isArray(raw)) {
    if (raw.length > 0 && raw[0] && raw[0].prescripcion) {
      // Estructura: [ { prescripcion: {...}, medicamentos, etc }, ... ]
      return raw.map((r: any) => {
        const presc = r.prescripcion || {}
        return {
          ...presc,
          medicamentos: r.medicamentos || presc.medicamentos || [],
          procedimientos: r.procedimientos || presc.procedimientos || [],
          dispositivos: r.dispositivos || presc.dispositivos || [],
          productosNutricionales: r.productosnutricionales || r.productosNutricionales || presc.productosNutricionales || [],
          serviciosComplementarios: r.serviciosComplementarios || r.servicioscomplementarios || presc.serviciosComplementarios || [],
        }
      })
    }
    // Estructura simple: array de prescripciones directas
    return raw
  }

  // Caso: objeto con propiedad `root` que contiene el arreglo
  if (raw.root && Array.isArray(raw.root)) {
    return raw.root.map((r: any) => {
      const presc = r.prescripcion || r
      return {
        ...presc,
        medicamentos: r.medicamentos || presc.medicamentos || [],
        procedimientos: r.procedimientos || presc.procedimientos || [],
        dispositivos: r.dispositivos || presc.dispositivos || [],
        productosNutricionales: r.productosnutricionales || r.productosNutricionales || presc.productosNutricionales || [],
        serviciosComplementarios: r.serviciosComplementarios || r.servicioscomplementarios || presc.serviciosComplementarios || [],
      }
    })
  }

  // Caso: objeto único con `prescripcion` + tecnologías
  if (raw.prescripcion) {
    const presc = raw.prescripcion
    return [{
      ...presc,
      medicamentos: raw.medicamentos || presc.medicamentos || [],
      procedimientos: raw.procedimientos || presc.procedimientos || [],
      dispositivos: raw.dispositivos || presc.dispositivos || [],
      productosNutricionales: raw.productosnutricionales || raw.productosNutricionales || presc.productosNutricionales || [],
      serviciosComplementarios: raw.serviciosComplementarios || raw.servicioscomplementarios || presc.serviciosComplementarios || [],
    }]
  }

  // Fallback: retornar raw como está
  return Array.isArray(raw) ? raw : [raw]
}

/**
 * Extraer y transformar novedades desde diferentes estructuras de respuesta
 */
export function extractNovedades(raw: any): NovedadPrescripcion[] {
  if (!raw) return []

  if (Array.isArray(raw)) {
    // Si los elementos tienen propiedad `prescripcion_novedades`
    if (raw.length > 0 && raw[0] && raw[0].prescripcion_novedades) {
      return raw.map((item: any) => item.prescripcion_novedades)
    }
    return raw
  }

  if (raw.novedades && Array.isArray(raw.novedades)) {
    return raw.novedades
  }

  if (raw.root && Array.isArray(raw.root)) {
    return raw.root
  }

  return Array.isArray(raw) ? raw : [raw]
}

/**
 * Generar rango de fechas entre dos fechas (AAAA-MM-DD)
 */
export function generarRangoFechas(inicio: string, fin: string): string[] {
  const fechas: string[] = []
  const [anoInicio, mesInicio, diaInicio] = inicio.split("-").map(Number)
  const [anoFin, mesFin, diaFin] = fin.split("-").map(Number)
  
  const current = new Date(anoInicio, mesInicio - 1, diaInicio)
  const final = new Date(anoFin, mesFin - 1, diaFin)

  while (current <= final) {
    const año = current.getFullYear()
    const mes = String(current.getMonth() + 1).padStart(2, "0")
    const día = String(current.getDate()).padStart(2, "0")
    fechas.push(`${año}-${mes}-${día}`)
    current.setDate(current.getDate() + 1)
  }

  return fechas
}

/**
 * Ejecutar funciones async en chunks (modelo híbrido).
 **/
export async function ejecutarPorChunks<T>(
  tareas: (() => Promise<T>)[],
  tamanioChunk: number = 20
): Promise<T[]> {
  const resultados: T[] = []
  for (let i = 0; i < tareas.length; i += tamanioChunk) {
    const chunk = tareas.slice(i, i + tamanioChunk)
    const resultadosChunk = await Promise.all(chunk.map((fn) => fn()))
    resultados.push(...resultadosChunk)
  }
  return resultados
}

/**
 * Ejecutar tareas async con límite de concurrencia (I/O no bloqueante).
 */
export async function ejecutarConConcurrencia<T>(
  tareas: (() => Promise<T>)[],
  concurrencia: number = 20
): Promise<T[]> {
  if (tareas.length === 0) return []
  const resultados: T[] = new Array(tareas.length)
  let indice = 0

  const workers = new Array(Math.min(concurrencia, tareas.length)).fill(null).map(async () => {
    while (true) {
      const currentIndex = indice
      indice += 1
      if (currentIndex >= tareas.length) break
      resultados[currentIndex] = await tareas[currentIndex]()
    }
  })

  await Promise.all(workers)
  return resultados
}


export function validarRangoFechas(fechaInicio: string, fechaFin: string): { valid: boolean; error?: string } {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [anoFin, mesFin, diaFin] = fechaFin.split("-").map(Number)
  const fechaFinalObj = new Date(anoFin, mesFin - 1, diaFin)
  
  if (fechaFinalObj > hoy) {
    return {
      valid: false,
      error: "La fecha final no puede ser mayor a la fecha actual",
    }
  }

  const [anoInicio, mesInicio, diaInicio] = fechaInicio.split("-").map(Number)
  const fechaInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio)
  
  if (fechaInicioObj > fechaFinalObj) {
    return {
      valid: false,
      error: "La fecha inicial no puede ser mayor a la fecha final",
    }
  }

  const diferenciaDias = Math.floor((fechaFinalObj.getTime() - fechaInicioObj.getTime()) / (1000 * 60 * 60 * 24))
  // Allow up to approximately 3 months (92 days) when users request 3-month ranges
  if (diferenciaDias > 92) {
    return {
      valid: false,
      error: "El rango máximo permitido es de 92 días (3 meses)",
    }
  }

  return { valid: true }
}
