"use client"

import { useEffect, useMemo, useState } from "react"
import type { Medicamento } from "../types"

function normalizeMedicamentoItem(item: any): Medicamento | null {
  if (!item || typeof item !== "object") return null

  // Formato fuentes publicas
  if (item.producto && item.expedientecum && item.consecutivocum) {
    const producto = String(item.producto)
    const expedientecum = String(item.expedientecum)
    const consecutivocum = String(item.consecutivocum)
    return {
      producto,
      expedientecum,
      consecutivocum,
      codigo: `${expedientecum}-${consecutivocum}`,
    }
  }

  // Formato fallback DUSAKAWI
  if (item.codigo_interno || item.descripcion) {
    const codigoInterno = String(item.codigo_interno ?? "").trim()
    const descripcion = String(item.descripcion ?? "").trim()
    if (!codigoInterno && !descripcion) return null

    return {
      producto: descripcion || codigoInterno,
      expedientecum: codigoInterno,
      consecutivocum: "",
      codigo: codigoInterno || descripcion,
    }
  }

  return null
}

function normalizeMedicamentosPayload(data: unknown): Medicamento[] {
  const source = Array.isArray(data) ? data : data ? [data] : []
  const normalized = source
    .map((item) => normalizeMedicamentoItem(item))
    .filter((item): item is Medicamento => Boolean(item))

  // Evitar duplicados por codigo
  const byCodigo = new Map<string, Medicamento>()
  for (const med of normalized) {
    const key = med.codigo.trim().toLowerCase()
    if (!key) continue
    if (!byCodigo.has(key)) byCodigo.set(key, med)
  }
  return Array.from(byCodigo.values())
}

export function useMedicamentos(shouldLoad: boolean) {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [medicamentosLoading, setMedicamentosLoading] = useState(false)
  const [medicamentosError, setMedicamentosError] = useState<string | null>(null)
  const [medicamentoQuery, setMedicamentoQuery] = useState("")
  const [medicamentoSearch, setMedicamentoSearch] = useState("")

  const filteredMedicamentos = useMemo(() => {
    const query = medicamentoSearch.trim().toLowerCase()
    if (!query) return []
    return medicamentos.filter((item) => {
      return (
        item.producto.toLowerCase().includes(query) ||
        item.expedientecum.toLowerCase().includes(query) ||
        item.consecutivocum.toLowerCase().includes(query) ||
        item.codigo.toLowerCase().includes(query)
      )
    })
  }, [medicamentos, medicamentoSearch])

  useEffect(() => {
    if (!shouldLoad) return

    const controller = new AbortController()
    let active = true

    const loadMedicamentos = async () => {
      setMedicamentosLoading(true)
      setMedicamentosError(null)
      try {
        const query = medicamentoSearch.trim()
        const endpoint = query
          ? `/api/mipres/prescripciones/medicamentos?search=${encodeURIComponent(query)}`
          : "/api/mipres/prescripciones/medicamentos"

        const response = await fetch(endpoint, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("No se pudo cargar medicamentos")
        }

        const data = await response.json()
        if (!active) return

        const normalized = normalizeMedicamentosPayload(data)

        setMedicamentos(normalized)
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
        setMedicamentosError("No se pudo cargar la lista de medicamentos")
      } finally {
        if (active) setMedicamentosLoading(false)
      }
    }

    void loadMedicamentos()

    return () => {
      active = false
      controller.abort()
    }
  }, [shouldLoad, medicamentoSearch])

  return {
    medicamentos,
    medicamentosLoading,
    medicamentosError,
    medicamentoQuery,
    setMedicamentoQuery,
    medicamentoSearch,
    setMedicamentoSearch,
    filteredMedicamentos,
  }
}
