import type { MipresCredentials } from "@/models/credentials.model"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento"
import {
	fetchDireccionamientoMany,
	fetchDireccionamientoPorFecha,
	fetchDireccionamientoPorPaciente,
	fetchDireccionamientoPorPrescripcion,
	putAnularDireccionamiento,
	putDireccionamiento,
	type TipoConsultaDireccionamiento,
} from "@/requests/mipres-sispro/direccionamiento.request"
import {
	combinarResultadosDireccionamientos,
	ejecutarPorChunks,
	generarRangoFechas,
	marcarDireccionamientosDuplicados,
	validarRangoFechas,
} from "./direccionamiento-procesos.controller"

function getTokenAcceso(credentials: MipresCredentials): string {
	// Priorizar los tokens específicos si están disponibles
	return credentials.tokenAcceso || credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo || ""
}

function extractDireccionamientos(raw: any): Direccionamiento[] {
	if (!raw) return []
	const base = Array.isArray(raw)
		? raw
		: raw.root && Array.isArray(raw.root)
		? raw.root
		: raw.direccionamientos && Array.isArray(raw.direccionamientos)
		? raw.direccionamientos
		: [raw]
	return marcarDireccionamientosDuplicados(base)
}

const inFlightDireccionamientoKeys = new Set<string>()
const recentDireccionamientoKeys = new Map<string, number>()
const DIRECCIONAMIENTO_DUPLICATE_WINDOW_MS = 2 * 60 * 1000

function toNormalizedString(value: unknown): string {
	return String(value ?? "").trim()
}

