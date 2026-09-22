import { getRequiredEnv } from "@/lib/env"

export interface JuntaProfesionalRequestResult<T = unknown> {
	success: boolean
	data?: T
	error?: string
	status?: number
}

const BASE_URL = getRequiredEnv("BASE_URL")

function buildUrl(nit: string, token: string, numeroPrescripcion: string): string {
	return `${BASE_URL}/JuntaProfesional/${nit}/${token}/${numeroPrescripcion}`
}

async function requestToMipres<T>(urlString: string): Promise<JuntaProfesionalRequestResult<T>> {
	try {
		const response = await fetch(urlString, {
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		})

		const rawBody = await response.text()
		let responseBody: unknown = rawBody
		if (rawBody) {
			try {
				responseBody = JSON.parse(rawBody)
			} catch {
				responseBody = rawBody
			}
		}

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				data: responseBody as T,
				error: `HTTP ${response.status}`,
			}
		}

		return {
			success: true,
			status: response.status,
			data: responseBody as T,
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

export async function fetchJuntaProfesional(nit: string, token: string, numeroPrescripcion: string) {
	return requestToMipres(buildUrl(nit, token, numeroPrescripcion))
}


