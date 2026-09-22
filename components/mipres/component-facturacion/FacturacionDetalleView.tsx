"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Receipt, User, FileText,
  Loader2, ArrowLeft, Pencil,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import type { Facturacion, DatosFacturado } from "@/models/mipres-sispro/facturacion/facturacion"
import {
  ESTADOS_FACTURACION,
  TIPOS_TEC_FACTURACION,
  ESTADOS_DATOS_FACTURADO,
  ESTADOS_ENTREGA,
} from "@/models/constants"
import { secureStorageGetItem } from "@/lib/secure-storage"
import { toast } from "sonner"
import { addPlantillaRow } from "@/lib/facturacion-plantilla-storage"

interface FacturacionDetalleModalProps {
  facturacion: Facturacion | null
  open: boolean
  onClose: () => void
  onFormVisibilityChange?: (visible: boolean) => void
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "N/A"
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xs font-medium mt-0.5 break-all">{value ?? "N/A"}</p>
    </div>
  )
}

interface SuministroInfo {
  ID: number
  IDSuministro: string
  EstSuministro?: number
  ValorEntregado?: string
  UltEntrega?: number
  EntregaCompleta?: number
  NoLote?: string
  CodTecEntregado?: string
  FecAnulacion?: string
}

export function FacturacionDetalleModal({ facturacion, open, onClose, onFormVisibilityChange }: FacturacionDetalleModalProps) {
  const [datosFacturado, setDatosFacturado] = useState<DatosFacturado | null>(null)
  const [loadingDatos, setLoadingDatos] = useState(false)
  const [suministroInfo, setSuministroInfo] = useState<SuministroInfo | null>(null)
  const [seccionSispro, setSeccionSispro] = useState(0)

  useEffect(() => {
    onFormVisibilityChange?.(open)
  }, [open, onFormVisibilityChange])

  useEffect(() => {
    if (!open || !facturacion) {
      setDatosFacturado(null)
      setSuministroInfo(null)
      return
    }

    const saved = typeof window !== "undefined" ? secureStorageGetItem("mipres_credentials") : null
    let nit: string | null = null
    let tokenAcceso: string | null = null
    let tokenAccesoSubsidiado: string | null = null
    let tokenAccesoContributivo: string | null = null

    if (saved) {
      try {
        const creds = JSON.parse(saved)
        nit = creds.nit || null
        tokenAcceso = creds.tokenAcceso || null
        tokenAccesoSubsidiado = creds.tokenAccesoSubsidiado || null
        tokenAccesoContributivo = creds.tokenAccesoContributivo || null
      } catch { /* ignore */ }
    }

    if (!nit || !facturacion.NoPrescripcion) {
      setDatosFacturado(null)
      setSuministroInfo(null)
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      nit,
      noPrescripcion: facturacion.NoPrescripcion,
      conTec: String(facturacion.ConTec),
      noEntrega: String(facturacion.NoEntrega),
      tipoTec: String(facturacion.TipoTec || ""),
    })
    if (tokenAcceso) params.set("tokenAcceso", tokenAcceso)
    if (tokenAccesoSubsidiado) params.set("tokenAccesoSubsidiado", tokenAccesoSubsidiado)
    if (tokenAccesoContributivo) params.set("tokenAccesoContributivo", tokenAccesoContributivo)

    setLoadingDatos(true)
    fetch(`/api/mipres/facturacion/detalle?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success) {
          setDatosFacturado(res.datosFacturado ?? null)
          setSuministroInfo(res.suministroInfo ?? null)
        } else {
          setDatosFacturado(null)
          setSuministroInfo(null)
        }
      })
      .catch(() => { setDatosFacturado(null); setSuministroInfo(null) })
      .finally(() => setLoadingDatos(false))

    return () => controller.abort()
  }, [open, facturacion])

  if (!facturacion || !open) return null

  const handleEnviarPlantilla = () => {
    const invoiceNum = facturacion.NoFactura ?? ""
    const prefijo = invoiceNum.match(/^([A-Za-z]+)/)?.[1] ?? ""
    const soloNumero = invoiceNum.match(/(\d+)/)?.[1] ?? invoiceNum

    const rawFecha = facturacion.FecFacturacion ?? ""
    const fechaNorm = rawFecha.includes(" ") ? rawFecha.replace(" ", "T") : rawFecha
    const fechaDate = new Date(fechaNorm)
    const fechaISO = !isNaN(fechaDate.getTime()) ? fechaDate.toISOString().slice(0, 10) : ""

    addPlantillaRow({
      tipo_registro: "3",
      tipo_doc_ips: "NI",
      nit_ips: "",
      nombre_ips: "",
      numero_prescripcion: facturacion.NoPrescripcion,
      id_suministro: suministroInfo?.IDSuministro ?? "",
      est_suministro: String(suministroInfo?.EstSuministro ?? ""),
      id_datos_facturado: String(datosFacturado?.IDDatosFacturado ?? ""),
      est_datos_facturado: String(datosFacturado?.EstDatosFacturado ?? ""),
      cufe: facturacion.NoFactura ?? "",
      fecha_emision_factura: fechaISO,
      numero: invoiceNum,
      prefijo_factura: prefijo,
      numero_factura: soloNumero,
      valor_total_factura: String(facturacion.ValorTotFacturado ?? ""),
      valor_pagado: "",
    })
    toast.success("Registro enviado a la plantilla de facturación", {
      description: `Prescripción: ${facturacion.NoPrescripcion}`,
    })
  }

  const estadoLabel = ESTADOS_FACTURACION[facturacion.EstFacturacion] ?? `Estado ${facturacion.EstFacturacion}`
  const tipoTecLabel = TIPOS_TEC_FACTURACION[facturacion.TipoTec] ?? facturacion.TipoTec

  return (
    <div className="space-y-4">

      {/* Header con botón volver */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Receipt className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-none">Detalle de Facturación</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Prescripción <span className="font-semibold text-primary font-mono">{facturacion.NoPrescripcion}</span>
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs text-muted-foreground">
              Factura <span className="font-semibold font-mono">{facturacion.NoFactura || "—"}</span>
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] h-4 px-1.5 ${
                facturacion.EstFacturacion === 2
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
              }`}
            >
              {estadoLabel}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEnviarPlantilla}
          disabled={loadingDatos}
          title="Enviar a plantilla de facturación"
          className="gap-1.5 shrink-0"
        >
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Enviar a plantilla</span>
        </Button>
      </div>

      {/* Tecnología + Paciente */}
      <div className="rounded-lg border border-primary/20 bg-card p-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-primary dark:text-white">Tecnología en salud</h4>
          </div>
          <div className="flex items-center gap-2 border-l border-primary/20 pl-4">
            <User className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-primary dark:text-white">Paciente</h4>
          </div>
        </div>
        <div className="rounded-md border border-primary/10 bg-background px-3 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Campo label="Tipo" value={
            <Badge variant="outline" className="text-xs font-mono">
              {facturacion.TipoTec} · {tipoTecLabel}
            </Badge>
          } />
          <Campo label="Consecutivo tecnología" value={<span className="font-mono">{facturacion.ConTec}</span>} />
          <Campo label="N° Entrega" value={<span className="font-mono">{facturacion.NoEntrega}</span>} />
          <Campo label="N° Sub-entrega" value={<span className="font-mono">{facturacion.NoSubEntrega ?? "—"}</span>} />
          <Campo label="Código tecnología entregada" value={<span className="font-mono">{facturacion.CodSerTecAEntregado || "—"}</span>} />
          <Campo label="Tipo de identificación" value={facturacion.TipoIDPaciente} />
          <Campo label="N° identificación paciente" value={<span className="font-mono">{facturacion.NoIDPaciente}</span>} />
          <Campo label="Código EPS" value={<span className="font-mono">{facturacion.CodEPS || "—"}</span>} />
        </div>
      </div>

      {/* Información de la factura en SISPRO-MIPRES */}
      <div className="grid grid-cols-1 gap-4 items-stretch">
        <div className="rounded-lg border border-primary/20 bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-primary dark:text-white">Información de la factura en SISPRO-MIPRES</h4>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary dark:text-white mb-2">Factura</p>
            <div className="rounded-md border border-primary/10 bg-background px-3 py-2.5 grid grid-cols-2 gap-3">
              <Campo label="Número de factura" value={<span className="font-mono">{facturacion.NoFactura || "—"}</span>} />
              <Campo label="Fecha facturación" value={formatDate(facturacion.FecFacturacion)} />
              <Campo label="Fecha anulación" value={facturacion.FecAnulacion ? formatDate(facturacion.FecAnulacion) : "—"} />
              <Campo label="Códigos facturación" value={
                <span className="font-mono text-xs break-all">{facturacion.CodigosFacturacion || "—"}</span>
              } />
            </div>
          </div>

          {(() => {
            type CampoItem = { label: string; value: React.ReactNode }
            const ordenar = (items: CampoItem[]) => [...items].sort((a, b) => a.label.localeCompare(b.label, "es"))

            const seccionesSispro = [
              {
                titulo: "Suministro - MIPRES",
                contenido: loadingDatos ? (
                  <p className="text-xs text-muted-foreground">Cargando información de suministro...</p>
                ) : suministroInfo ? (() => {
                  const campos: CampoItem[] = [
                    { label: "ID Auxiliar Suministro", value: <span className="font-mono">{suministroInfo.ID}</span> },
                    { label: "ID Suministro", value: <span className="font-mono">{suministroInfo.IDSuministro}</span> },
                    {
                      label: "Estado suministro",
                      value: suministroInfo.EstSuministro != null
                        ? `${suministroInfo.EstSuministro} - ${ESTADOS_ENTREGA[suministroInfo.EstSuministro as keyof typeof ESTADOS_ENTREGA] ?? suministroInfo.EstSuministro}`
                        : "—",
                    },
                    {
                      label: "Última entrega",
                      value: suministroInfo.UltEntrega != null ? (suministroInfo.UltEntrega === 1 ? "Sí" : "No") : "—",
                    },
                    {
                      label: "Entrega completa",
                      value: suministroInfo.EntregaCompleta != null ? (suministroInfo.EntregaCompleta === 1 ? "Sí" : "No") : "—",
                    },
                    {
                      label: "Valor entregado",
                      value: suministroInfo.ValorEntregado ? formatCurrency(Number(suministroInfo.ValorEntregado)) : "—",
                    },
                    { label: "N° Lote", value: <span className="font-mono">{suministroInfo.NoLote || "—"}</span> },
                    { label: "Código tecnología entregada", value: <span className="font-mono">{suministroInfo.CodTecEntregado || "—"}</span> },
                  ]
                  if (suministroInfo.FecAnulacion) {
                    campos.push({ label: "Fecha anulación", value: formatDate(suministroInfo.FecAnulacion) })
                  }
                  return (
                    <div className="rounded-md border border-primary/10 bg-background px-3 py-2.5 grid grid-cols-2 gap-3">
                      {ordenar(campos).map((c) => <Campo key={c.label} label={c.label} value={c.value} />)}
                    </div>
                  )
                })() : (
                  <p className="text-xs text-muted-foreground">Sin información de suministro</p>
                ),
              },
              {
                titulo: "Facturación - MIPRES",
                contenido: (() => {
                  const campos: CampoItem[] = [
                    { label: "Cantidad unidades dispensadas", value: facturacion.CantUnMinDis },
                    { label: "Valor unitario facturado", value: formatCurrency(facturacion.ValorUnitFacturado) },
                    {
                      label: "Valor total facturado",
                      value: <span className="font-semibold text-primary">{formatCurrency(facturacion.ValorTotFacturado)}</span>,
                    },
                    { label: "Cuota moderadora", value: formatCurrency(facturacion.CuotaModer) },
                    { label: "Copago", value: formatCurrency(facturacion.Copago) },
                    { label: "ID Facturación MIPRES", value: <span className="font-mono">{facturacion.IDFacturacion}</span> },
                    { label: "ID Auxiliar Facturación", value: <span className="font-mono">{facturacion.ID}</span> },
                  ]

                  if (!loadingDatos) {
                    campos.push(
                      {
                        label: "ID Datos Facturado",
                        value: datosFacturado ? (
                          <span className="font-mono">{datosFacturado.IDDatosFacturado}</span>
                        ) : "—",
                      },
                      {
                        label: "Estado datos facturado",
                        value: datosFacturado
                          ? `${datosFacturado.EstDatosFacturado} - ${ESTADOS_DATOS_FACTURADO[datosFacturado.EstDatosFacturado] ?? datosFacturado.EstDatosFacturado}`
                          : "—",
                      }
                    )
                    if (datosFacturado?.FecDatosFacturado != null) campos.push({ label: "Fecha datos facturado", value: formatDate(datosFacturado.FecDatosFacturado) })
                    if (datosFacturado?.FecAnulacion != null) campos.push({ label: "Fecha anulación", value: formatDate(datosFacturado.FecAnulacion) })
                    if (datosFacturado?.CodCompAdm != null) campos.push({ label: "Código comparador", value: <span className="font-mono">{datosFacturado.CodCompAdm}</span> })
                    if (datosFacturado?.CodHom != null) campos.push({ label: "Código homólogo", value: <span className="font-mono">{datosFacturado.CodHom}</span> })
                    if (datosFacturado?.UniCompAdm != null) campos.push({ label: "Unidades comparador adm.", value: datosFacturado.UniCompAdm })
                    if (datosFacturado?.UniDispHom != null) campos.push({ label: "Unidades dispensadas homólogo", value: datosFacturado.UniDispHom })
                    if (datosFacturado?.ValUnMiCon != null) campos.push({ label: "Valor unit. comp. adm.", value: formatCurrency(datosFacturado.ValUnMiCon) })
                    if (datosFacturado?.CantTotEnt != null) campos.push({ label: "Cantidad total entregada", value: datosFacturado.CantTotEnt })
                    if (datosFacturado?.ValTotCompAdm != null) campos.push({ label: "Valor total comparador adm.", value: formatCurrency(datosFacturado.ValTotCompAdm) })
                    if (datosFacturado?.ValTotHom != null) campos.push({ label: "Valor total homólogo", value: formatCurrency(datosFacturado.ValTotHom) })
                  }

                  return (
                    <div className="rounded-md border border-primary/10 bg-background px-3 py-2.5 grid grid-cols-3 grid-flow-col grid-rows-4 gap-3">
                      {ordenar(campos).map((c) => <Campo key={c.label} label={c.label} value={c.value} />)}
                      {loadingDatos && <p className="text-xs text-muted-foreground">Cargando datos facturado...</p>}
                    </div>
                  )
                })(),
              },
            ]
            const indiceActivo = Math.min(seccionSispro, seccionesSispro.length - 1)
            const seccionActiva = seccionesSispro[indiceActivo]
            return (
              <div className="mt-5 pt-4 border-t border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary dark:text-white">{seccionActiva.titulo}</p>
                    {loadingDatos && (
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={indiceActivo === 0}
                      onClick={() => setSeccionSispro((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-primary" />
                    </button>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {indiceActivo + 1} / {seccionesSispro.length}
                    </span>
                    <button
                      type="button"
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={indiceActivo === seccionesSispro.length - 1}
                      onClick={() => setSeccionSispro((i) => Math.min(seccionesSispro.length - 1, i + 1))}
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary" />
                    </button>
                  </div>
                </div>
                {seccionActiva.contenido}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
