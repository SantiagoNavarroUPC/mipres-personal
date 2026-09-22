import type { JuntaProfesional } from "@/models/mipres-sispro/junta_profesional/junta_profesional"
import type { JuntaProfesionalRequestResult } from "@/requests/mipres-sispro/junta-profesionales.requets"
import { fetchJuntaProfesional } from "@/requests/mipres-sispro/junta-profesionales.requets"

function normalizeJuntaProfesionalData(data: unknown): JuntaProfesional[] {
	if (!data) return []

	const unwrapItem = (item: unknown): JuntaProfesional | null => {
		if (!item || typeof item !== "object") return item as JuntaProfesional
		const rec = item as { junta_profesional?: unknown; juntaProfesional?: unknown }
		if (rec.junta_profesional && typeof rec.junta_profesional === "object") return rec.junta_profesional as JuntaProfesional
		if (rec.juntaProfesional && typeof rec.juntaProfesional === "object") return rec.juntaProfesional as JuntaProfesional
		return item as JuntaProfesional
	}

	if (Array.isArray(data)) {
		return data
			.map(unwrapItem)
			.filter((item): item is JuntaProfesional => Boolean(item))
	}
	if (typeof data === "object") {
		const record = data as {
			root?: unknown
			data?: unknown
			juntaProfesional?: unknown
			junta_profesional?: unknown
		}
		if (Array.isArray(record.root)) return record.root.map(unwrapItem).filter((item): item is JuntaProfesional => Boolean(item))
		if (Array.isArray(record.data)) return record.data.map(unwrapItem).filter((item): item is JuntaProfesional => Boolean(item))
		if (Array.isArray(record.juntaProfesional)) return record.juntaProfesional.map(unwrapItem).filter((item): item is JuntaProfesional => Boolean(item))
		if (record.junta_profesional && typeof record.junta_profesional === "object") return [record.junta_profesional as JuntaProfesional]
	}
	return [data as JuntaProfesional]
}

export async function consultarJuntaProfesional(
	nit: string,
	token: string,
	numeroPrescripcion: string
): Promise<JuntaProfesionalRequestResult<JuntaProfesional[]>> {
	if (!nit || !token || !numeroPrescripcion) {
		return {
			success: false,
			error: "nit, token y numeroPrescripcion son requeridos",
		}
	}

	const result = await fetchJuntaProfesional(nit, token, numeroPrescripcion)

	if (!result.success) {
		return result as JuntaProfesionalRequestResult<JuntaProfesional[]>
	}

	return {
		success: true,
		status: result.status,
		data: normalizeJuntaProfesionalData(result.data),
	}
}
