"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Receipt,
  ArrowLeft,
  ArrowRight,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Search,
  Plus,
  X,
  Loader2,
} from "lucide-react"
import type { Facturacion } from "@/models/mipres-sispro/facturacion/facturacion"
import { ESTADOS_FACTURACION, TIPOS_TEC_FACTURACION } from "@/models/constants"

interface FacturacionTableProps {
  facturaciones: Facturacion[]
  keysConDatos?: Set<string>
  idsConDatos?: Record<string, number>
  loadingDatos?: boolean
  onRegistrar?: (fac: Facturacion) => Promise<void>
  onAnular?: (fac: Facturacion, idDatosFacturado: number) => Promise<void>
  onOpenDetalle?: (fac: Facturacion) => void
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function parseDateTs(value: string | null | undefined): number {
  if (!value) return 0
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value
  const ts = new Date(normalized).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function EstadoBadge({ estado }: { estado: number }) {
  const label = ESTADOS_FACTURACION[estado] ?? `Estado ${estado}`
  if (estado === 2) {
    return (
      <Badge variant="outline" className="text-[10px] h-5 px-2 bg-emerald-50 text-emerald-700 border-emerald-200">
        {label}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] h-5 px-2 bg-amber-50 text-amber-700 border-amber-200">
      {label}
    </Badge>
  )
}

function TipoTecBadge({ tipo }: { tipo: string }) {
  const colorMap: Record<string, string> = {
    M: "bg-emerald-50 text-emerald-700 border-emerald-200",
    P: "bg-sky-50 text-sky-700 border-sky-200",
    D: "bg-amber-50 text-amber-700 border-amber-200",
    N: "bg-rose-50 text-rose-700 border-rose-200",
    S: "bg-violet-50 text-violet-700 border-violet-200",
  }
  const label = TIPOS_TEC_FACTURACION[tipo] ?? tipo
  return (
    <Badge variant="outline" className={`text-[10px] h-5 px-2 ${colorMap[tipo] ?? ""}`}>
      {tipo} · {label}
    </Badge>
  )
}

export function FacturacionTable({ facturaciones, keysConDatos, idsConDatos, loadingDatos, onRegistrar, onAnular, onOpenDetalle }: FacturacionTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const [tipoTecFilter, setTipoTecFilter] = useState("all")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [dateSort, setDateSort] = useState<"none" | "asc" | "desc">("none")
  const [registrando, setRegistrando] = useState<Set<string>>(new Set())
  const [anulando, setAnulando] = useState<Set<string>>(new Set())
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [registrandoBulk, setRegistrandoBulk] = useState(false)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let result = facturaciones.filter((fac) => {
      if (q) {
        const matchPresc = fac.NoPrescripcion?.toLowerCase().includes(q)
        const matchFactura = fac.NoFactura?.toLowerCase().includes(q)
        const matchPaciente = fac.NoIDPaciente?.toLowerCase().includes(q)
        if (!matchPresc && !matchFactura && !matchPaciente) return false
      }
      if (tipoTecFilter !== "all" && fac.TipoTec !== tipoTecFilter) return false
      if (estadoFilter !== "all" && String(fac.EstFacturacion) !== estadoFilter) return false
      return true
    })

    if (dateSort !== "none") {
      result = [...result].sort((a, b) => {
        const ta = parseDateTs(a.FecFacturacion)
        const tb = parseDateTs(b.FecFacturacion)
        return dateSort === "asc" ? ta - tb : tb - ta
      })
    }

    return result
  }, [facturaciones, search, tipoTecFilter, estadoFilter, dateSort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const displayed = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const pendingKeysPage = useMemo(() => {
    if (keysConDatos === undefined || !onRegistrar) return new Set<string>()
    return new Set(
      displayed
        .map((fac) => `${fac.NoPrescripcion}-${fac.ConTec}-${fac.NoEntrega}`)
        .filter((key) => !keysConDatos.has(key))
    )
  }, [displayed, keysConDatos, onRegistrar])

  const allPageSelected = pendingKeysPage.size > 0 && [...pendingKeysPage].every((k) => selectedKeys.has(k))
  const somePageSelected = pendingKeysPage.size > 0 && [...pendingKeysPage].some((k) => selectedKeys.has(k))

  useEffect(() => {
    if (!keysConDatos) return
    setSelectedKeys((prev) => {
      const cleaned = new Set([...prev].filter((k) => !keysConDatos.has(k)))
      return cleaned.size === prev.size ? prev : cleaned
    })
  }, [keysConDatos])

  useEffect(() => { setSelectedKeys(new Set()) }, [facturaciones])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected
    }
  }, [somePageSelected, allPageSelected])

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        pendingKeysPage.forEach((k) => next.delete(k))
      } else {
        pendingKeysPage.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleRegistrarSeleccionados = async () => {
    if (!onRegistrar || selectedKeys.size === 0 || registrandoBulk) return
    setRegistrandoBulk(true)
    const seleccionadas = filtered.filter((fac) =>
      selectedKeys.has(`${fac.NoPrescripcion}-${fac.ConTec}-${fac.NoEntrega}`)
    )
    for (const fac of seleccionadas) {
      const rowKey = `${fac.NoPrescripcion}-${fac.ConTec}-${fac.NoEntrega}`
      setRegistrando((prev) => new Set([...prev, rowKey]))
      try {
        await onRegistrar(fac)
      } catch {
        // continúa con el siguiente
      } finally {
        setRegistrando((prev) => { const s = new Set(prev); s.delete(rowKey); return s })
      }
    }
    setSelectedKeys(new Set())
    setRegistrandoBulk(false)
  }

  const handleFilterChange = (fn: () => void) => { fn(); setPage(1) }

  const handleExport = () => {
    const headers = [
      "NoPrescripcion", "TipoTec", "ConTec", "NoEntrega", "NoSubEntrega",
      "NoFactura", "TipoIDPaciente", "NoIDPaciente", "CantUnMinDis",
      "ValorUnitFacturado", "ValorTotFacturado", "CuotaModer", "Copago",
      "FecFacturacion", "EstFacturacion", "FecAnulacion", "CodigosFacturacion",
    ]
    const rows = filtered.map((f) =>
      headers.map((h) => {
        const v = (f as any)[h]
        return v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`
      }).join(",")
    )
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "facturacion.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const openDetalle = (fac: Facturacion) => {
    onOpenDetalle?.(fac)
  }

  const handleRegistrar = async (fac: Facturacion, rowKey: string) => {
    if (!onRegistrar || registrando.has(rowKey)) return
    setRegistrando((prev) => new Set([...prev, rowKey]))
    try {
      await onRegistrar(fac)
    } finally {
      setRegistrando((prev) => { const s = new Set(prev); s.delete(rowKey); return s })
    }
  }

  const handleAnular = async (fac: Facturacion, rowKey: string, idDatosFacturado: number) => {
    if (!onAnular || anulando.has(rowKey)) return
    setAnulando((prev) => new Set([...prev, rowKey]))
    try {
      await onAnular(fac, idDatosFacturado)
    } finally {
      setAnulando((prev) => { const s = new Set(prev); s.delete(rowKey); return s })
    }
  }

  if (facturaciones.length === 0) {
    return (
      <Card className="border-dashed">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">No se encontraron registros de facturación</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Intenta con otros criterios de búsqueda</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Facturación</h3>
          <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
          {filtered.length !== facturaciones.length && (
            <span className="text-xs text-muted-foreground">de {facturaciones.length}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
              placeholder="Buscar"
              className="h-8 pl-8 pr-3 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ width: 180 }}
            />
          </div>
          <select
            value={tipoTecFilter}
            onChange={(e) => handleFilterChange(() => setTipoTecFilter(e.target.value))}
            className="h-8 px-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ width: 160 }}
          >
            <option value="all">Todos los tipos</option>
            {Object.entries(TIPOS_TEC_FACTURACION).map(([key, label]) => (
              <option key={key} value={key}>{key} · {label}</option>
            ))}
          </select>
          <select
            value={estadoFilter}
            onChange={(e) => handleFilterChange(() => setEstadoFilter(e.target.value))}
            className="h-8 px-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ width: 120 }}
          >
            <option value="all">Todos</option>
            {Object.entries(ESTADOS_FACTURACION).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Barra de selección masiva */}
      {selectedKeys.size > 0 && onRegistrar && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
          <span className="text-sm text-emerald-700 font-medium">
            {selectedKeys.size} registro{selectedKeys.size !== 1 ? "s" : ""} seleccionado{selectedKeys.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-emerald-700 hover:bg-emerald-100"
              onClick={() => setSelectedKeys(new Set())}
              disabled={registrandoBulk}
            >
              Limpiar selección
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRegistrarSeleccionados}
              disabled={registrandoBulk}
            >
              {registrandoBulk ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Registrando...</>
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-1.5" />Registrar {selectedKeys.size}</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <Card className="overflow-hidden gap-0 py-0">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-2 py-3 w-8 text-center">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    disabled={pendingKeysPage.size === 0}
                    className="h-3.5 w-3.5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                    title="Seleccionar todos los pendientes de esta página"
                  />
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-2 py-3">#</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3">Prescripción</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3">Tecnología</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3">Factura · CUFE</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-2 py-3">Cant.</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-2 py-3">Vlr. Unit.</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-2 py-3">Vlr. Total</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-2 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setDateSort(dateSort === "none" ? "desc" : dateSort === "desc" ? "asc" : "none")
                    }
                    className="flex items-center justify-center gap-1 w-full hover:text-foreground transition-colors cursor-pointer"
                  >
                    Fecha Fact.
                    {dateSort === "none" && <ArrowUpDown className="h-3 w-3" />}
                    {dateSort === "asc" && <ArrowUp className="h-3 w-3" />}
                    {dateSort === "desc" && <ArrowDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-2 py-3">Estado</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-2 py-3">
                  <div className="flex items-center justify-center gap-1">
                    Ver
                    {loadingDatos && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center text-muted-foreground py-10 text-sm">
                    No hay registros que coincidan con los filtros aplicados
                  </td>
                </tr>
              ) : (
                displayed.map((fac, idx) => {
                  return (
                  <tr
                    key={fac.IDFacturacion ?? idx}
                    className={`transition-colors hover:bg-muted/30 ${fac.FecAnulacion ? "opacity-60" : ""}`}
                  >
                    <td className="px-2 py-2.5 text-center w-8">
                      {(() => {
                        const rowKey = `${fac.NoPrescripcion}-${fac.ConTec}-${fac.NoEntrega}`
                        const sinDatos = keysConDatos !== undefined && !keysConDatos.has(rowKey)
                        return sinDatos && onRegistrar ? (
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(rowKey)}
                            onChange={() => toggleSelect(rowKey)}
                            disabled={registrando.has(rowKey) || registrandoBulk}
                            className="h-3.5 w-3.5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          />
                        ) : (
                          <span className="h-3.5 w-3.5 inline-block" />
                        )
                      })()}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs font-mono font-semibold text-muted-foreground whitespace-nowrap">
                      {fac.TipoTec}{fac.ConTec}-{fac.NoEntrega}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs font-medium text-primary">
                      {fac.NoPrescripcion}
                    </td>
                    <td className="px-2 py-2.5">
                      <TipoTecBadge tipo={fac.TipoTec} />
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs">{fac.NoFactura || "—"}</td>
                    <td className="px-2 py-2.5 text-right text-xs">{fac.CantUnMinDis}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-muted-foreground">
                      {formatCurrency(fac.ValorUnitFacturado)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-xs font-semibold text-emerald-700">
                      {formatCurrency(fac.ValorTotFacturado)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs font-mono text-muted-foreground">
                      {formatDate(fac.FecFacturacion)}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <EstadoBadge estado={fac.EstFacturacion} />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {(() => {
                        const rowKey = `${fac.NoPrescripcion}-${fac.ConTec}-${fac.NoEntrega}`
                        const sinDatos = keysConDatos !== undefined && !keysConDatos.has(rowKey)
                        return (
                          <div className="flex items-center justify-center gap-1 w-[60px]">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="group relative h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => openDetalle(fac)}
                              title="Ver detalle"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded border bg-popover px-2 py-1 text-[10px] text-foreground shadow-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                Ver detalle
                              </span>
                            </Button>
                            {sinDatos && onRegistrar ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Registrar datos facturado"
                                disabled={registrando.has(rowKey)}
                                onClick={() => handleRegistrar(fac, rowKey)}
                              >
                                {registrando.has(rowKey)
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Plus className="h-3.5 w-3.5" />
                                }
                              </Button>
                            ) : !sinDatos && onAnular && idsConDatos?.[rowKey] != null ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Anular datos facturado"
                                disabled={anulando.has(rowKey)}
                                onClick={() => handleAnular(fac, rowKey, idsConDatos[rowKey])}
                              >
                                {anulando.has(rowKey)
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <X className="h-3.5 w-3.5" />
                                }
                              </Button>
                            ) : (
                              <span className="h-7 w-7 inline-block" />
                            )}
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Paginación */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Pag:</span>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
          className="h-8 px-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ width: 60 }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => setPage(Math.max(1, page - 1))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs font-medium min-w-[50px] text-center">
          {page} / {pageCount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={page >= pageCount}
          onClick={() => setPage(Math.min(pageCount, page + 1))}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

    </div>
  )
}
