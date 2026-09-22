import type { MipresCredentials } from "@/models/credentials.model"
import type { Tutela } from "@/models/mipres-sispro/tutela/tutela"
import {
	fetchTutelasPorFecha,
	fetchTutelasPorPaciente,
	fetchTutelasPorNumero,
	fetchNovedadesTutelas,
	type TipoConsultaTutela,
} from "@/requests/mipres-sispro/tutelas.request"
import {
	extractTutelas,
	generarRangoFechas,
	ejecutarConConcurrencia,
} from "./tutela-procesos.controller"
import { fetchDireccionamientoPorPrescripcion } from "@/requests/mipres-sispro/direccionamiento.request"

function getTokenRaw(credentials: MipresCredentials): string {
	return credentials.tokenSubsidiado || credentials.tokenContributivo || ""
}

function hasDireccionamientos(raw: any): boolean {
	if (!raw) return false
	if (Array.isArray(raw)) return raw.length > 0
	if (raw.root && Array.isArray(raw.root)) return raw.root.length > 0
	if (raw.direccionamientos && Array.isArray(raw.direccionamientos)) return raw.direccionamientos.length > 0
	return true
}

async function marcarDireccionamientosTutelas(credentials: MipresCredentials, tutelas: Tutela[]) {
	const statusByTutela = new Map<string, boolean>()
	const uniqueTutelas = Array.from(
		new Set(tutelas.map((tutela) => tutela.NoTutela).filter(Boolean))
	)

	const tareas = uniqueTutelas.map((noTutela) => {
		return async () => {
			// Usar el NoTutela como si fuera NoPrescripcion para consultar direccionamientos
			const result = await fetchDireccionamientoPorPrescripcion(
				credentials.nit,
				credentials.tokenAcceso,
				noTutela
			)

			const direccionada = result.success ? hasDireccionamientos(result.data) : false
			statusByTutela.set(noTutela, direccionada)
		}
	})

	await ejecutarConConcurrencia(tareas, 10)

	return tutelas.map((tutela) => ({
		...tutela,
		direccionada: tutela.NoTutela ? statusByTutela.get(tutela.NoTutela) || false : false,
	}))
}

export async function consultarTutelas(
	credentials: MipresCredentials,
	tipo: TipoConsultaTutela,
	params: {
		fecha?: string
		tipoDoc?: string
		numDoc?: string
		noTutela?: string
	}
): Promise<{ success: boolean; data?: Tutela[] | any[]; error?: string; details?: string }> {
	try {
		if (!credentials.nit || !getTokenRaw(credentials)) {
			return {
				success: false,
				error: "NIT y Token (sin validar) son requeridos",
			}
		}

		let result: { success: boolean; data?: any; error?: string }

		switch (tipo) {
			case "fecha":
				if (!params.fecha) return { success: false, error: "Fecha es requerida" }
				result = await fetchTutelasPorFecha(credentials.nit, params.fecha, getTokenRaw(credentials))
				break
			case "paciente":
				if (!params.fecha || !params.tipoDoc || !params.numDoc) {
					return { success: false, error: "Fecha, tipo y numero de documento son requeridos" }
				}
				result = await fetchTutelasPorPaciente(
					credentials.nit,
					params.fecha,
					getTokenRaw(credentials),
					params.tipoDoc,
					params.numDoc
				)
				break
			case "numero":
				if (!params.noTutela) return { success: false, error: "Numero de tutela es requerido" }
				result = await fetchTutelasPorNumero(credentials.nit, getTokenRaw(credentials), params.noTutela)
				break
			case "novedades":
				if (!params.fecha) return { success: false, error: "Fecha es requerida" }
				result = await fetchNovedadesTutelas(credentials.nit, params.fecha, getTokenRaw(credentials))
				break
			default:
				return { success: false, error: "Tipo de consulta no valido" }
		}

		if (result.success && result.data) {
			if (tipo === "novedades") {
				return { success: true, data: Array.isArray(result.data) ? result.data : [result.data] }
			}
			const extractedTutelas = extractTutelas(result.data)
			const tutelasConDireccionamiento = await marcarDireccionamientosTutelas(credentials, extractedTutelas)
			return { success: true, data: tutelasConDireccionamiento }
		}

		return { success: false, error: result.error || "Error al consultar tutelas" }
	} catch (error) {
		return {
			success: false,
			error: "Error en la consulta de tutelas",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}

export async function consultarTutelasPorRangoFechas(
	credentials: MipresCredentials,
	fechaInicio: string,
	fechaFin?: string,
	pacienteParams?: { tipoDoc: string; numDoc: string }
): Promise<{ success: boolean; data?: Tutela[]; error?: string; details?: string }> {
	try {
		if (!credentials.nit || !getTokenRaw(credentials)) {
			return {
				success: false,
				error: "NIT y Token (sin validar) son requeridos",
			}
		}

		const fechaFinal = fechaFin || fechaInicio
		const rango = generarRangoFechas(fechaInicio, fechaFinal)

		const tareas = rango.map((fecha) => async () => {
			let res
			if (pacienteParams) {
				res = await fetchTutelasPorPaciente(
					credentials.nit,
					fecha,
					getTokenRaw(credentials),
					pacienteParams.tipoDoc,
					pacienteParams.numDoc
				)
			} else {
				res = await fetchTutelasPorFecha(credentials.nit, fecha, getTokenRaw(credentials))
			}
			return res.success && res.data ? extractTutelas(res.data) : []
		})

		const resultados = await ejecutarConConcurrencia(tareas, 10)
		const data = resultados.flat()

		const tutelasConDireccionamiento = await marcarDireccionamientosTutelas(credentials, data)
		return { success: true, data: tutelasConDireccionamiento }
	} catch (error) {
		return {
			success: false,
			error: "Error en la consulta por rango",
			details: error instanceof Error ? error.message : "Error desconocido",
		}
	}
}
