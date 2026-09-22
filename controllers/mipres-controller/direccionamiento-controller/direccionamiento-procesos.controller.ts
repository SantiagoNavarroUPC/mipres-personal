import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento"

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
    const ano = current.getFullYear()
    const mes = String(current.getMonth() + 1).padStart(2, "0")
    const dia = String(current.getDate()).padStart(2, "0")
    fechas.push(`${ano}-${mes}-${dia}`)
    current.setDate(current.getDate() + 1)
  }

  return fechas
}

/**
 * Ejecutar funciones async en chunks (modelo hibrido).
 */
export async function ejecutarPorChunks<T>(
  tareas: (() => Promise<T>)[],
  tamanioChunk: number = 15
): Promise<T[]> {
  const resultados: T[] = []
  for (let i = 0; i < tareas.length; i += tamanioChunk) {
    const chunk = tareas.slice(i, i + tamanioChunk)
    const resultadosChunk = await Promise.all(chunk.map((fn) => fn()))
    resultados.push(...resultadosChunk)
  }
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
  if (diferenciaDias > 60) {
    return {
      valid: false,
      error: "El rango maximo permitido es de 60 dias (2 meses)",
    }
  }

  return { valid: true }
}

export function combinarResultadosDireccionamientos(resultados: Direccionamiento[][]): Direccionamiento[] {
  const all: Direccionamiento[] = []
  resultados.forEach((result) => {
    all.push(...result)
  })
  return all
}

export function marcarDireccionamientosDuplicados<T extends Record<string, any>>(items: T[]): T[] {
  if (!Array.isArray(items) || items.length === 0) return []

  const counts = new Map<string, number>()
  const getKey = (item: T): string | null => {
    if (item?.FecAnulacion) return null
    const tipoTec = String(item?.TipoTec || "").trim().toUpperCase()
    const conTec = Number(item?.ConTec || 0)
    const noEntrega = Number(item?.NoEntrega || 0)
    const noSubEntrega = Number(item?.NoSubEntrega || 0)
    const noPrescripcion = String(item?.NoPrescripcion || "").trim()
    const tipoRegimen = String(item?.tipoRegimen || "").trim().toLowerCase()

    if (!tipoTec || conTec <= 0 || noEntrega <= 0) return null
    return [noPrescripcion, tipoRegimen, tipoTec, conTec, noEntrega, noSubEntrega].join("|")
  }

  for (const item of items) {
    const key = getKey(item)
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return items.map((item) => {
    const key = getKey(item)
    const esDuplicado = Boolean(key && (counts.get(key) || 0) > 1)
    return { ...item, esDuplicado } as T
  })
}