function toNormalizedInt(value: unknown): number {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function buildDireccionamientoKey(
	nit: string,
	noPrescripcion: string,
	tipoTec: string,
	conTec: number,
	noEntrega: number
): string {
	return [
		nit.trim(),
		noPrescripcion.trim(),
		tipoTec.trim().toUpperCase(),
		String(conTec),
		String(noEntrega),
	].join("|")
}

function parseDireccionamientoDate(value: unknown): number {
	const raw = String(value ?? "").trim()
	if (!raw) return 0
	const normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw
	const ts = new Date(normalized).getTime()
	return Number.isFinite(ts) ? ts : 0
}

function pruneRecentDireccionamientoKeys(nowTs: number) {
	for (const [key, ts] of recentDireccionamientoKeys.entries()) {
		if (nowTs - ts > DIRECCIONAMIENTO_DUPLICATE_WINDOW_MS) {
			recentDireccionamientoKeys.delete(key)
		}
	}
}

/**
 * Registrar direccionamiento
 */
export async function registrarDireccionamiento(
	credentials: MipresCredentials,
	payload: unknown
): Promise<{ success: boolean; data?: unknown; error?: string; details?: unknown }> {
	try {
		const token = getTokenAcceso(credentials)
		
		if (!credentials.nit || !token) {
			return {
				success: false,
				error: "NIT y token de acceso son requeridos",
			}
		}

		const body = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>
		const noPrescripcion = toNormalizedString(body.NoPrescripcion)
		const tipoTec = toNormalizedString(body.TipoTec).toUpperCase()
		const conTec = toNormalizedInt(body.ConTec)
		const noEntrega = toNormalizedInt(body.NoEntrega)

		const hasDedupFields = Boolean(noPrescripcion && tipoTec && conTec > 0 && noEntrega > 0)
		const dedupKey = hasDedupFields
			? buildDireccionamientoKey(credentials.nit, noPrescripcion, tipoTec, conTec, noEntrega)
			: ""
		const nowTs = Date.now()
		pruneRecentDireccionamientoKeys(nowTs)

		if (hasDedupFields && inFlightDireccionamientoKeys.has(dedupKey)) {
			return {
				success: false,
				error: "Solicitud de direccionamiento duplicada en proceso",
			}
		}

		if (hasDedupFields) {
			const recentTs = recentDireccionamientoKeys.get(dedupKey)
			if (recentTs && nowTs - recentTs <= DIRECCIONAMIENTO_DUPLICATE_WINDOW_MS) {
				return {
					success: false,
					error: "Solicitud de direccionamiento duplicada en ventana de seguridad",
				}
			}
		}

		if (hasDedupFields) {
			inFlightDireccionamientoKeys.add(dedupKey)
		}

		try {
			if (hasDedupFields) {
				const existingResult = await fetchDireccionamientoPorPrescripcion(
					credentials.nit,
					token,
					noPrescripcion
				)

				if (existingResult.success && existingResult.data) {
					const existingRows = extractDireccionamientos(existingResult.data)
					const matchingRows = existingRows.filter((item: any) => {
						return (
							toNormalizedString(item?.TipoTec).toUpperCase() === tipoTec &&
							toNormalizedInt(item?.ConTec) === conTec &&
							toNormalizedInt(item?.NoEntrega) === noEntrega
						)
					})

					const alreadyExists = existingRows.some((item: any) => {
						const isAnulada = Boolean(String(item?.FecAnulacion ?? "").trim())
						if (isAnulada) return false

						return (
							toNormalizedString(item?.TipoTec).toUpperCase() === tipoTec &&
							toNormalizedInt(item?.ConTec) === conTec &&
							toNormalizedInt(item?.NoEntrega) === noEntrega
						)
					})

					const hasRecentDuplicate = matchingRows.some((item: any) => {
						const fechaTs = parseDireccionamientoDate(item?.FecDireccionamiento)
						return fechaTs > 0 && nowTs - fechaTs <= DIRECCIONAMIENTO_DUPLICATE_WINDOW_MS
					})

					if (alreadyExists) {
						return {
							success: false,
							error: "Direccionamiento duplicado",
						}
					}

					if (hasRecentDuplicate) {
						return {
							success: false,
							error: "Direccionamiento duplicado detectado recientemente",
						}
					}
				}
			}

			const result = await putDireccionamiento(credentials.nit, token, payload)

			if (result.success) {
				if (hasDedupFields) {
					recentDireccionamientoKeys.set(dedupKey, nowTs)
				}
				return { success: true, data: result.data }
			}

			return {
				success: false,
				error: result.error || "Error al registrar direccionamiento",
				details: result.data,
			}
		} finally {
			if (hasDedupFields) {
				inFlightDireccionamientoKeys.delete(dedupKey)
			}
		}
	} catch (error) {
		return {
			success: false,
			error: "Error en el registro de direccionamiento",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}

/**
 * Anular direccionamiento
 */
export async function anularDireccionamiento(
	credentials: MipresCredentials,
	idDireccionamiento: string
): Promise<{ success: boolean; data?: unknown; error?: string; details?: string }> {
	try {
		if (!credentials.nit || !credentials.tokenAcceso) {
			return {
				success: false,
				error: "NIT y token de acceso son requeridos",
			}
		}

		const result = await putAnularDireccionamiento(credentials.nit, getTokenAcceso(credentials), idDireccionamiento)

		if (result.success) {
			return { success: true, data: result.data }
		}

		return {
			success: false,
			error: result.error || "Error al anular direccionamiento",
		}
	} catch (error) {
		return {
			success: false,
			error: "Error al anular direccionamiento",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}

/**
 * Consultar direccionamientos por fecha
 */
export async function consultarDireccionamientosPorFecha(
	credentials: MipresCredentials,
	fecha: string
): Promise<{ success: boolean; data?: Direccionamiento[]; error?: string; details?: string }> {
	try {
		if (!credentials.nit || !credentials.tokenAcceso) {
			return {
				success: false,
				error: "NIT y token de acceso son requeridos",
			}
		}

		const result = await fetchDireccionamientoPorFecha(credentials.nit, getTokenAcceso(credentials), fecha)

		if (result.success && result.data) {
			const data = extractDireccionamientos(result.data)
			return { success: true, data }
		}

		return {
			success: false,
			error: result.error || "Error al consultar direccionamientos",
		}
	} catch (error) {
		return {
			success: false,
			error: "Error en la consulta de direccionamientos",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}

/**
 * Consultar direccionamientos por rango de fechas
 */
export async function consultarDireccionamientosPorRangoFechas(
	credentials: MipresCredentials,
	fechaInicio: string,
	fechaFin?: string
): Promise<{ success: boolean; data?: Direccionamiento[]; error?: string; details?: string }> {
	try {
		if (!credentials.nit || !credentials.tokenAcceso) {
			return {
				success: false,
				error: "NIT y token de acceso son requeridos",
			}
		}

		if (!fechaInicio && !fechaFin) {
			return {
				success: false,
				error: "Ingrese al menos una fecha (inicio o un rango completo)",
			}
		}

		const fechaParaBuscar = fechaInicio || fechaFin!
		const fechaFinalParaBuscar = fechaFin || fechaParaBuscar

		const validacion = validarRangoFechas(fechaParaBuscar, fechaFinalParaBuscar)
		if (!validacion.valid) {
			return {
				success: false,
				error: validacion.error,
			}
		}

		const fechasArray = generarRangoFechas(fechaParaBuscar, fechaFinalParaBuscar)
		const tareas = fechasArray.map((fecha) => {
			return async () => {
				const result = await fetchDireccionamientoPorFecha(
					credentials.nit,
					getTokenAcceso(credentials),
					fecha
				)
				if (result.success && result.data) {
					return extractDireccionamientos(result.data)
				}
				return []
			}
		})

		const resultados = await ejecutarPorChunks(tareas, 15)
		const data = marcarDireccionamientosDuplicados(combinarResultadosDireccionamientos(resultados))

		if (data.length > 0) {
			return { success: true, data }
		}

		return {
			success: false,
			error: "No se encontraron direccionamientos en el rango especificado",
		}
	} catch (error) {
		return {
			success: false,
			error: "Error al consultar direccionamientos por rango de fechas",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}

/**
 * Consultar direccionamientos por prescripcion
 */
export async function consultarDireccionamientosPorPrescripcion(
	credentials: MipresCredentials,
	noPrescripcion: string
): Promise<{ success: boolean; data?: Direccionamiento[]; error?: string; details?: string }> {
	try {
		if (!credentials.nit || !credentials.tokenAcceso) {
			return {
				success: false,
				error: "NIT y token de acceso son requeridos",
			}
		}

		const result = await fetchDireccionamientoPorPrescripcion(
			credentials.nit,
			getTokenAcceso(credentials),
			noPrescripcion
		)

		if (result.success && result.data) {
			const data = extractDireccionamientos(result.data)
			return { success: true, data }
		}

		return {
			success: false,
			error: result.error || "Error al consultar direccionamientos",
		}
	} catch (error) {
		return {
			success: false,
			error: "Error en la consulta de direccionamientos",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}

/**
 * Consultar direccionamientos por paciente y fecha
 */
export async function consultarDireccionamientosPorPaciente(
	credentials: MipresCredentials,
	fecha: string,
	tipoDoc: string,
	numDoc: string
): Promise<{ success: boolean; data?: Direccionamiento[]; error?: string; details?: string }> {
	try {
		if (!credentials.nit || !credentials.tokenAcceso) {
			return {
				success: false,
				error: "NIT y token de acceso son requeridos",
			}
		}

		const result = await fetchDireccionamientoPorPaciente(
			credentials.nit,
			fecha,
			getTokenAcceso(credentials),
			tipoDoc,
			numDoc
		)

		if (result.success && result.data) {
			const data = extractDireccionamientos(result.data)
			return { success: true, data }
		}

		return {
			success: false,
			error: result.error || "Error al consultar direccionamientos",
		}
	} catch (error) {
		return {
			success: false,
			error: "Error en la consulta de direccionamientos",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}

/**
 * Consultar direccionamientos por varios
 */
export async function consultarDireccionamientosMany(
	credentials: MipresCredentials,
	payload: unknown
): Promise<{ success: boolean; data?: Direccionamiento[]; error?: string; details?: string }> {
	try {
		if (!credentials.nit || !credentials.tokenAcceso) {
			return {
				success: false,
				error: "NIT y token de acceso son requeridos",
			}
		}

		const result = await fetchDireccionamientoMany(credentials.nit, getTokenAcceso(credentials), payload)

		if (result.success && result.data) {
			const data = extractDireccionamientos(result.data)
			return { success: true, data }
		}

		return {
			success: false,
			error: result.error || "Error al consultar direccionamientos",
		}
	} catch (error) {
		return {
			success: false,
			error: "Error en la consulta de direccionamientos",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}

/**
 * Función genérica para consultar direccionamientos
 */
export async function consultarDireccionamientos(
	credentials: MipresCredentials,
	tipo: TipoConsultaDireccionamiento,
	params: {
		fecha?: string
		fechaInicio?: string
		fechaFin?: string
		tipoDoc?: string
		numDoc?: string
		noPrescripcion?: string
	}
): Promise<{ success: boolean; data?: Direccionamiento[]; error?: string; details?: string }> {
	switch (tipo) {
		case "fecha":
			if (!params.fecha) return { success: false, error: "Fecha es requerida" }
			return consultarDireccionamientosPorFecha(credentials, params.fecha)

		case "rango":
			if (!params.fechaInicio) return { success: false, error: "fechaInicio es requerida" }
			return consultarDireccionamientosPorRangoFechas(credentials, params.fechaInicio, params.fechaFin)

		case "prescripcion":
			if (!params.noPrescripcion) return { success: false, error: "Número de prescripción es requerido" }
			return consultarDireccionamientosPorPrescripcion(credentials, params.noPrescripcion)

		case "paciente":
			if (!params.fecha || !params.tipoDoc || !params.numDoc) {
				return { success: false, error: "Fecha, tipo y número de documento son requeridos" }
			}
			return consultarDireccionamientosPorPaciente(
				credentials,
				params.fecha,
				params.tipoDoc,
				params.numDoc
			)

		default:
			return { success: false, error: "Tipo de consulta no válido" }
	}
}
