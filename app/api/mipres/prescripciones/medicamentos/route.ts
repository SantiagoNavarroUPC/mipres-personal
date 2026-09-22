import { NextRequest, NextResponse } from "next/server"
import { getRequiredEnv } from "../../../../../lib/env"

type MedicamentoRecord = {
  estadoregistro?: unknown
  estadocum?: unknown
  [key: string]: unknown
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function isVigenteAndActivo(item: MedicamentoRecord): boolean {
  const estadoRegistro = normalizeText(item.estadoregistro)
  const estadoCum = normalizeText(item.estadocum)
  return estadoRegistro === "vigente" && estadoCum === "activo"
}

function matchesSearch(item: MedicamentoRecord, search: string): boolean {
  const q = normalizeText(search)
  if (!q) return true

  const producto = normalizeText(item.producto)
  const expedientecum = normalizeText(item.expedientecum)
  const consecutivocum = normalizeText(item.consecutivocum)
  const codigoInterno = normalizeText(item.codigo_interno)
  const descripcion = normalizeText(item.descripcion)
  const codigoCompuesto = `${expedientecum}-${consecutivocum}`

  return (
    producto.includes(q) ||
    expedientecum.includes(q) ||
    consecutivocum.includes(q) ||
    codigoCompuesto.includes(q) ||
    codigoInterno.includes(q) ||
    descripcion.includes(q)
  )
}

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() || ""
    const medicamentosUrls = [
      getRequiredEnv("NEXT_PUBLIC_MEDICAMENTOS_API_URL").trim(),
      getRequiredEnv("NEXT_PUBLIC_MEDICAMENTOS_API_URL_2").trim(),
      getRequiredEnv("NEXT_PUBLIC_MEDICAMENTOS_API_URL_3").trim(),
      getRequiredEnv("NEXT_PUBLIC_MEDICAMENTOS_API_URL_4").trim(),
    ]

    const settledResponses = await Promise.allSettled(
      medicamentosUrls.map(async (url) => {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Error from data source ${url}: ${response.status}`)
        }

        return response.json()
      })
    )

    const fulfilled = settledResponses.filter(
      (item): item is PromiseFulfilledResult<unknown> => item.status === "fulfilled"
    )

    if (fulfilled.length === 0) {
      return NextResponse.json(
        { error: "Error fetching medicamentos data from all sources" },
        { status: 502 }
      )
    }

    const merged = fulfilled.flatMap((item) =>
      Array.isArray(item.value) ? (item.value as MedicamentoRecord[]) : []
    )

    const filtered = merged.filter(isVigenteAndActivo)
    const filteredBySearch = search
      ? filtered.filter((item) => matchesSearch(item, search))
      : filtered

    // Fallback: si no hay coincidencias para el search en fuentes publicas, consultar backend DUSAKAWI.
    if (filteredBySearch.length === 0 && search) {
      const dusakawiBaseUrl = getRequiredEnv("DUSAKAWI_API_URL").trim()
      const fallbackUrl = `${dusakawiBaseUrl}/api/mipres/medicamentos?search=${encodeURIComponent(search)}`

      const fallbackResponse = await fetch(fallbackUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      })

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        return NextResponse.json(fallbackData)
      }
    }

    return NextResponse.json(filteredBySearch)
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching medicamentos data" },
      { status: 500 }
    )
  }
}
