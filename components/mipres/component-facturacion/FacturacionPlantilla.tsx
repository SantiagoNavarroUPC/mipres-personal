"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Download, Upload, Plus, Trash2, FileSpreadsheet, RotateCcw, Copy, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/auth"
import type { FacturacionPlantillaRow, FacturacionPlantillaReservaRow } from "@/lib/facturacion-plantilla-storage"
import {
  PAGE_SIZE,
  GIRO_CONFIG,
  RESERVA_CONFIG,
  genId,
  parseCurrency,
  fmtColNumber,
} from "./facturacion-plantilla-config"
import type { PlantillaTipo, PlantillaRow, ColDef, ImportarPorOpcion } from "./facturacion-plantilla-config"

export type { FacturacionPlantillaRow, FacturacionPlantillaReservaRow }

export function FacturacionPlantilla() {
  const [tipo, setTipo] = useState<PlantillaTipo>("giro")
  const config = tipo === "giro" ? GIRO_CONFIG : RESERVA_CONFIG

  const [rows, setRows] = useState<PlantillaRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const importFacturasFileRef = useRef<HTMLInputElement>(null)
  const [importingFacturas, setImportingFacturas] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  // Cuando el tipo tiene más de una forma de importar (Reserva Técnica: id_suministro o
  // id_facturacion), el botón "Importar Excel" primero pregunta cuál usar antes de abrir
  // el selector de archivo. La opción elegida se guarda acá hasta que el archivo se procesa.
  const [importOptionsOpen, setImportOptionsOpen] = useState(false)
  const [selectedImportOption, setSelectedImportOption] = useState<ImportarPorOpcion | null>(null)

  // Cargar filas de la plantilla activa al montar y cada vez que se cambia de tipo.
  useEffect(() => {
    setRows(config.getRows())
    setSelectedIds(new Set())
    setPage(1)
  }, [tipo])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

  // Si se eliminan filas y la página actual queda fuera de rango, retroceder.
  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount))
  }, [pageCount])

  const displayed = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page])

  // Escuchar cambios de storage disparados desde otras vistas (ej. "Enviar a plantilla")
  // mientras esta plantilla estaba desmontada. Cada tipo escucha solo su propio evento.
  //
  // isLocalUpdateRef evita que el propio componente reaccione a su propio evento: persist()
  // llama a config.saveRows(), que dispara PLANTILLA_STORAGE_EVENT de forma SINCRÓNICA. Sin
  // este flag, ese evento re-entra al listener y dispara otro setRows(config.getRows()) en medio
  // del propio updater que originó el cambio — en React 18 (Strict Mode en dev invoca los
  // updaters de setState dos veces para detectar efectos secundarios) esto duplicaba las filas
  // agregadas (una importación de 14 filas terminaba insertando 28).
  const isLocalUpdateRef = useRef(false)

  useEffect(() => {
    const handler = () => {
      if (isLocalUpdateRef.current) {
        isLocalUpdateRef.current = false
        return
      }
      setRows(config.getRows())
    }
    window.addEventListener(config.storageEvent, handler)
    return () => window.removeEventListener(config.storageEvent, handler)
  }, [tipo])

  const persist = useCallback((next: PlantillaRow[]) => {
    isLocalUpdateRef.current = true
    config.saveRows(next)
  }, [tipo])

  const updateCell = useCallback((rowId: string, field: string, value: string) => {
    setRows((prev) => {
      const next = prev.map((r) => (r._id === rowId ? { ...r, [field]: value } : r))
      persist(next)
      return next
    })
  }, [persist])

  const fillAllFromFirst = useCallback((field: string) => {
    setRows((prev) => {
      const firstValue = prev.find((r) => String(r[field] ?? "").trim() !== "")?.[field] ?? ""
      if (!firstValue) { toast.info("No hay un valor de referencia en esta columna"); return prev }
      const next = prev.map((r) => ({ ...r, [field]: firstValue }))
      persist(next)
      return next
    })
  }, [persist])

  const addRow = () => {
    setRows((prev) => {
      const next = [...prev, config.makeEmptyRow({ [config.correlativoKey]: String(prev.length + 1) })]
      persist(next)
      return next
    })
  }

  const duplicateRow = (row: PlantillaRow) => {
    setRows((prev) => {
      const next = [...prev, config.makeEmptyRow({ ...row, _id: genId(), [config.correlativoKey]: String(prev.length + 1) })]
      persist(next)
      return next
    })
  }

  const deleteRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r._id !== id)
      persist(next)
      return next
    })
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
  }

  const deleteSelected = () => {
    const count = selectedIds.size
    setRows((prev) => {
      const next = prev.filter((r) => !selectedIds.has(r._id))
      persist(next)
      return next
    })
    setSelectedIds(new Set())
    toast.success(`${count} fila(s) eliminadas`)
  }

  const handleClearAll = () => {
    if (!confirm("¿Eliminar todos los registros de la plantilla?")) return
    config.clearRows()
    setRows([])
    setSelectedIds(new Set())
    toast.success("Plantilla limpiada")
  }

  // Si el tipo activo tiene una sola forma de importar, se usa directo (comportamiento
  // de siempre). Si tiene varias (Reserva Técnica), se abre el modal a preguntar cuál.
  const handleImportButtonClick = () => {
    const opciones = config.importarPor
    if (opciones.length === 0) {
      toast.error(`Importar aún no está disponible para ${config.label}`)
      return
    }
    if (opciones.length === 1) {
      setSelectedImportOption(opciones[0])
      importFacturasFileRef.current?.click()
      return
    }
    setImportOptionsOpen(true)
  }

  const handleChooseImportOption = (opcion: ImportarPorOpcion) => {
    setSelectedImportOption(opcion)
    setImportOptionsOpen(false)
    importFacturasFileRef.current?.click()
  }

  const handleImportPorFacturas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Evita procesar dos veces el mismo archivo si el evento onChange llega a dispararse
    // más de una vez (por ejemplo, doble click accidental antes de que se deshabilite el botón).
    // Sin este guard, dos ejecuciones concurrentes calculan el correlativo desde el mismo
    // snapshot de sessionStorage y la numeración termina reiniciándose a la mitad de la grilla.
    if (importingFacturas) {
      e.target.value = ""
      return
    }

    const importarPor = selectedImportOption
    if (!importarPor) {
      toast.error(`Importar aún no está disponible para ${config.label}`)
      e.target.value = ""
      return
    }

    setImportingFacturas(true)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

        if (raw.length < 2) { toast.error("El archivo no contiene datos"); return }

        const colIdx = importarPor.findColumnIndex(raw[0] as unknown[])
        if (colIdx === -1) {
          toast.error(importarPor.columnNotFoundMessage)
          return
        }

        const valores = Array.from(
          new Set(
            raw.slice(1)
              .map((row) => String((row as unknown[])[colIdx] ?? "").trim())
              .filter(Boolean)
          )
        )

        if (valores.length === 0) { toast.error("No se encontraron valores en el archivo"); return }

        // fetchWithAuth adjunta el token, reintenta con refresh si el access token venció,
        // y si de verdad no hay conexión o la sesión ya no es válida, ya se encarga de avisar
        // (toast) y cerrar la sesión — no hay nada más que hacer acá en esos dos casos.
        let response: Response
        try {
          response = await fetchWithAuth(importarPor.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [importarPor.bodyKey]: valores }),
          })
        } catch {
          return
        }

        if (response.status === 401 || response.status === 403) return

        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.success) {
          toast.error(payload?.error || "No se pudo generar el reporte para los valores indicados")
          return
        }

        const dbRows: Record<string, unknown>[] = Array.isArray(payload.data) ? payload.data : []
        if (dbRows.length === 0) {
          toast.info("No se encontraron registros para los valores indicados")
          return
        }

        let mappedCount = 0
        setRows((prev) => {
          // El correlativo se calcula acá, sobre "prev" (el estado real más reciente que React
          // le entrega al updater), en vez de leer sessionStorage por fuera: así se evita que dos
          // ejecuciones cercanas en el tiempo lean el mismo snapshot viejo y reinicien la numeración.
          const baseCount = prev.length
          const mappedRows: PlantillaRow[] = dbRows.map((dbRow, idx) =>
            config.makeEmptyRow({
              ...importarPor.mapRow(dbRow),
              [config.correlativoKey]: String(baseCount + idx + 1),
            })
          )
          mappedCount = mappedRows.length
          const next = [...prev, ...mappedRows]
          persist(next)
          return next
        })
        toast.success(`${mappedCount} registro(s) importados desde ${valores.length} valor(es)`)
      } catch {
        toast.error("Error al leer el archivo Excel")
      } finally {
        setImportingFacturas(false)
        if (importFacturasFileRef.current) importFacturasFileRef.current.value = ""
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // El Excel ya sale estilizado desde el backend (mismo look de los reportes por fechas /
  // por facturas): tanto Giro como Reserva Técnica exponen su propio endpoint para esto.
  const handleExportExcel = async () => {
    if (rows.length === 0) return

    setExportingExcel(true)

    // fetchWithAuth adjunta el token, reintenta con refresh si venció, y si de verdad no
    // hay conexión o la sesión ya no es válida, ya avisa (toast) y cierra la sesión sola.
    let response: Response
    try {
      response = await fetchWithAuth(config.exportExcelEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
    } catch {
      setExportingExcel(false)
      return
    }

    if (response.status === 401 || response.status === 403) {
      setExportingExcel(false)
      return
    }

    try {
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        toast.error(payload?.error || "No se pudo generar el Excel de la plantilla")
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${config.fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al generar el Excel de la plantilla")
    } finally {
      setExportingExcel(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  // "Seleccionar todos" opera sobre la página visible, no sobre las ~miles de filas totales.
  const allSelected = displayed.length > 0 && displayed.every((r) => selectedIds.has(r._id))
  const someSelected = displayed.some((r) => selectedIds.has(r._id)) && !allSelected

  // Columnas "hideIfAllEmpty" (ej. numero_recepcion) solo se muestran si al menos una fila
  // de la grilla tiene valor ahí — evita una columna siempre vacía cuando ninguna fila viene
  // de esa fuente puntual.
  const visibleColumns = useMemo(
    () => config.columns.filter((c) => !c.hideIfAllEmpty || rows.some((r) => (r[c.key] ?? "").trim() !== "")),
    [config, rows]
  )

  const numberColumns = useMemo(() => visibleColumns.filter((c) => c.type === "number"), [visibleColumns])
  const totals = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const col of numberColumns) {
      acc[col.key] = rows.reduce((sum, r) => sum + parseCurrency(r[col.key]), 0)
    }
    return acc
  }, [rows, numberColumns])

  const firstNumericIdx = useMemo(
    () => visibleColumns.findIndex((c) => c.type === "number"),
    [visibleColumns]
  )
  const labelColSpan = (firstNumericIdx === -1 ? visibleColumns.length : firstNumericIdx) + 2 // + checkbox + #

  const inputCls = (col: ColDef) =>
    `h-7 border-0 shadow-none rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-primary/60 text-[11px] px-1.5 ${
      col.align === "right" ? "text-right font-mono" : col.align === "center" ? "text-center" : "text-left"
    }`

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-0 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
          <span className="font-semibold text-sm">Plantilla de Facturación</span>
          <Select value={tipo} onValueChange={(v) => setTipo(v as PlantillaTipo)}>
            <SelectTrigger className="h-8 w-[190px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="giro">Estructura de Giro</SelectItem>
              <SelectItem value="reserva">Reserva Técnica</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs">
            {rows.length} {rows.length !== 1 ? "registros" : "registro"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected} className="h-8 text-xs gap-1">
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar {selectedIds.size}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={addRow} className="h-8 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            Agregar fila
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={handleImportButtonClick}
            disabled={importingFacturas}
            className="h-8 text-xs gap-1"
            title={config.importarPor.length === 1 ? config.importarPor[0].helpText : "Importar Excel"}
          >
            <Upload className="h-3.5 w-3.5" />
            {importingFacturas ? "Generando..." : "Importar Excel"}
          </Button>
          <input
            ref={importFacturasFileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportPorFacturas}
          />
          <Dialog open={importOptionsOpen} onOpenChange={setImportOptionsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>¿Por qué campo desea importar?</DialogTitle>
                <DialogDescription>
                  Elija según qué identificador tenga a mano en el Excel que va a subir.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                {config.importarPor.map((opcion) => (
                  <Button
                    key={opcion.key}
                    variant="outline"
                    className="h-auto flex-col items-start gap-1 py-3 text-left whitespace-normal"
                    onClick={() => handleChooseImportOption(opcion)}
                  >
                    <span className="font-semibold text-sm">{opcion.label}</span>
                    <span className="text-xs text-muted-foreground">{opcion.helpText}</span>
                  </Button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setImportOptionsOpen(false)}>
                  Cancelar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline" size="sm"
            onClick={handleExportExcel}
            disabled={rows.length === 0 || exportingExcel}
            className="h-8 text-xs gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            {exportingExcel ? "Generando..." : "Exportar Excel"}
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={handleClearAll}
            disabled={rows.length === 0}
            className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-auto flex-1 min-h-0">
        <table className="border-collapse text-xs" style={{ minWidth: "max-content", tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/90">
              <th className="border border-border bg-muted/90 px-1 text-center align-middle" style={{ width: 36, minWidth: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected }}
                  onChange={() => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      if (allSelected) {
                        displayed.forEach((r) => next.delete(r._id))
                      } else {
                        displayed.forEach((r) => next.add(r._id))
                      }
                      return next
                    })
                  }}
                  className="accent-primary cursor-pointer"
                />
              </th>
              <th className="border border-border bg-muted/90 px-1 text-center text-[10px] font-semibold text-muted-foreground align-middle" style={{ width: 36, minWidth: 36 }}>
                #
              </th>
              {visibleColumns.map((col) => {
                const isFillable = config.fillableCols.has(col.key)
                return (
                  <th
                    key={col.key}
                    title={isFillable ? `Click: aplicar primer valor a toda la columna` : col.headerLines.join(" ")}
                    onClick={isFillable ? () => fillAllFromFirst(col.key) : undefined}
                    className={`border border-border bg-primary/10 px-1.5 py-1 text-center text-[10px] font-bold text-primary align-middle select-none ${isFillable ? "cursor-pointer hover:bg-primary/20 active:bg-primary/30" : ""}`}
                    style={{ width: col.width, minWidth: col.width }}
                  >
                    <div className="flex flex-col items-center leading-tight gap-0">
                      {col.headerLines.map((line, i) => (
                        <span key={i} className="whitespace-nowrap">{line}</span>
                      ))}
                      {isFillable && <span className="text-primary/50 text-[9px] mt-0.5">▼ llenar</span>}
                    </div>
                  </th>
                )
              })}
              <th className="border border-border bg-muted/90 px-1 text-center text-[10px] font-semibold text-muted-foreground align-middle" style={{ width: 64, minWidth: 64 }}>
                Acción
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 3} className="border border-border py-14 text-center text-muted-foreground text-xs">
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-10 w-10 opacity-20" />
                    <span>
                      Sin registros. Use <strong>Agregar fila</strong>
                      {tipo === "giro" && (
                        <> o el botón <strong>Enviar a plantilla</strong> en el detalle de facturación</>
                      )}
                      .
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              displayed.map((row, idx) => {
                const isSelected = selectedIds.has(row._id)
                return (
                  <tr
                    key={row._id}
                    className={`transition-colors ${isSelected ? "bg-primary/5" : idx % 2 === 0 ? "bg-background" : "bg-muted/20"} hover:bg-primary/5`}
                  >
                    <td className="border border-border px-1 text-center align-middle" style={{ width: 36 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(row._id)} className="accent-primary cursor-pointer" />
                    </td>
                    <td className="border border-border px-1 text-[10px] text-center text-muted-foreground font-mono align-middle" style={{ width: 36 }}>
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="border border-border p-0 align-middle" style={{ width: col.width, maxWidth: col.width }}>
                        <Input
                          type={col.type === "date" ? "date" : "text"}
                          value={row[col.key] ?? ""}
                          onChange={(e) => updateCell(row._id, col.key, e.target.value)}
                          className={inputCls(col)}
                          style={{ width: "100%" }}
                          title={col.type === "number" && row[col.key] ? fmtColNumber(col, parseCurrency(row[col.key])) : undefined}
                        />
                      </td>
                    ))}
                    <td className="border border-border px-0.5 text-center align-middle" style={{ width: 64 }}>
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => duplicateRow(row)} title="Duplicar" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Copy className="h-3 w-3" />
                        </button>
                        <button onClick={() => deleteRow(row._id)} title="Eliminar" className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>

          {rows.length > 0 && (
            <tfoot className="sticky bottom-0">
              <tr className="bg-muted/80 border-t-2 border-border">
                <td colSpan={labelColSpan} className="border border-border px-2 py-1 text-right text-[11px] text-muted-foreground font-medium">
                  Totales ({rows.length} registros):
                </td>
                {visibleColumns.slice(firstNumericIdx === -1 ? visibleColumns.length : firstNumericIdx).map((col) => (
                  col.type === "number" ? (
                    <td key={col.key} className="border border-border px-1.5 py-1 text-right text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {fmtColNumber(col, totals[col.key] ?? 0)}
                    </td>
                  ) : (
                    <td key={col.key} className="border border-border" />
                  )
                ))}
                <td className="border border-border" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} de {rows.length} registros
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium min-w-[70px] text-center">
              {page} / {pageCount}
            </span>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground shrink-0">
        Los registros se guardan en la sesión activa y se eliminan al cerrar el navegador.
        Use <strong>Exportar Excel</strong> para conservar los datos.
      </p>
    </div>
  )
}
