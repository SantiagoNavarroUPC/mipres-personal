"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Activity, BarChart3, ClipboardCheck, Eye, EyeOff, FileBarChart2, Package, Route, Table2 } from "lucide-react"

export interface DashboardReporteItem {
  tipo: string
  total_prescripciones: number
  total_direccionadas: number
  total_no_direccionadas: number
  total_sin_proceso: number
  total_reportadas: number
  total_reportadas_incompletas: number
  total_suministradas: number
  total_suministradas_incompletas: number
}

interface ReportesDashboardProps {
  fechaInicio: string
  fechaFin: string
  data: DashboardReporteItem[]
  loading: boolean
  error?: string
}

const chartConfig = {
  total_prescripciones: {
    label: "Prescripciones",
    color: "#0ea5e9",
  },
  total_direccionadas: {
    label: "Direccionadas",
    color: "#22c55e",
  },
  total_no_direccionadas: {
    label: "No direccionamiento",
    color: "#ef4444",
  },
  total_suministradas: {
    label: "Suministradas",
    color: "#f59e0b",
  },
} satisfies ChartConfig

function sumBy(data: DashboardReporteItem[], key: keyof DashboardReporteItem): number {
  return data.reduce((acc, item) => acc + Number(item[key] || 0), 0)
}

export function ReportesDashboard({ fechaInicio, fechaFin, data, loading, error }: ReportesDashboardProps) {
  const [showSummaryCard, setShowSummaryCard] = useState(true)
  const [showTableView, setShowTableView] = useState(false)
  const totalPrescripciones = sumBy(data, "total_prescripciones")
  const totalDireccionadas = sumBy(data, "total_direccionadas")
  const totalNoDireccionadas = sumBy(data, "total_no_direccionadas")
  const totalSinProceso = sumBy(data, "total_sin_proceso")
  const totalReportadasIncompletas = sumBy(data, "total_reportadas_incompletas")
  const totalSuministradas = sumBy(data, "total_suministradas")
  const totalSuministradasIncompletas = sumBy(data, "total_suministradas_incompletas")
  const totalReportadas = sumBy(data, "total_reportadas")

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <div className="relative">
          <button
            type="button"
            aria-label={showSummaryCard ? "Ocultar resumen" : "Mostrar resumen"}
            onClick={() => setShowSummaryCard((value) => !value)}
            className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            {showSummaryCard ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>

          <CardHeader className="pr-12">
            <CardTitle className="flex items-center gap-2">
              <FileBarChart2 className="h-5 w-5" />
              Dashboard de Reportes
            </CardTitle>
            <CardDescription>
              Resumen entre {fechaInicio} y {fechaFin}
            </CardDescription>
          </CardHeader>

          {showSummaryCard && (
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : data.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay datos para el rango seleccionado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                  <div className="rounded-lg border p-3 bg-sky-50/60">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3.5 w-3.5" />Prescripciones</p>
                    <p className="text-2xl font-semibold">{totalPrescripciones.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-emerald-50/60">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Route className="h-3.5 w-3.5" />Direccionadas</p>
                    <p className="text-2xl font-semibold">{totalDireccionadas.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-rose-50/70">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Route className="h-3.5 w-3.5" />No direccionamiento</p>
                    <p className="text-2xl font-semibold">{totalNoDireccionadas.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-violet-50/60">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardCheck className="h-3.5 w-3.5" />Con reporte de entrega</p>
                    <p className="text-2xl font-semibold">{totalReportadas.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-amber-50/70">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3.5 w-3.5" />Con suministro</p>
                    <p className="text-2xl font-semibold">{totalSuministradas.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </div>
      </Card>

      <Card>
        <div className="relative">
          <button
            type="button"
            aria-label={showTableView ? "Mostrar gráfica" : "Mostrar tabla"}
            onClick={() => setShowTableView((value) => !value)}
            className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            {showTableView ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
          </button>

          <CardHeader className="pr-12">
            <CardTitle>{showTableView ? "Detalle tabular por tipo" : "Detalle gráfica por tipo"}</CardTitle>
            <CardDescription>
              {showTableView ? "Vista consolidada para lectura rápida y control operativo." : "Prescripciones, direccionadas y suministradas por tipo"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando {showTableView ? "tabla" : "grafica"}...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos para {showTableView ? "la tabla" : "graficar"}.</p>
            ) : showTableView ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/60">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900"></p>
                    <p className="text-xs text-slate-500"></p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700">Prescripciones</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">Direccionadas</span>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 font-medium text-rose-700">No direccionadas</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">Sin proceso</span>
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-700">Reportes de entrega</span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">Suministros</span>

                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table className="min-w-[1120px]">
                    <TableHeader className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                      <TableRow className="border-slate-200/80 hover:bg-slate-100/95">
                        <TableHead className="w-[160px] font-semibold text-slate-700">Tipo</TableHead>
                        <TableHead className="text-right font-semibold text-sky-700">Prescripciones</TableHead>
                        <TableHead className="text-right font-semibold text-emerald-700">Direccionadas</TableHead>
                        <TableHead className="text-right font-semibold text-rose-700">No direccionadas</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600">Sin proceso</TableHead>
                        <TableHead className="text-right font-semibold text-violet-700">Reporte de entrega completos</TableHead>
                        <TableHead className="text-right font-semibold text-violet-700">Reporte de entrega en curso</TableHead>
                        <TableHead className="text-right font-semibold text-amber-700">Suministros completos</TableHead>
                        <TableHead className="text-right font-semibold text-amber-700">Suministros en curso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((item, index) => {
                        const isEven = index % 2 === 0
                        return (
                          <TableRow
                            key={item.tipo}
                            className={isEven ? "bg-white" : "bg-slate-50/70"}
                          >
                            <TableCell className="font-medium text-slate-900">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                  {item.tipo.slice(0, 2).toUpperCase()}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold leading-none">{item.tipo}</p>
                                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500"></p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-sky-700">{Number(item.total_prescripciones || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-emerald-700">{Number(item.total_direccionadas || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-rose-700">{Number(item.total_no_direccionadas || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums text-slate-700">{Number(item.total_sin_proceso || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums text-violet-700">{Number(item.total_reportadas || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums text-violet-700">{Number(item.total_reportadas_incompletas || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums text-amber-700">{Number(item.total_suministradas || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums text-amber-700">{Number(item.total_suministradas_incompletas || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <BarChart data={data} margin={{ left: 12, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="tipo"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total_prescripciones" fill="var(--color-total_prescripciones)" radius={4} />
                  <Bar dataKey="total_direccionadas" fill="var(--color-total_direccionadas)" radius={4} />
                  <Bar dataKey="total_no_direccionadas" fill="var(--color-total_no_direccionadas)" radius={4} />
                  <Bar dataKey="total_suministradas" fill="var(--color-total_suministradas)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  )
}
