// Gestión de la plantilla de facturación en sessionStorage.
// Los datos se eliminan automáticamente al cerrar la pestaña del navegador.

export interface FacturacionPlantillaRow {
  _id: string
  tipo_registro: string
  consecutivo_registro: string
  tipo_doc_ips: string
  nit_ips: string
  nombre_ips: string
  digito_verificacion: string
  numero_prescripcion: string
  id_suministro: string
  est_suministro: string
  id_datos_facturado: string
  est_datos_facturado: string
  cufe: string
  fecha_emision_factura: string
  numero: string
  prefijo_factura: string
  numero_factura: string
  valor_total_factura: string
  valor_pagado: string
  /** Solo tiene valor cuando la fila se importó por "Número de recepción"; de resto queda vacío. */
  numero_recepcion: string
}

const STORAGE_KEY = "facturacion_plantilla_session"

/** Evento custom disparado cada vez que el storage cambia (misma pestaña). */
export const PLANTILLA_STORAGE_EVENT = "plantilla:storage:updated"

let idCounter = 0

function genId(): string {
  idCounter += 1
  return `r${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`
}

function defaultRow(): FacturacionPlantillaRow {
  return {
    _id: genId(),
    tipo_registro: "3",
    consecutivo_registro: "",
    tipo_doc_ips: "NI",
    nit_ips: "",
    nombre_ips: "",
    digito_verificacion: "",
    numero_prescripcion: "",
    id_suministro: "",
    est_suministro: "",
    id_datos_facturado: "",
    est_datos_facturado: "",
    cufe: "",
    fecha_emision_factura: "",
    numero: "",
    prefijo_factura: "",
    numero_factura: "",
    valor_total_factura: "",
    valor_pagado: "",
    numero_recepcion: "",
  }
}

export function getPlantillaRows(): FacturacionPlantillaRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FacturacionPlantillaRow[]) : []
  } catch {
    return []
  }
}

export function savePlantillaRows(rows: FacturacionPlantillaRow[]): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    window.dispatchEvent(new Event(PLANTILLA_STORAGE_EVENT))
  } catch { /* ignore */ }
}

export function addPlantillaRow(
  data: Partial<Omit<FacturacionPlantillaRow, "_id">>
): void {
  const rows = getPlantillaRows()
  const newRow: FacturacionPlantillaRow = {
    ...defaultRow(),
    ...data,
    _id: genId(),
    consecutivo_registro: String(rows.length + 1),
  }
  savePlantillaRows([...rows, newRow])
}

export function clearPlantillaRows(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(PLANTILLA_STORAGE_EVENT))
  } catch { /* ignore */ }
}

// ─── Plantilla de Reserva Técnica ──────────────────────────────────────────
// Estructura independiente de la de Giro: misma mecánica de sessionStorage,
// pero con las columnas del reporte mipres.fn_reporte_reserva_tecnica.

export interface FacturacionPlantillaReservaRow {
  _id: string
  consecutivo: string
  estado: string
  tipo_id_prestador: string
  id_prestador: string
  nombre_prestador: string
  plan_salud: string
  id_contrato: string
  tipo_id_usuario: string
  id_usuario: string
  id_avisado: string
  id_suministro: string
  id_facturacion: string
  numero_entrega: string
  favis: string
  ambito: string
  ide_servicio: string
  des_servicio: string
  diag_ppal: string
  cant: string
  est: string
  vr_unidad: string
  vl_reserva_pm: string
  pres_max: string
  pact: string
  u_med: string
  ffarma: string
  covid: string
}

const STORAGE_KEY_RESERVA = "facturacion_plantilla_reserva_session"

/** Evento custom disparado cada vez que el storage de reserva técnica cambia (misma pestaña). */
export const PLANTILLA_RESERVA_STORAGE_EVENT = "plantilla:reserva:storage:updated"

export function defaultReservaRow(): FacturacionPlantillaReservaRow {
  return {
    _id: genId(),
    consecutivo: "",
    estado: "UN",
    tipo_id_prestador: "NI",
    id_prestador: "",
    nombre_prestador: "",
    plan_salud: "",
    id_contrato: "",
    tipo_id_usuario: "",
    id_usuario: "",
    id_avisado: "",
    id_suministro: "",
    id_facturacion: "",
    numero_entrega: "",
    favis: "",
    ambito: "",
    ide_servicio: "",
    des_servicio: "",
    diag_ppal: "",
    cant: "",
    est: "P",
    vr_unidad: "",
    vl_reserva_pm: "",
    pres_max: "1",
    pact: "",
    u_med: "",
    ffarma: "",
    covid: "N/A",
  }
}

export function getPlantillaReservaRows(): FacturacionPlantillaReservaRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_RESERVA)
    return raw ? (JSON.parse(raw) as FacturacionPlantillaReservaRow[]) : []
  } catch {
    return []
  }
}

export function savePlantillaReservaRows(rows: FacturacionPlantillaReservaRow[]): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(STORAGE_KEY_RESERVA, JSON.stringify(rows))
    window.dispatchEvent(new Event(PLANTILLA_RESERVA_STORAGE_EVENT))
  } catch { /* ignore */ }
}

export function clearPlantillaReservaRows(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(STORAGE_KEY_RESERVA)
    window.dispatchEvent(new Event(PLANTILLA_RESERVA_STORAGE_EVENT))
  } catch { /* ignore */ }
}
