import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import type { MipresCredentials } from "@/models/credentials.model"
import type { TipoConsultaDireccionamiento } from "@/requests/mipres-sispro/direccionamiento.request"
import {
	anularDireccionamiento,
	consultarDireccionamientos,
	consultarDireccionamientosMany,
	registrarDireccionamiento,
} from "@/controllers/mipres-controller/direccionamiento-controller/direccionamiento.controller"
import { marcarDireccionamientosDuplicados } from "@/controllers/mipres-controller/direccionamiento-controller/direccionamiento-procesos.controller"

function logDireccionamiento(requestId: string, message: string, meta?: Record<string, unknown>) {
	if (meta && Object.keys(meta).length > 0) {
		console.info(`[direccionamiento:${requestId}] ${message}`, meta)
		return
	}

	console.info(`[direccionamiento:${requestId}] ${message}`)
}

function jsonWithRequestId(
	requestId: string,
	body: unknown,
	init?: number | ResponseInit
) {
	const normalizedInit: ResponseInit | undefined =
		typeof init === "number" ? { status: init } : init
	const response = NextResponse.json(body as any, normalizedInit)
	response.headers.set("x-request-id", requestId)
	return response
}

function buildCredentials(
	nit: string,
	tokenAcceso?: string | null,
	tokenSubsidiado?: string | null,
	tokenContributivo?: string | null
): MipresCredentials {
	return {
		nit,
		tokenAcceso: tokenAcceso || "",
		tokenAccesoSubsidiado: tokenSubsidiado || undefined,
		tokenAccesoContributivo: tokenContributivo || undefined,
	}
}

