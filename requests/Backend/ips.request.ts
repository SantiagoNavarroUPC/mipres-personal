import { getRequiredEnv } from "@/lib/env"

const DUSAKAWI_API_URL = getRequiredEnv("DUSAKAWI_API_URL").trim()

export interface IpsItem {
  id_empresa_prestador?: number
  nit?: string
  razon_social?: string
  ips_nombre?: string
  ips?: string
  nombre?: string
  codigo_prestador?: string
  direccion?: string
  direccion_sede?: string
  telefono?: string
  correo_electronico?: string
  id_municipio?: number | null
  municipio_codigo?: string | null
  municipio_nombre?: string | null
  departamento_codigo?: string | null
  departamento_nombre?: string | null
}

export interface RequestResult<T = unknown> {
  success: boolean
  status: number
  error?: string
  data?: T
}

function normalizeResponse(data: unknown): IpsItem[] {
  if (!data) return []
  if (Array.isArray(data)) return data as IpsItem[]
  if (typeof data === "object") {
    const record = data as { value?: unknown; data?: unknown; root?: unknown }
    if (Array.isArray(record.value)) return record.value as IpsItem[]
    if (Array.isArray(record.data)) return record.data as IpsItem[]
    if (Array.isArray(record.root)) return record.root as IpsItem[]
  }
  return [data as IpsItem]
}

function normalizeSearchVariants(search: string): string[] {
  const trimmed = String(search || "").trim()
  if (!trimmed) return []
  const digitsOnly = trimmed.replace(/\D/g, "")
  const beforeHyphen = trimmed.includes("-") ? trimmed.split("-")[0].replace(/\D/g, "") : ""
  return Array.from(new Set([trimmed, digitsOnly, beforeHyphen].filter(Boolean)))
}

function extractIpsName(item: IpsItem): string {
  return String(item.ips_nombre || item.razon_social || item.ips || item.nombre || "").trim()
}

export async function fetchIpsByNit(nit: string): Promise<RequestResult<IpsItem[]>> {
  const searches = normalizeSearchVariants(nit)
  if (searches.length === 0) {
    return { success: false, status: 400, error: "NIT requerido" }
  }

  let lastError = "Sin coincidencias"

  for (const search of searches) {
    try {
      const url = new URL(`${DUSAKAWI_API_URL}/api/mipres/ips`)
      url.searchParams.set("search", search)

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        lastError = `Error from API: ${response.status}`
        continue
      }

      const raw = await response.json()
      const items = normalizeResponse(raw)
      const exact = items.find((item) => String(item.nit || "").trim() === String(nit || "").trim())
      const list = exact ? [exact] : items

      if (list.length > 0) {
        return { success: true, status: response.status, data: list }
      }

      const fallbackName = items.find((item) => extractIpsName(item))
      if (fallbackName) {
        return { success: true, status: response.status, data: [fallbackName] }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Error fetching IPS data"
    }
  }

  return { success: false, status: 404, error: lastError }
}
