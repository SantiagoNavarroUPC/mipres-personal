"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { reportErrorNotification } from "@/lib/error-notifications"
import type { MipresCredentials } from "@/models/credentials.model"
import { getArray } from "@/components/mipres/component-prescripcion/utils"
import { getFreshAuthHeader } from "@/lib/auth"
import { DireccionamientoRow } from "../types"

export function useDireccionamientoForm(
  prescripcion: any,
  open: boolean,
  credentials: MipresCredentials,
  onSuccess?: () => void,
  tipoDocumento: "prescripcion" | "tutela" = "prescripcion"
) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [rows, setRows] = useState<DireccionamientoRow[]>([])
  const [page, setPage] = useState(1)
  const [registeredIds, setRegisteredIds] = useState<Array<{ ID: string; IDDireccionamiento: string }>>([])
  const submitInFlightRef = useRef(false)
  const recentlySubmittedKeysRef = useRef<Set<string>>(new Set())

  const formatApiResponse = (data: unknown): string => {
    if (data === null || data === undefined) return "Respuesta vacia"
    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
      return String(data)
    }
    if (typeof data === "object") {
      const typed = data as { ID?: string; IDDireccionamiento?: string; Mensaje?: string; message?: string }
      if (typed.ID || typed.IDDireccionamiento) {
        return `ID: ${typed.ID ?? "-"} | IDDireccionamiento: ${typed.IDDireccionamiento ?? "-"}`
      }
      if (typed.Mensaje || typed.message) {
        return String(typed.Mensaje ?? typed.message)
      }
      try {
        return JSON.stringify(data)
      } catch {
        return "Respuesta no disponible"
      }
    }
    return "Respuesta no disponible"
  }

  const formatDireccionamientoSuccess = (data: unknown): string => {
    if (!data || typeof data !== "object") {
      return "Direccionamiento correcto"
    }

    const typed = data as {
      id_auxiliar?: string | number | null
      id_direccionamiento?: string | number | null
    }

    const idAuxiliar = typed.id_auxiliar !== undefined && typed.id_auxiliar !== null
      ? String(typed.id_auxiliar).trim()
      : ""
    const idDireccionamiento = typed.id_direccionamiento !== undefined && typed.id_direccionamiento !== null
      ? String(typed.id_direccionamiento).trim()
      : ""

    if (idAuxiliar || idDireccionamiento) {
      return [
        "Direccionamiento correcto",
        idAuxiliar ? `id_auxiliar: ${idAuxiliar}` : null,
        idDireccionamiento ? `id_direccionamiento: ${idDireccionamiento}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    }

    return "Direccionamiento correcto"
  }

  const getFriendlyHttpError = (status?: number): string => {
    if (status === 403) {
      return "Sesion caducada, ingrese otra vez e intente de nuevo"
    }

    if (status === 404 || (typeof status === "number" && status >= 500)) {
      return "API-MIPRES esta caida, contactar al admin"
    }

    return "No se pudo registrar el direccionamiento"
  }

  const summarizeErrorResponse = (error: unknown, status?: number): string => {
    if (status === 403 || status === 404 || (typeof status === "number" && status >= 500)) {
      return getFriendlyHttpError(status)
    }

    if (typeof error === "string") {
      const normalized = error.trim()
      if (!normalized) return "No se pudo registrar el direccionamiento"
      return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized
    }

    if (error instanceof Error) {
      const message = error.message.trim()
      return message.length > 180 ? `${message.slice(0, 177)}...` : message
    }

    return "No se pudo registrar el direccionamiento"
  }

  const buildToastDescription = (items: string[]): string | undefined => {
    const normalized = items.map((item) => item.trim()).filter(Boolean)
    if (normalized.length === 0) return undefined
    const visible = normalized.slice(0, 3)
    const moreCount = normalized.length - visible.length
    const base = visible.join("\n")
    return moreCount > 0 ? `${base}\n(y ${moreCount} respuesta(s) mas)` : base
  }

  const normalizeDireccionamientos = (data: any): any[] => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray(data.root)) return data.root
    if (Array.isArray(data.direccionamientos)) return data.direccionamientos
    return [data]
  }

  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    const parsed = Number(value)
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return null
    return parsed
  }

  const getTotalCantidad = (item: any): number | null => {
    return toNumber(item.CantTotal) ?? toNumber(item.CantTotalF) ?? null
  }

  const getPerEntregaCantidad = (item: any): number | null => {
    return (
      toNumber(item.Cant) ??
      toNumber(item.CantForm) ??
      toNumber(item.CanForm) ??
      toNumber(item.CanTrat) ??
      toNumber(item.CantDM) ??
      null
    )
  }

  const splitCantidadPorEntregas = (total: number | null, count: number): number[] => {
    if (total === null || total === undefined || !Number.isFinite(total) || count <= 0) return []
    const normalizedTotal = Number(total)

    if (Number.isInteger(normalizedTotal)) {
      const base = Math.floor(normalizedTotal / count)
      let remainder = normalizedTotal - base * count
      return Array.from({ length: count }, () => {
        const value = base + (remainder > 0 ? 1 : 0)
        if (remainder > 0) remainder -= 1
        return value
      })
    }

    // Para decimales, repartir en dos decimales y ajustar el ultimo para conservar el total exacto.
    const amounts: number[] = []
    let remaining = Number(normalizedTotal.toFixed(2))

    for (let i = 0; i < count; i += 1) {
      const slotsLeft = count - i
      if (i === count - 1) {
        amounts.push(Number(remaining.toFixed(2)))
      } else {
        const portion = Number((remaining / slotsLeft).toFixed(2))
        amounts.push(portion)
        remaining = Number((remaining - portion).toFixed(2))
      }
    }

    return amounts
  }

  const getIntervalValue = (item: any): number | null => toNumber(item.Cant) ?? null
  const getIntervalUnit = (item: any): number | null => toNumber(item.CodPerDurTrat) ?? null

  // Para medicamentos: CanTrat es la duración total en la unidad DurTrat
  // DurTrat: 1=Min, 2=Hora, 3=Día, 4=Semana, 5=Mes, 6=Año
  // Las entregas son mensuales (cada 30 días)
  const getMedicamentoIntervalValue = (item: any): number | null => toNumber(item.CanTrat) ?? null
  const getMedicamentoIntervalUnit = (item: any): number | null => toNumber(item.DurTrat) ?? null
  const getMedicamentoDeliveryCount = (item: any): number => {
    const duracionTotal = toNumber(item.CanTrat) // duración en su unidad
    const durationUnit = toNumber(item.DurTrat) // unidad: 1-6
    
    if (!duracionTotal || duracionTotal <= 0) return 1
    
    // Convertir duración a días
    let duracionDias = duracionTotal
    switch (durationUnit) {
      case 1: // Minutos
        duracionDias = duracionTotal / (24 * 60)
        break
      case 2: // Horas
        duracionDias = duracionTotal / 24
        break
      case 3: // Días
        duracionDias = duracionTotal
        break
      case 4: // Semanas
        duracionDias = duracionTotal * 7
        break
      case 5: // Meses
        duracionDias = duracionTotal * 30
        break
      case 6: // Años
        duracionDias = duracionTotal * 365
        break
      default:
        duracionDias = duracionTotal
    }
    
    // Las entregas son mensuales (cada 30 días)
    const periodicidadDias = 30
    const deliveries = Math.max(1, Math.ceil(duracionDias / periodicidadDias))
    
    return deliveries
  }

  // Para nutricionales: CanTrat es la duración total en la unidad DurTrat
  const getNutricionalIntervalValue = (item: any): number | null => toNumber(item.CanTrat) ?? null
  const getNutricionalIntervalUnit = (item: any): number | null => toNumber(item.DurTrat) ?? null
  const getNutricionalDeliveryCount = (item: any): number => {
    const duracionTotal = toNumber(item.CanTrat)
    const durationUnit = toNumber(item.DurTrat)
    
    if (!duracionTotal || duracionTotal <= 0) return 1
    
    // Convertir duración a días
    let duracionDias = duracionTotal
    switch (durationUnit) {
      case 1: // Minutos
        duracionDias = duracionTotal / (24 * 60)
        break
      case 2: // Horas
        duracionDias = duracionTotal / 24
        break
      case 3: // Días
        duracionDias = duracionTotal
        break
      case 4: // Semanas
        duracionDias = duracionTotal * 7
        break
      case 5: // Meses
        duracionDias = duracionTotal * 30
        break
      case 6: // Años
        duracionDias = duracionTotal * 365
        break
      default:
        duracionDias = duracionTotal
    }
    
    // Las entregas son mensuales (cada 30 días)
    const periodicidadDias = 30
    const deliveries = Math.max(1, Math.ceil(duracionDias / periodicidadDias))
    
    return deliveries
  }

  // Para servicios complementarios: Cant es la duración total en la unidad CodPerDurTrat
  const getServicioIntervalValue = (item: any): number | null => toNumber(item.Cant) ?? null
  const getServicioIntervalUnit = (item: any): number | null => toNumber(item.CodPerDurTrat) ?? null
  const getServicioDeliveryCount = (item: any): number => {
    const duracionTotal = toNumber(item.Cant) // duración en su unidad
    const durationUnit = toNumber(item.CodPerDurTrat) // unidad: 1-6
    
    if (!duracionTotal || duracionTotal <= 0) return 1
    
    // Convertir duración a días
    let duracionDias = duracionTotal
    switch (durationUnit) {
      case 1: // Minutos
        duracionDias = duracionTotal / (24 * 60)
        break
      case 2: // Horas
        duracionDias = duracionTotal / 24
        break
      case 3: // Días
        duracionDias = duracionTotal
        break
      case 4: // Semanas
        duracionDias = duracionTotal * 7
        break
      case 5: // Meses
        duracionDias = duracionTotal * 30
        break
      case 6: // Años
        duracionDias = duracionTotal * 365
        break
      default:
        duracionDias = duracionTotal
    }
    
    // Las entregas son mensuales (cada 30 días)
    const periodicidadDias = 30
    const deliveries = Math.max(1, Math.ceil(duracionDias / periodicidadDias))
    
    return deliveries
  }

  const getRegimenNormalized = (): string => {
    const rawRegimen =
      prescripcion?.tipoRegimen ??
      prescripcion?.RegimenPrescripcion ??
      prescripcion?.Regimen ??
      prescripcion?.regimen ??
      ""

    return String(rawRegimen).trim().toLowerCase()
  }

  const resolveAccessToken = (regimenNormalized: string): string => {
    const tokenCandidates = [
      credentials.tokenAcceso,
      credentials.tokenAccesoSubsidiado,
      credentials.tokenAccesoContributivo,
    ].filter((token, index, arr) => !!token && arr.indexOf(token) === index) as string[]

    if (regimenNormalized === "subsidiado") {
      return credentials.tokenAccesoSubsidiado || credentials.tokenAcceso || tokenCandidates[0] || ""
    }

    if (regimenNormalized === "contributivo") {
      return credentials.tokenAccesoContributivo || credentials.tokenAcceso || tokenCandidates[0] || ""
    }

    return credentials.tokenAcceso || tokenCandidates[0] || ""
  }

  const addInterval = (baseDate: Date, unit: number, amount: number): Date => {
    const next = new Date(baseDate)
    switch (unit) {
      case 1:
        next.setMinutes(next.getMinutes() + amount)
        return next
      case 2:
        next.setHours(next.getHours() + amount)
        return next
      case 3:
        next.setDate(next.getDate() + amount)
        return next
      case 4:
        next.setDate(next.getDate() + amount * 7)
        return next
      case 5:
        next.setMonth(next.getMonth() + amount)
        return next
      case 6:
        next.setFullYear(next.getFullYear() + amount)
        return next
      default:
        return next
    }
  }

  const formatDate = (value: Date): string => {
    if (Number.isNaN(value.getTime())) return ""
    return value.toISOString().slice(0, 10)
  }

  const buildFechaEntrega = (
    baseDate: Date,
    intervalValue: number | null,
    intervalUnit: number | null,
    deliveryIndex: number
  ): string => {
    if (!intervalValue || !intervalUnit) return ""
    if (intervalUnit === 8) return ""
    const offset = intervalValue * deliveryIndex
    return formatDate(addInterval(baseDate, intervalUnit, offset))
  }

  const toSqlTimestamp = (dateStr: string): string => {
    const str = String(dateStr || "").trim()
    if (!str) return new Date().toISOString().slice(0, 10) + " 00:00:00.000"
    const date = new Date(str)
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10) + " 00:00:00.000"
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${mo}-${d} 00:00:00.000`
  }

  const addDaysFromDate = (dateStr: string, days: number): string => {
    const date = new Date(String(dateStr || "").trim())
    if (Number.isNaN(date.getTime())) date.setTime(Date.now())
    date.setDate(date.getDate() + days)
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${mo}-${d} 00:00:00.000`
  }

  useEffect(() => {
    if (!open || !prescripcion) return
    recentlySubmittedKeysRef.current.clear()
    setShowForm(false)
    setFormError(null)
    setFormSuccess(null)
    setPage(1)
    const prescripcionDate = prescripcion.FPrescripcion
      ? new Date(prescripcion.FPrescripcion)
      : prescripcion.FTutela
      ? new Date(prescripcion.FTutela)
      : null
    const baseDate = prescripcionDate && !Number.isNaN(prescripcionDate.getTime())
      ? prescripcionDate
      : new Date()
    const base = {
      NoPrescripcion: prescripcion.NoPrescripcion || prescripcion.NoTutela || "",
      TipoIDPaciente: prescripcion.TipoIDPaciente || prescripcion.TipoIDPac || "",
      NoIDPaciente: prescripcion.NoIDPaciente || prescripcion.NroIDPaciente || "",
      NoEntrega: "",
      NoSubEntrega: "0",
      TipoIDProv: "NI",
      NoIDProv: "",
      NomProv: "",
      CodMunEnt: "",
      FecMaxEnt: "",
      CantTotAEntregar: "",
      DirPaciente: "",
    }

    const nextRows: DireccionamientoRow[] = []

    const pushTecnologiaRows = (
      items: any[],
      tipo: DireccionamientoRow["TipoTec"],
      labelBuilder: (item: any, index: number) => string,
      getCodSerTec?: (item: any) => string,
      getConTec?: (item: any, index: number) => number
    ) => {
      items.forEach((item: any, idx: number) => {
        const totalCant = getTotalCantidad(item)
        const perEntrega = toNumber(item.Cant)
        const deliveryCount = (totalCant && perEntrega && perEntrega > 0) ? Math.max(1, Math.ceil(totalCant / perEntrega)) : 1
        const cantidadesPorEntrega = splitCantidadPorEntregas(totalCant, deliveryCount)
        const intervalValue = getIntervalValue(item)
        const intervalUnit = getIntervalUnit(item)
        const isUnique = intervalUnit === 8 || !intervalValue || !intervalUnit
        const codSerTec = getCodSerTec ? getCodSerTec(item) : ""
        const conTec = getConTec ? getConTec(item, idx) : idx + 1

        for (let entrega = 1; entrega <= deliveryCount; entrega += 1) {
          const labelBase = labelBuilder(item, idx)
          const label = deliveryCount > 1 ? `${labelBase} - Entrega ${entrega} de ${deliveryCount}` : labelBase
          nextRows.push({
            id: `${tipo}-${idx}-${entrega}`,
            label,
            ...base,
            TipoTec: tipo,
            ConTec: conTec,
            CodSerTecAEntregar: codSerTec,
            CodSerTecFixed: Boolean(codSerTec),
            NoEntrega: String(entrega),
            FecMaxEnt: buildFechaEntrega(baseDate, intervalValue, intervalUnit, entrega),
            CantTotAEntregar: cantidadesPorEntrega[entrega - 1] !== undefined ? String(cantidadesPorEntrega[entrega - 1]) : "",
            isUnique,
            intervalValue,
            intervalUnit,
            deliveryIndex: entrega,
            deliveryCount,
          }) 
        }
      })
    }

    const procedimientos = getArray(prescripcion, "procedimientos")
    pushTecnologiaRows(
      procedimientos,
      "P",
      (proc) => `Procedimiento: ${proc.CodCUPS || ""} ${proc.DescPro || proc.NomProc || ""}`.trim(),
      (proc) => String(proc.CodCUPS || ""),
      (proc, idx) => Number(proc.ConOrdenPro || proc.ConOrden || idx + 1)
    )

    const pushMedicamentoRows = (items: any[]) => {
      items.forEach((item: any, idx: number) => {
        const intervalValue = getMedicamentoIntervalValue(item)
        const intervalUnit = getMedicamentoIntervalUnit(item)
        const deliveryCount = getMedicamentoDeliveryCount(item)
        const isUnique = intervalUnit === 8 || !intervalValue || !intervalUnit
        const conTec = Number(item.ConOrden || idx + 1)
        const totalCant = toNumber(item.CantTotalF)
        const cantidadesPorEntrega = splitCantidadPorEntregas(totalCant, deliveryCount)

        for (let entrega = 1; entrega <= deliveryCount; entrega += 1) {
          const labelBase = `Medicamento: ${item.DescMedPrinAct || item.DscMedPA || ""}`.trim()
          const label = deliveryCount > 1 ? `${labelBase} - Entrega ${entrega} de ${deliveryCount}` : labelBase
          nextRows.push({
            id: `M-${idx}-${entrega}`,
            label,
            ...base,
            TipoTec: "M",
            ConTec: conTec,
            CodSerTecAEntregar: "",
            CodSerTecFixed: false,
            NoEntrega: String(entrega),
            FecMaxEnt: buildFechaEntrega(baseDate, 1, 5, entrega),
            CantTotAEntregar: cantidadesPorEntrega[entrega - 1] !== undefined ? String(cantidadesPorEntrega[entrega - 1]) : "",
            isUnique,
            intervalValue,
            intervalUnit,
            deliveryIndex: entrega,
            deliveryCount,
          })
        }
      })
    }

    const pushNutricionalRows = (items: any[]) => {
      items.forEach((item: any, idx: number) => {
        const intervalValue = getNutricionalIntervalValue(item)
        const intervalUnit = getNutricionalIntervalUnit(item)
        const deliveryCount = getNutricionalDeliveryCount(item)
        const isUnique = intervalUnit === 8 || !intervalValue || !intervalUnit
        const conTec = Number(item.ConOrdenPN || item.ConOrden || idx + 1)
        const totalCant = toNumber(item.CantTotalF)
        const cantidadesPorEntrega = splitCantidadPorEntregas(totalCant, deliveryCount)
        const codSerTec = String(item.DescProdNutr || item.DescPN || "")
        const codigoMipres = String(item.DescProdNutr || item.DescPN || "")

        for (let entrega = 1; entrega <= deliveryCount; entrega += 1) {
          const labelBase = `Producto Nutricional: ${codigoMipres}`.trim()
          const label = deliveryCount > 1 ? `${labelBase} - Entrega ${entrega} de ${deliveryCount}` : labelBase
          nextRows.push({
            id: `N-${idx}-${entrega}`,
            label,
            ...base,
            TipoTec: "N",
            ConTec: conTec,
            CodSerTecAEntregar: codSerTec,
            CodSerTecFixed: Boolean(codSerTec),
            codigoMipres,
            NoEntrega: String(entrega),
            FecMaxEnt: buildFechaEntrega(baseDate, 1, 5, entrega),
            CantTotAEntregar: cantidadesPorEntrega[entrega - 1] !== undefined ? String(cantidadesPorEntrega[entrega - 1]) : "",
            isUnique,
            intervalValue,
            intervalUnit,
            deliveryIndex: entrega,
            deliveryCount,
          })
        }
      })
    }

    const medicamentos = getArray(prescripcion, "medicamentos")
    pushMedicamentoRows(medicamentos)

    const dispositivos = getArray(prescripcion, "dispositivos")
    pushTecnologiaRows(
      dispositivos,
      "D",
      (disp) => `Dispositivo Medico: ${disp.DescDM || disp.CodDisp || ""}`.trim(),
      (disp) => String(disp.CodDisp || ""),
      (disp, idx) => Number(disp.ConOrdenDM || disp.ConOrden || idx + 1)
    )

    const nutricionales = getArray(prescripcion, "productosNutricionales")
    pushNutricionalRows(nutricionales)

    const pushServicioComplementarioRows = (items: any[]) => {
      items.forEach((item: any, idx: number) => {
        const intervalValue = getServicioIntervalValue(item)
        const intervalUnit = getServicioIntervalUnit(item)
        const deliveryCount = getServicioDeliveryCount(item)
        const isUnique = intervalUnit === 8 || !intervalValue || !intervalUnit
        const conTec = Number(item.ConOrdenSC || item.ConOrden || idx + 1)
        const totalCant = toNumber(item.CantTotal)
        const cantidadesPorEntrega = splitCantidadPorEntregas(totalCant, deliveryCount)

        for (let entrega = 1; entrega <= deliveryCount; entrega += 1) {
          const labelBase = `Servicio Complementario: ${item.DescSerComp || ""}`.trim()
          const label = deliveryCount > 1 ? `${labelBase} - Entrega ${entrega} de ${deliveryCount}` : labelBase
          nextRows.push({
            id: `S-${idx}-${entrega}`,
            label,
            ...base,
            TipoTec: "S",
            ConTec: conTec,
            CodSerTecAEntregar: String(item.CodSerComp || ""),
            CodSerTecFixed: Boolean(item.CodSerComp),
            NoEntrega: String(entrega),
            FecMaxEnt: buildFechaEntrega(baseDate, 1, 5, entrega),
            CantTotAEntregar: cantidadesPorEntrega[entrega - 1] !== undefined ? String(cantidadesPorEntrega[entrega - 1]) : "",
            isUnique,
            intervalValue,
            intervalUnit,
            deliveryIndex: entrega,
            deliveryCount,
          })
        }
      })
    }

    const servicios = getArray(prescripcion, "serviciosComplementarios")
    pushServicioComplementarioRows(servicios)

    setRows(nextRows)

    const pacienteId = base.NoIDPaciente
    if (!pacienteId) return

    let active = true
    const loadAfiliadoDireccion = async () => {
      try {
        const response = await fetch("/api/afiliado/direccion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numero_identificacion: pacienteId }),
        })

        if (!response.ok) return

        const result = await response.json()
        if (!active) return

        const direccion = result?.direccion ?? result?.data?.direccion ?? ""
        const municipio = result?.municipio ?? result?.data?.municipio ?? ""

        if (!direccion && !municipio) return

        setRows((prev) =>
          prev.map((row) => {
            // Si el usuario ya seleccionó un proveedor IPS, no sobrescribir CodMunEnt
            // Solo actualizar si está vacío
            if (row.NoIDProv && row.NoIDProv !== "") {
              return row
            }
            
            return {
              ...row,
              DirPaciente: row.DirPaciente || direccion || row.DirPaciente,
              // Solo actualizar CodMunEnt si está vacío (el usuario no ha seleccionado IPS aún)
              CodMunEnt: row.CodMunEnt ? row.CodMunEnt : (municipio || row.CodMunEnt),
            }
          })
        )
      } catch {
        // No bloquear el formulario si la direccion no esta disponible
      }
    }

    void loadAfiliadoDireccion()

    return () => {
      active = false
    }
  }, [open, prescripcion])

  const updateDeliveryCount = (rowId: string, newCount: number) => {
    const targetRow = rows.find((r) => r.id === rowId)
    if (!targetRow) return

    const { TipoTec, ConTec, allowManualTipo } = targetRow
    let originalItem: any = null
    let itemIndex = -1
    let labelBuilder: (item: any, index: number) => string = () => ""
    let getCodSerTec: ((item: any) => string) | undefined
    let intervalValue: number | null = null
    let intervalUnit: number | null = null

    // Si es edición manual, no buscamos el item original para no sobrescribir
    if (allowManualTipo) {
       // Usamos los valores actuales de la fila como base
       const baseLabel = targetRow.label.split("- Entrega")[0].trim()
       labelBuilder = () => baseLabel
       getCodSerTec = () => targetRow.CodSerTecAEntregar || ""
       intervalValue = targetRow.intervalValue || null
       intervalUnit = targetRow.intervalUnit || null
    } else if (TipoTec === "P") {
      const items = getArray(prescripcion, "procedimientos")
      itemIndex = items.findIndex((item: any, idx: number) => Number(item.ConOrdenPro || idx + 1) === ConTec)
      if (itemIndex !== -1) {
        originalItem = items[itemIndex]
        labelBuilder = (proc) => `Procedimiento: ${proc.CodCUPS || ""} ${proc.DescPro || ""}`.trim()
        getCodSerTec = (proc) => String(proc.CodCUPS || "")
        intervalValue = getIntervalValue(originalItem)
        intervalUnit = getIntervalUnit(originalItem)
      }
    } else if (TipoTec === "M") {
      const items = getArray(prescripcion, "medicamentos")
      itemIndex = items.findIndex((item: any, idx: number) => Number(item.ConOrden || idx + 1) === ConTec)
      if (itemIndex !== -1) {
        originalItem = items[itemIndex]
        labelBuilder = (item) => `Medicamento: ${item.DescMedPrinAct || ""}`.trim()
        intervalValue = getMedicamentoIntervalValue(originalItem)
        intervalUnit = getMedicamentoIntervalUnit(originalItem)
      }
    } else if (TipoTec === "D") {
      const items = getArray(prescripcion, "dispositivos")
      itemIndex = items.findIndex((item: any, idx: number) => Number(item.ConOrdenDM || idx + 1) === ConTec)
      if (itemIndex !== -1) {
        originalItem = items[itemIndex]
        labelBuilder = (disp) => `Dispositivo Medico: ${disp.DescDM || ""}`.trim()
        getCodSerTec = (disp) => String(disp.CodDisp || "")
        intervalValue = getIntervalValue(originalItem)
        intervalUnit = getIntervalUnit(originalItem)
      }
    } else if (TipoTec === "N") {
      const items = getArray(prescripcion, "productosNutricionales")
      itemIndex = items.findIndex((item: any, idx: number) => Number(item.ConOrdenPN || idx + 1) === ConTec)
      if (itemIndex !== -1) {
        originalItem = items[itemIndex]
        const codigoMipres = String(originalItem.DescProdNutr || originalItem.DescPN || "")
        labelBuilder = () => `Producto Nutricional: ${codigoMipres}`.trim()
        getCodSerTec = () => codigoMipres
        intervalValue = getNutricionalIntervalValue(originalItem)
        intervalUnit = getNutricionalIntervalUnit(originalItem)
      }
    } else if (TipoTec === "S") {
      const items = getArray(prescripcion, "serviciosComplementarios")
      itemIndex = items.findIndex((item: any, idx: number) => Number(item.ConOrdenSC || idx + 1) === ConTec)
      if (itemIndex !== -1) {
        originalItem = items[itemIndex]
        labelBuilder = (item) => `Servicio Complementario: ${item.DescSerComp || ""}`.trim()
        getCodSerTec = (item) => String(item.CodSerComp || "")
        intervalValue = getServicioIntervalValue(originalItem)
        intervalUnit = getServicioIntervalUnit(originalItem)
      }
    }
    if (!originalItem && !allowManualTipo) {
      const parts = String(rowId).split("-")
      if (parts.length >= 2) {
        const fallbackTipo = parts[0]
        const fallbackIndex = Number(parts[1])
        if (fallbackTipo && !Number.isNaN(fallbackIndex)) {
          itemIndex = fallbackIndex
          if (fallbackTipo === "P") {
            const items = getArray(prescripcion, "procedimientos")
            originalItem = items[fallbackIndex]
            labelBuilder = (proc: any) => `Procedimiento: ${proc?.CodCUPS || ""} ${proc?.DescPro || ""}`.trim()
            getCodSerTec = (proc: any) => String(proc?.CodCUPS || "")
            intervalValue = getIntervalValue(originalItem)
            intervalUnit = getIntervalUnit(originalItem)
          } else if (fallbackTipo === "M") {
            const items = getArray(prescripcion, "medicamentos")
            originalItem = items[fallbackIndex]
            labelBuilder = (item: any) => `Medicamento: ${item?.DescMedPrinAct || ""}`.trim()
            intervalValue = getMedicamentoIntervalValue(originalItem)
            intervalUnit = getMedicamentoIntervalUnit(originalItem)
          } else if (fallbackTipo === "D") {
            const items = getArray(prescripcion, "dispositivos")
            originalItem = items[fallbackIndex]
            labelBuilder = (disp: any) => `Dispositivo Medico: ${disp?.DescDM || ""}`.trim()
            getCodSerTec = (disp: any) => String(disp?.CodDisp || "")
            intervalValue = getIntervalValue(originalItem)
            intervalUnit = getIntervalUnit(originalItem)
          } else if (fallbackTipo === "N") {
            const items = getArray(prescripcion, "productosNutricionales")
            originalItem = items[fallbackIndex]
            const codigoMipres = String(originalItem?.DescProdNutr || originalItem?.DescPN || "")
            labelBuilder = () => `Producto Nutricional: ${codigoMipres}`.trim()
            getCodSerTec = () => codigoMipres
            intervalValue = getNutricionalIntervalValue(originalItem)
            intervalUnit = getNutricionalIntervalUnit(originalItem)
          } else if (fallbackTipo === "S") {
            const items = getArray(prescripcion, "serviciosComplementarios")
            originalItem = items[fallbackIndex]
            labelBuilder = (item: any) => `Servicio Complementario: ${item?.DescSerComp || ""}`.trim()
            getCodSerTec = (item: any) => String(item?.CodSerComp || "")
            intervalValue = getServicioIntervalValue(originalItem)
            intervalUnit = getServicioIntervalUnit(originalItem)
          }
        }
      }
    }

    let totalCant: number | null = null
    const existingGroupRows = rows.filter(r => r.TipoTec === TipoTec && r.ConTec === ConTec)
    if (allowManualTipo) {
       const totalFromRows = existingGroupRows.reduce((acc, row) => {
         const value = Number(row.CantTotAEntregar)
         return Number.isFinite(value) ? acc + value : acc
       }, 0)
       totalCant = totalFromRows
    } else {
       totalCant = getTotalCantidad(originalItem)
    }

    // Permitir continuar si es manual incluso si totalCant es 0 o null (para que genere filas vacías)
    if (!totalCant && !allowManualTipo) return

    const cantidadesPorEntrega = splitCantidadPorEntregas(totalCant, newCount)
    
    let newIntervalValue = intervalValue
    let newIntervalUnit = intervalUnit
    
    if (intervalValue !== null && intervalUnit !== null && intervalUnit !== 8) {
       let duracionDias = 0
       switch (intervalUnit) {
          case 1: duracionDias = intervalValue / (24 * 60); break;
          case 2: duracionDias = intervalValue / 24; break;
          case 3: duracionDias = intervalValue; break;
          case 4: duracionDias = intervalValue * 7; break;
          case 5: duracionDias = intervalValue * 30; break;
          case 6: duracionDias = intervalValue * 365; break;
          default: duracionDias = intervalValue;
       }
       const intervalDias = duracionDias / newCount
       newIntervalValue = Math.floor(intervalDias)
       newIntervalUnit = 3 
    }

    const prescripcionDate = (prescripcion.FPrescripcion || prescripcion.FTutela)
      ? new Date(prescripcion.FPrescripcion || prescripcion.FTutela)
      : null
    const baseDate = prescripcionDate && !Number.isNaN(prescripcionDate.getTime()) ? prescripcionDate : new Date()

    const base = {
      NoPrescripcion: prescripcion.NoPrescripcion || prescripcion.NoTutela || "",
      TipoIDPaciente: prescripcion.TipoIDPaciente || prescripcion.TipoIDPac || "",
      NoIDPaciente: prescripcion.NoIDPaciente || prescripcion.NroIDPaciente || "",
      NoEntrega: "",
      NoSubEntrega: "0",
      TipoIDProv: "NI",
      NoIDProv: "",
      NomProv: "",
      CodMunEnt: "",
      FecMaxEnt: "",
      CantTotAEntregar: "",
      DirPaciente: "",
    }
    
    const generatedRows: DireccionamientoRow[] = []
    const codSerTec = getCodSerTec ? getCodSerTec(originalItem) : ""
    
    const templateRow = existingGroupRows[0]
    
    for (let entrega = 1; entrega <= newCount; entrega++) {
        const labelBase = labelBuilder(originalItem, itemIndex)
        const label = newCount > 1 ? `${labelBase} - Entrega ${entrega} de ${newCount}` : labelBase
        
        generatedRows.push({
            id: `${TipoTec}-${itemIndex}-${entrega}`,
            label,
            ...base,
            TipoTec,
            ConTec,
        allowManualTipo: Boolean(allowManualTipo),
            CodSerTecAEntregar: codSerTec,
            CodSerTecFixed: Boolean(codSerTec),
            codigoMipres: TipoTec === "N" ? codSerTec : undefined,
            NoEntrega: String(entrega),
            FecMaxEnt: buildFechaEntrega(baseDate, newIntervalValue, newIntervalUnit, entrega),
            CantTotAEntregar: cantidadesPorEntrega[entrega - 1] !== undefined ? String(cantidadesPorEntrega[entrega - 1]) : "",
            isUnique: false,
            intervalValue: newIntervalValue,
            intervalUnit: newIntervalUnit,
            deliveryIndex: entrega,
            deliveryCount: newCount,
            CodMunEnt: templateRow?.CodMunEnt || base.CodMunEnt,
            DirPaciente: templateRow?.DirPaciente || base.DirPaciente,
            TipoIDProv: templateRow?.TipoIDProv || base.TipoIDProv,
            NoIDProv: templateRow?.NoIDProv || base.NoIDProv,
            NomProv: templateRow?.NomProv || base.NomProv,
        })
    }
    
    const newRowList = [...rows]
    const startIdx = newRowList.findIndex(r => r.TipoTec === TipoTec && r.ConTec === ConTec)
    const count = newRowList.filter(r => r.TipoTec === TipoTec && r.ConTec === ConTec).length
    
    if (startIdx !== -1) {
      newRowList.splice(startIdx, count, ...generatedRows)
      setRows(newRowList)
      setPage(startIdx + 1)
    }
  }

  const handleSubmit = async () => {
    if (submitInFlightRef.current || submitting) return
    submitInFlightRef.current = true

    try {
    const regimen = getRegimenNormalized()
    const accessToken = resolveAccessToken(regimen)

    if (!accessToken) {
      setFormError("No hay token de acceso configurado. Valide sus credenciales en Configuración.")
      submitInFlightRef.current = false
      return
    }

    if (!regimen) {
      setFormError(`Régimen no especificado en la prescripción (valor: "${prescripcion?.tipoRegimen ?? prescripcion?.RegimenPrescripcion ?? prescripcion?.Regimen ?? ""}"). Se usará el token principal si está disponible.`)
    }
    
    if (!credentials.nit) {
      setFormError("Configure el NIT en Configuración antes de direccionar")
      submitInFlightRef.current = false
      return
    }

    const rowsToProcess = [...rows].sort((a, b) => {
      const conA = Number(a.ConTec)
      const conB = Number(b.ConTec)
      if (conA !== conB) return conA - conB

      const entA = Number(a.NoEntrega)
      const entB = Number(b.NoEntrega)
      if (entA !== entB) return entA - entB

      const tipoA = String(a.TipoTec ?? "").trim().toUpperCase()
      const tipoB = String(b.TipoTec ?? "").trim().toUpperCase()
      if (tipoA !== tipoB) return tipoA.localeCompare(tipoB)

      return String(a.id ?? "").localeCompare(String(b.id ?? ""))
    })

    const preflightKeys = new Set<string>()
    for (const row of rowsToProcess) {
      const required = [
        row.NoPrescripcion,
        row.TipoTec,
        row.ConTec,
        row.TipoIDPaciente,
        row.NoIDPaciente,
        row.NoEntrega,
        row.TipoIDProv,
        row.NoIDProv,
        row.CodMunEnt,
        row.CantTotAEntregar,
        row.DirPaciente,
      ]

      if (!row.isUnique) {
        required.push(row.FecMaxEnt)
      }

      if (required.some((value) => value === "" || value === null || value === undefined)) {
        setFormError("Complete todos los campos requeridos en cada tecnologia")
        submitInFlightRef.current = false
        return
      }

      const tipoTecNorm = String(row.TipoTec ?? "").trim().toUpperCase()
      const conTecNorm = Number(row.ConTec)
      const noEntregaNorm = Number(row.NoEntrega)
      const entregaKey = `${tipoTecNorm}-${conTecNorm}-${noEntregaNorm}`

      if (preflightKeys.has(entregaKey)) {
        const duplicateMessage = `Numero de entrega duplicado (${row.NoEntrega}) para la tecnologia ${row.TipoTec}-${row.ConTec}`
        setFormError(duplicateMessage)
        toast.error(duplicateMessage)
        submitInFlightRef.current = false
        return
      }
      preflightKeys.add(entregaKey)
    }

    setSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const errors: string[] = []
      const successIds: Array<{ ID: string; IDDireccionamiento: string }> = []
      const registeredIdsMap = new Map<string, { ID: string; IDDireccionamiento: string }>()
      const responseSummaries: string[] = []
      const entregaKeys = new Set<string>()
      const skippedExisting: string[] = []
      const existingActiveKeys = new Set<string>()

      const authHeader = await getFreshAuthHeader()

      try {
        const noPrescripcion = String(rowsToProcess[0]?.NoPrescripcion || prescripcion?.NoPrescripcion || "").trim()
        if (noPrescripcion) {
          const queryParams = new URLSearchParams({
            nit: credentials.nit,
            tokenAcceso: accessToken,
            tipo: tipoDocumento,
            noPrescripcion,
          })

          const existingResponse = await fetch(`/api/mipres/direccionamiento?${queryParams.toString()}`)
          const existingResult = await existingResponse.json()
          if (existingResult?.success) {
            const existingRows = normalizeDireccionamientos(existingResult.data)
            existingRows.forEach((item: any) => {
              const isAnulada = Boolean(String(item?.FecAnulacion ?? "").trim())
              if (isAnulada) return
              const key = `${String(item?.TipoTec ?? "").trim().toUpperCase()}-${Number(item?.ConTec)}-${Number(item?.NoEntrega)}`
              existingActiveKeys.add(key)
              const existingId = String(item?.ID || "").trim()
              const existingIdDir = String(item?.IDDireccionamiento || "").trim()
              if (existingId && existingIdDir) {
                registeredIdsMap.set(key, { ID: existingId, IDDireccionamiento: existingIdDir })
              }
            })
          }
        }

        // Blindaje adicional: evitar reenvíos duplicados recientes en la misma sesión del modal.
        recentlySubmittedKeysRef.current.forEach((key) => existingActiveKeys.add(key))
      } catch {
        // Si falla la consulta previa no bloquea el registro, se continúa con validación local.
      }

      const checkRemoteExists = async (row: DireccionamientoRow) => {
        try {
          const q = new URLSearchParams({
            nit: credentials.nit,
            tokenAcceso: accessToken,
            tipo: tipoDocumento,
            noPrescripcion: String(row.NoPrescripcion || prescripcion?.NoPrescripcion || ""),
          })
          const resp = await fetch(`/api/mipres/direccionamiento?${q.toString()}`)
          if (!resp.ok) return false
          const jr = await resp.json()
          if (!jr?.success) return false
          const items = normalizeDireccionamientos(jr.data)
          return items.some((item: any) => {
            const isAnulada = Boolean(String(item?.FecAnulacion ?? "").trim())
            if (isAnulada) return false
            const key = `${String(item?.TipoTec ?? "").trim().toUpperCase()}-${Number(item?.ConTec)}-${Number(item?.NoEntrega)}`
            return key === `${String(row.TipoTec ?? "").trim().toUpperCase()}-${Number(row.ConTec)}-${Number(row.NoEntrega)}`
          })
        } catch {
          return false
        }
      }

      for (const row of rowsToProcess) {
        // Validar duplicados por tecnologia antes de enviar cada registro.
        // Se permite repetir NoEntrega entre tecnologias distintas, pero no dentro de la misma.
        const tipoTecNorm = String(row.TipoTec ?? "").trim().toUpperCase()
        const conTecNorm = Number(row.ConTec)
        const noEntregaNorm = Number(row.NoEntrega)
        const entregaKey = `${tipoTecNorm}-${conTecNorm}-${noEntregaNorm}`

        if (existingActiveKeys.has(entregaKey)) {
          skippedExisting.push(entregaKey)
          continue
        }

        if (entregaKeys.has(entregaKey)) {
          const duplicateMessage = `Numero de entrega duplicado (${row.NoEntrega}) para la tecnologia ${row.TipoTec}-${row.ConTec}`
          setFormError(duplicateMessage)
          toast.error(duplicateMessage)
          submitInFlightRef.current = false
          setSubmitting(false)
          return
        }
        entregaKeys.add(entregaKey)

        const payload = {
          NoPrescripcion: row.NoPrescripcion,
          TipoTec: row.TipoTec,
          ConTec: Number(row.ConTec),
          TipoIDPaciente: row.TipoIDPaciente,
          NoIDPaciente: row.NoIDPaciente,
          NoEntrega: Number(row.NoEntrega),
          NoSubEntrega: Number(row.NoSubEntrega || 0),
          TipoIDProv: row.TipoIDProv,
          NoIDProv: row.NoIDProv,
          CodMunEnt: row.CodMunEnt,
          FecMaxEnt: row.FecMaxEnt,
          CantTotAEntregar: row.CantTotAEntregar,
          DirPaciente: row.DirPaciente,
          CodSerTecAEntregar: row.CodSerTecAEntregar,
          deliveryCount: row.deliveryCount,
        }

        try {
          const registrarHeaders: Record<string, string> = { "Content-Type": "application/json" }
          if (authHeader) registrarHeaders["Authorization"] = authHeader
          const response = await fetch("/api/mipres/direccionamiento", {
            method: "POST",
            headers: registrarHeaders,
            body: JSON.stringify({
              nit: credentials.nit,
              tokenAcceso: accessToken,
              tipo: "registrar",
              usuario: credentials.usuario || credentials.documentoUsuario || "",
              body: payload,
            }),
          })

          // Intentar leer el body JSON siempre: nuestra propia API devuelve { success, error, details }
          // incluso cuando responde con status no-2xx, y ese detalle es lo que explica el rechazo real.
          let result: any = null
          try {
            result = await response.json()
          } catch {
            result = null
          }

          // Si no hay body parseable, es una falla HTTP real (ej. gateway caido) sin detalle disponible.
          if (!result || typeof result !== "object") {
            const statusError = getFriendlyHttpError(response.status)
            const exists = await checkRemoteExists(row)
            if (exists) {
              existingActiveKeys.add(entregaKey)
              recentlySubmittedKeysRef.current.add(entregaKey)
              responseSummaries.push(`Registro confirmado existente tras fallo HTTP: ${statusError}`)
              continue
            }
            errors.push(statusError)
            responseSummaries.push(statusError)
            reportErrorNotification(
              "Direccionamiento (SISPRO)",
              `Prescripción ${row.NoPrescripcion} (${row.TipoTec}-${row.ConTec}): ${statusError}`
            )
            break
          }

          if (response.ok && result.success) {
            // result.data puede ser array [{ rowKey, registrar: [{ ID, IDDireccionamiento }] }]
            // o un objeto directo. El ministerio MIPRES retorna el registrar como array.
            const registrarRaw = Array.isArray(result.data) ? result.data[0]?.registrar : result.data
            const registrarItem = Array.isArray(registrarRaw) ? registrarRaw[0] : registrarRaw
            const rawId = registrarItem?.ID ?? registrarItem?.Id ?? registrarItem?.id
            const rawIdDir = registrarItem?.IDDireccionamiento ?? registrarItem?.IdDireccionamiento ?? registrarItem?.idDireccionamiento
            if (rawId && rawIdDir) {
              const idEntry = { ID: String(rawId), IDDireccionamiento: String(rawIdDir) }
              successIds.push(idEntry)
              registeredIdsMap.set(entregaKey, idEntry)
            }
            existingActiveKeys.add(entregaKey)
            recentlySubmittedKeysRef.current.add(entregaKey)
            responseSummaries.push(formatDireccionamientoSuccess(registrarItem ?? result.data))
          } else {
            // result.success=false (con o sin status HTTP 2xx): verificar si el registro
            // quedó creado en el backend igual (ej. respuesta de error espuria)
            const exists = await checkRemoteExists(row)
            if (exists) {
              existingActiveKeys.add(entregaKey)
              recentlySubmittedKeysRef.current.add(entregaKey)
              responseSummaries.push(`Registro confirmado existente tras respuesta de error: ${summarizeErrorResponse(result.error, response.status)}`)
              continue
            }

            let errorMessage = summarizeErrorResponse(result.error, response.status)
            const modelState = result.ModelState || result.details?.registrar?.ModelState
            if (modelState && typeof modelState === "object") {
              const modelErrors: string[] = []
              Object.entries(modelState).forEach(([field, messages]: [string, any]) => {
                if (Array.isArray(messages)) {
                  messages.forEach((msg: string) => {
                    modelErrors.push(msg)
                  })
                }
              })
              if (modelErrors.length > 0) {
                errorMessage = modelErrors.join("\n")
              }
            }
            errors.push(errorMessage)
            responseSummaries.push(errorMessage)
            reportErrorNotification(
              "Direccionamiento (SISPRO)",
              `Prescripción ${row.NoPrescripcion} (${row.TipoTec}-${row.ConTec}): ${errorMessage}`
            )
            break
          }
        } catch (fetchError) {
          const errorMsg = summarizeErrorResponse(fetchError)
          const exists = await checkRemoteExists(row)
          if (exists) {
            existingActiveKeys.add(entregaKey)
            recentlySubmittedKeysRef.current.add(entregaKey)
            responseSummaries.push(`Registro confirmado existente tras excepción: ${errorMsg}`)
            continue
          }
          errors.push(errorMsg)
          responseSummaries.push(errorMsg)
          reportErrorNotification(
            "Direccionamiento (SISPRO)",
            `Prescripción ${row.NoPrescripcion} (${row.TipoTec}-${row.ConTec}): ${errorMsg}`
          )
          break
        }
      }

      if (errors.length === 0) {
        setRegisteredIds(successIds)
        const skipMessage = skippedExisting.length > 0
          ? ` (omitidos por existir activos: ${skippedExisting.length})`
          : ""
        setFormSuccess(`Direccionamientos registrados exitosamente${skipMessage}`)
        toast.success(
          `✓ Registrado exitosamente${successIds.length > 0 ? ` (${successIds.length} registros)` : ""}${skipMessage}`,
          {
            description: buildToastDescription(responseSummaries),
            duration: 6000,
          }
        )

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("direccionamiento:refresh"))
        }
        // Llamar callback de éxito después de un pequeño delay para que se vea el toast
        if (onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 200)
        }
      } else {
        const errorDetails = errors.join("\n")
        setFormError(errorDetails)
        const displayErrors = errors.slice(0, 3).join("\n")
        const moreCount = errors.length > 3 ? errors.length - 3 : 0
        const toastMessage = 
          moreCount > 0 
            ? `${displayErrors}\n(y ${moreCount} error(es) más)`
            : displayErrors
        toast.error(toastMessage, {
          duration: 6000,
          description: buildToastDescription(responseSummaries),
        })
      }
    } catch {
      setFormError("Error de conexion con el servidor")
      toast.error("✗ Error de conexion con el servidor")
    } finally {
      setSubmitting(false)
    }
    } finally {
      submitInFlightRef.current = false
    }
  }

  return {
    showForm,
    setShowForm,
    submitting,
    formError,
    formSuccess,
    rows,
    setRows,
    page,
    setPage,
    registeredIds,
    handleSubmit,
    updateDeliveryCount,
  }
}