function toNormalizedInt(value: unknown): number {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function toNormalizedString(value: unknown): string {
	return String(value ?? "").trim()
}

function sortRowsByConTecAndNoEntrega<T extends { ConTec?: unknown; NoEntrega?: unknown }>(items: T[]): T[] {
	return [...items].sort((left, right) => {
		const conTecDiff = toNormalizedInt(left.ConTec) - toNormalizedInt(right.ConTec)
		if (conTecDiff !== 0) return conTecDiff
		return toNormalizedInt(left.NoEntrega) - toNormalizedInt(right.NoEntrega)
	})
}

function extractRegistrarRows(payload: unknown): any[] {
	if (!payload || typeof payload !== "object") return []
	const body = payload as Record<string, unknown>
	if (Array.isArray(body.rows)) return body.rows
	if (Array.isArray(body.entregas)) return body.entregas
	return [body]
}

export async function GET(request: NextRequest) {
	const requestId = randomUUID()
	try {
		const searchParams = request.nextUrl.searchParams
		const nit = searchParams.get("nit")
		const tokenAcceso = searchParams.get("tokenAcceso")
		const tokenSubsidiado = searchParams.get("tokenSubsidiado")
		const tokenContributivo = searchParams.get("tokenContributivo")
		const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
		const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
		const tipo = searchParams.get("tipo") as TipoConsultaDireccionamiento
		const fecha = searchParams.get("fecha")
		const fechaInicio = searchParams.get("fechaInicio")
		const fechaFin = searchParams.get("fechaFin")
		const tipoDoc = searchParams.get("tipoDoc")
		const numDoc = searchParams.get("numDoc")
		const noPrescripcion = searchParams.get("noPrescripcion")
		logDireccionamiento(requestId, "GET received", {
			nit,
			tipo,
			fecha,
			fechaInicio,
			fechaFin,
			tipoDoc,
			numDoc,
			noPrescripcion,
			hasTokenAcceso: Boolean(tokenAcceso),
			hasDualTokens: Boolean(tokenAccesoSubsidiado && tokenAccesoContributivo),
		})

		if (!nit || (!tokenAcceso && !tokenAccesoSubsidiado && !tokenAccesoContributivo)) {
			return jsonWithRequestId(
				requestId,
				{ success: false, error: "NIT y token son requeridos" },
				{ status: 400 }
			)
		}

		if (!tipo) {
			return jsonWithRequestId(
				requestId,
				{ success: false, error: "Tipo de consulta es requerido (fecha|prescripcion|paciente)" },
				{ status: 400 }
			)
		}

		const params = {
			fecha: fecha || undefined,
			fechaInicio: fechaInicio || undefined,
			fechaFin: fechaFin || undefined,
			tipoDoc: tipoDoc || undefined,
			numDoc: numDoc || undefined,
			noPrescripcion: noPrescripcion || undefined,
		}

		const tieneTokensAcceso = Boolean(tokenAccesoSubsidiado && tokenAccesoContributivo)

		if (tieneTokensAcceso) {
			const credentialsSubsidiado = buildCredentials(
				nit,
				tokenAccesoSubsidiado,
				tokenAccesoSubsidiado,
				tokenAccesoContributivo
			)
			const credentialsContributivo = buildCredentials(
				nit,
				tokenAccesoContributivo,
				tokenAccesoSubsidiado,
				tokenAccesoContributivo
			)

			const [resultSubsidiado, resultContributivo] = await Promise.all([
				consultarDireccionamientos(credentialsSubsidiado, tipo, params),
				consultarDireccionamientos(credentialsContributivo, tipo, params),
			])
			logDireccionamiento(requestId, "GET completed dual query", {
				subsidiado: resultSubsidiado.success ? (resultSubsidiado.data?.length || 0) : 0,
				contributivo: resultContributivo.success ? (resultContributivo.data?.length || 0) : 0,
			})

			const dataSubsidiado = (resultSubsidiado.success ? resultSubsidiado.data : []) || []
			const dataContributivo = (resultContributivo.success ? resultContributivo.data : []) || []

			const merged = [
				...dataSubsidiado.map((item) => ({ ...item, tipoRegimen: "Subsidiado" })),
				...dataContributivo.map((item) => ({ ...item, tipoRegimen: "Contributivo" })),
			]
			const mergedWithDuplicates = marcarDireccionamientosDuplicados(merged)

			if (mergedWithDuplicates.length > 0) {
				return jsonWithRequestId(requestId, {
					success: true,
					data: mergedWithDuplicates,
					total: mergedWithDuplicates.length,
					meta: {
						subsidiado: dataSubsidiado.length,
						contributivo: dataContributivo.length,
					},
				})
			}

			return jsonWithRequestId(
				requestId,
				{
					success: false,
					error: "No se encontraron direccionamientos",
					details: {
						subsidiado: resultSubsidiado.success ? undefined : resultSubsidiado.error,
						contributivo: resultContributivo.success ? undefined : resultContributivo.error,
					},
				},
				{ status: 400 }
			)
		}

		const credentials = buildCredentials(nit, tokenAcceso, tokenSubsidiado, tokenContributivo)
		const result = await consultarDireccionamientos(credentials, tipo, params)
		logDireccionamiento(requestId, "GET completed", {
			resultSuccess: result.success,
			resultCount: result.success ? (result.data?.length || 0) : 0,
		})

		if (result.success) {
			return jsonWithRequestId(requestId, {
				success: true,
				data: result.data,
				total: result.data?.length || 0,
			})
		}

		return jsonWithRequestId(
			requestId,
			{ success: false, error: result.error, details: result.details },
			{ status: 400 }
		)
	} catch (error) {
		return jsonWithRequestId(
			requestId,
			{
				success: false,
				error: "Error interno del servidor",
				details: error instanceof Error ? error.message : "Error desconocido",
			},
			{ status: 500 }
		)
	}
}

export async function POST(request: NextRequest) {
	const requestId = randomUUID()
	try {
		const requestData = await request.json()
		const { nit, tokenAcceso, tipo, body: payload } = requestData
		logDireccionamiento(requestId, "POST received", {
			nit,
			tipo,
			payloadKeys: payload && typeof payload === "object" && !Array.isArray(payload) ? Object.keys(payload).slice(0, 12) : undefined,
		})

		if (!nit || !tokenAcceso) {
			return jsonWithRequestId(
				requestId,
				{ success: false, error: "NIT y token son requeridos" },
				{ status: 400 }
			)
		}

		const credentials = buildCredentials(nit, tokenAcceso)

		switch (tipo) {
			case "registrar": {
				if (!payload) {
					return jsonWithRequestId(
						requestId,
						{ success: false, error: "Body es requerido para registrar" },
						{ status: 400 }
					)
				}
					const rawRows = sortRowsByConTecAndNoEntrega(extractRegistrarRows(payload))

					if (rawRows.length === 0) {
						return jsonWithRequestId(requestId, { success: false, error: "No hay filas para registrar" }, { status: 400 })
					}

					const resultados: Array<{
						rowKey: string
						registrar: unknown
					}> = []

					for (const row of rawRows) {
						const registrarResult = await registrarDireccionamiento(credentials, row)
						const rowKey = `${toNormalizedString((row as any)?.TipoTec).toUpperCase()}|${toNormalizedInt((row as any)?.ConTec)}|${toNormalizedInt((row as any)?.NoEntrega)}`
						if (!registrarResult.success) {
							logDireccionamiento(requestId, "POST registrar failed for row", { rowKey, error: registrarResult.error, details: registrarResult.details })
							return jsonWithRequestId(
								requestId,
								{
									success: false,
									error: registrarResult.error || "Error al registrar direccionamiento",
									details: {
										row: rowKey,
										registrar: registrarResult.details || null,
									},
								},
								{ status: 400 }
							)
						}

						resultados.push({
							rowKey,
							registrar: registrarResult.data || null,
						})
					}

					logDireccionamiento(requestId, "POST registrar completed", {
						rows: resultados.length,
					})

					return jsonWithRequestId(requestId, {
						success: true,
						data: resultados,
						total: resultados.length,
						exitosos: resultados.length,
						fallidos: 0,
					})
			}

			case "many": {
				if (!payload) {
					return jsonWithRequestId(
						requestId,
						{ success: false, error: "Body es requerido para consulta many" },
						{ status: 400 }
					)
				}
				const result = await consultarDireccionamientosMany(credentials, payload)
				logDireccionamiento(requestId, "POST many completed", {
					success: result.success,
					count: result.success ? (result.data?.length || 0) : 0,
				})
				if (result.success) {
					return jsonWithRequestId(requestId, {
						success: true,
						data: result.data,
						total: result.data?.length || 0,
					})
				}
				return jsonWithRequestId(
					requestId,
					{ success: false, error: result.error, details: result.details },
					{ status: 400 }
				)
			}

			default:
				return jsonWithRequestId(
					requestId,
					{ success: false, error: "Tipo de operacion no valido (registrar|many)" },
					{ status: 400 }
				)
		}
	} catch (error) {
		return jsonWithRequestId(
			requestId,
			{
				success: false,
				error: "Error interno del servidor",
				details: error instanceof Error ? error.message : "Error desconocido",
			},
			{ status: 500 }
		)
	}
}

export async function PUT(request: NextRequest) {
	const requestId = randomUUID()
	try {
		const { nit, tokenAcceso, idDireccionamiento } = await request.json()
		logDireccionamiento(requestId, "PUT received", {
			nit,
			idDireccionamiento,
		})

		if (!nit || !tokenAcceso) {
			return jsonWithRequestId(
				requestId,
				{ success: false, error: "NIT y token son requeridos" },
				{ status: 400 }
			)
		}

		if (!idDireccionamiento) {
			return jsonWithRequestId(
				requestId,
				{ success: false, error: "idDireccionamiento es requerido" },
				{ status: 400 }
			)
		}

		const credentials = buildCredentials(nit, tokenAcceso)
		const result = await anularDireccionamiento(credentials, idDireccionamiento)
		logDireccionamiento(requestId, "PUT completed", {
			success: result.success,
			idDireccionamiento,
		})

		if (result.success) {
			return jsonWithRequestId(requestId, { success: true, data: result.data })
		}

		return jsonWithRequestId(
			requestId,
			{ success: false, error: result.error, details: result.details },
			{ status: 400 }
		)
	} catch (error) {
		return jsonWithRequestId(
			requestId,
			{
				success: false,
				error: "Error interno del servidor",
				details: error instanceof Error ? error.message : "Error desconocido",
			},
			{ status: 500 }
		)
	}
}
