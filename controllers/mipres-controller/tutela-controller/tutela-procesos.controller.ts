import type { Tutela } from "@/models/mipres-sispro/tutela/tutela"

/**
 * Extraer y transformar tutelas desde diferentes estructuras de respuesta
 */
export function extractTutelas(raw: any): Tutela[] {
	if (!raw) return []

	if (Array.isArray(raw)) {
		if (raw.length > 0 && raw[0] && raw[0].tutela) {
			return raw.map((item: any) => {
				const base = item.tutela || {}
				return {
					...base,
					fallosTutelasAdicionales: item.fallosAdicionales || item.fallosTutelasAdicionales || [],
					medicamentos: item.medicamentos || base.medicamentos || [],
					procedimientos: item.procedimientos || base.procedimientos || [],
					dispositivos: item.dispositivos || base.dispositivos || [],
					productosNutricionales: item.productosnutricionales || item.productosNutricionales || base.productosNutricionales || [],
					serviciosComplementarios: item.serviciosComplementarios || item.servicioscomplementarios || base.serviciosComplementarios || [],
				}
			})
		}
		return raw
	}

	if (raw.root && Array.isArray(raw.root)) {
		return raw.root.map((item: any) => {
			const base = item.tutela || item
			return {
				...base,
				fallosTutelasAdicionales: item.fallosAdicionales || item.fallosTutelasAdicionales || [],
				medicamentos: item.medicamentos || base.medicamentos || [],
				procedimientos: item.procedimientos || base.procedimientos || [],
				dispositivos: item.dispositivos || base.dispositivos || [],
				productosNutricionales: item.productosnutricionales || item.productosNutricionales || base.productosNutricionales || [],
				serviciosComplementarios: item.serviciosComplementarios || item.servicioscomplementarios || base.serviciosComplementarios || [],
			}
		})
	}

	if (raw.tutela) {
		const base = raw.tutela
		return [
			{
				...base,
				fallosTutelasAdicionales: raw.fallosAdicionales || raw.fallosTutelasAdicionales || [],
				medicamentos: raw.medicamentos || base.medicamentos || [],
				procedimientos: raw.procedimientos || base.procedimientos || [],
				dispositivos: raw.dispositivos || base.dispositivos || [],
				productosNutricionales: raw.productosnutricionales || raw.productosNutricionales || base.productosNutricionales || [],
				serviciosComplementarios: raw.serviciosComplementarios || raw.servicioscomplementarios || base.serviciosComplementarios || [],
			},
		]
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
		const ano = current.getFullYear()
		const mes = String(current.getMonth() + 1).padStart(2, "0")
		const dia = String(current.getDate()).padStart(2, "0")
		fechas.push(`${ano}-${mes}-${dia}`)
		current.setDate(current.getDate() + 1)
	}

	return fechas
}

/**
 * Ejecutar tareas async con limite de concurrencia
 */
export async function ejecutarConConcurrencia<T>(
	tareas: (() => Promise<T>)[],
	concurrencia: number = 10
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
