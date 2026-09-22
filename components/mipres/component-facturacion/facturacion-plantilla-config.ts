import {
  getPlantillaRows,
  savePlantillaRows,
  clearPlantillaRows,
  PLANTILLA_STORAGE_EVENT,
  getPlantillaReservaRows,
  savePlantillaReservaRows,
  clearPlantillaReservaRows,
  defaultReservaRow,
  PLANTILLA_RESERVA_STORAGE_EVENT,
} from "@/lib/facturacion-plantilla-storage"
import type { FacturacionPlantillaRow, FacturacionPlantillaReservaRow } from "@/lib/facturacion-plantilla-storage"

export type PlantillaTipo = "giro" | "reserva"

/** Fila genérica usada por la tabla: ambos esquemas (Giro y Reserva) son solo campos de texto + _id. */
export type PlantillaRow = Record<string, string> & { _id: string }

export interface ColDef {
  key: string
  headerLines: string[]
  width: number
  align?: "left" | "right" | "center"
  type?: "text" | "number" | "date"
  /** Solo aplica cuando type === "number": formatea como pesos colombianos (tooltip y totales). */
  currency?: boolean
  /**
   * Columna que solo tiene sentido para filas que vinieron de una fuente puntual (ej.
   * "Numero recepcion" solo aplica a filas importadas por número de recepción). Si ninguna
   * fila de la grilla tiene valor en esta columna, se oculta por completo en vez de mostrarse
   * siempre vacía.
   */
  hideIfAllEmpty?: boolean
}

// ─── Columnas: Estructura de Giro (comportamiento original, sin cambios) ──────

export const GIRO_COLUMNS: ColDef[] = [
  { key: "tipo_registro",         headerLines: ["Tipo de", "registro"],                                           width: 80,  align: "center" },
  { key: "consecutivo_registro",  headerLines: ["Consecutivo", "de registro"],                                   width: 100, align: "center" },
  { key: "tipo_doc_ips",          headerLines: ["Tipo de documento", "de identificación", "de la Institución", "Prestadora"], width: 110, align: "center" },
  { key: "nit_ips",               headerLines: ["Número de", "identificación", "tributaria de la", "Institución Prestadora"], width: 130, align: "left" },
  { key: "nombre_ips",            headerLines: ["NOMBRE IPS"],                                                   width: 220, align: "left" },
  { key: "digito_verificacion",   headerLines: ["Dígito de", "verificación"],                                    width: 70,  align: "center" },
  { key: "numero_prescripcion",   headerLines: ["Número", "Prescripción", "MIPRES"],                             width: 150, align: "left" },
  { key: "id_suministro",         headerLines: ["IDSuministro", "MIPRES"],                                       width: 130, align: "left" },
  { key: "est_suministro",        headerLines: ["EstSuministro", "MIPRES"],                                      width: 95,  align: "center" },
  { key: "id_datos_facturado",    headerLines: ["IDDatos", "Facturado", "MIPRES"],                               width: 120, align: "left" },
  { key: "est_datos_facturado",   headerLines: ["EstDatos", "Facturado", "MIPRES"],                              width: 95,  align: "center" },
  { key: "cufe",                  headerLines: ["CUFE"],                                                         width: 300, align: "left" },
  { key: "fecha_emision_factura", headerLines: ["Fecha de emisión", "de la factura"],                            width: 140, align: "center", type: "date" },
  { key: "numero",                headerLines: ["NUMERO"],                                                       width: 90,  align: "center" },
  { key: "prefijo_factura",       headerLines: ["Prefijo de", "la factura"],                                     width: 90,  align: "center" },
  { key: "numero_factura",        headerLines: ["Número de", "la factura"],                                      width: 130, align: "left" },
  // Solo se llena cuando la fila se importó por "Número de recepción" (una recepción agrupa
  // varias facturas); en las demás formas de importar/agregar queda vacía.
  { key: "numero_recepcion",      headerLines: ["Numero recepcion"],                                             width: 130, align: "left", hideIfAllEmpty: true },
  { key: "valor_total_factura",   headerLines: ["valor total", "factura"],                                       width: 140, align: "right", type: "number", currency: true },
  { key: "valor_pagado",          headerLines: ["Valor pagado"],                                                  width: 140, align: "right", type: "number", currency: true },
]

// ─── Columnas: Reserva Técnica (mipres.fn_reporte_reserva_tecnica) ────────────

export const RESERVA_COLUMNS: ColDef[] = [
  { key: "consecutivo",       headerLines: ["CONSECUTIVO"],           width: 90,  align: "center" },
  { key: "estado",            headerLines: ["Estado"],                 width: 70,  align: "center" },
  { key: "tipo_id_prestador", headerLines: ["tipoIde", "prestador"],   width: 90,  align: "center" },
  { key: "id_prestador",      headerLines: ["Idprestador"],            width: 110, align: "left" },
  { key: "nombre_prestador",  headerLines: ["nombrePrestador"],        width: 220, align: "left" },
  { key: "plan_salud",        headerLines: ["planSalud"],              width: 110, align: "center" },
  { key: "id_contrato",       headerLines: ["idContrato"],             width: 100, align: "left" },
  { key: "tipo_id_usuario",   headerLines: ["tipoIdUsuario"],          width: 100, align: "center" },
  { key: "id_usuario",        headerLines: ["idUsuario"],              width: 120, align: "left" },
  { key: "id_avisado",        headerLines: ["idAvisado"],              width: 170, align: "left" },
  { key: "id_suministro",     headerLines: ["IDSuministro"],           width: 120, align: "left" },
  { key: "id_facturacion",    headerLines: ["IDFacturacion"],          width: 120, align: "left" },
  { key: "numero_entrega",    headerLines: ["Numero", "Entrega"],      width: 90,  align: "center" },
  { key: "favis",             headerLines: ["Favis"],                  width: 110, align: "center", type: "date" },
  { key: "ambito",            headerLines: ["Ambito"],                 width: 80,  align: "center" },
  { key: "ide_servicio",      headerLines: ["ideServicio"],            width: 100, align: "center" },
  { key: "des_servicio",      headerLines: ["DesServicio"],            width: 160, align: "left" },
  { key: "diag_ppal",         headerLines: ["DiagPpal"],               width: 90,  align: "center" },
  { key: "cant",              headerLines: ["cant"],                   width: 80,  align: "right", type: "number" },
  { key: "est",               headerLines: ["Est"],                    width: 60,  align: "center" },
  { key: "vr_unidad",         headerLines: ["VrUnidad"],               width: 110, align: "right", type: "number", currency: true },
  { key: "vl_reserva_pm",     headerLines: ["VLReserva", "PM"],        width: 120, align: "right", type: "number", currency: true },
  { key: "pres_max",          headerLines: ["pres_Max"],               width: 80,  align: "center" },
  { key: "pact",              headerLines: ["Pact"],                   width: 130, align: "left" },
  { key: "u_med",             headerLines: ["UMed"],                   width: 80,  align: "center" },
  { key: "ffarma",            headerLines: ["Ffarma"],                 width: 100, align: "center" },
  { key: "covid",             headerLines: ["Covid"],                  width: 70,  align: "center" },
]

let idCounter = 0

export function genId(): string {
  idCounter += 1
  return `r${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`
}

function emptyGiroRow(overrides: Partial<FacturacionPlantillaRow> = {}): PlantillaRow {
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
    numero_recepcion: "",
    valor_total_factura: "",
    valor_pagado: "",
    ...overrides,
  }
}

function emptyReservaRow(overrides: Partial<FacturacionPlantillaReservaRow> = {}): PlantillaRow {
  return { ...defaultReservaRow(), ...overrides }
}

export interface PlantillaTipoConfig {
  label: string
  columns: ColDef[]
  fillableCols: Set<string>
  correlativoKey: string
  getRows: () => PlantillaRow[]
  saveRows: (rows: PlantillaRow[]) => void
  clearRows: () => void
  storageEvent: string
  makeEmptyRow: (overrides?: Record<string, string>) => PlantillaRow
  fileNamePrefix: string
  /** Backend: genera el Excel estilizado a partir de las filas actuales de la grilla. */
  exportExcelEndpoint: string
  /**
   * Importar masivamente a partir de un Excel con una columna de identificadores. Un tipo
   * puede tener varias formas de buscar (Reserva Técnica: por id_suministro o por
   * id_facturacion, según qué dato ya tenga el usuario en esa etapa del proceso) — si hay
   * más de una opción, el botón "Importar Excel" primero pregunta cuál usar. Arreglo vacío
   * o ausente si el backend aún no expone ninguna función de importación para este tipo.
   */
  importarPor: ImportarPorOpcion[]
}

export interface ImportarPorOpcion {
  /** Identifica la opción (para recordar la última elegida, keys de React, etc.). */
  key: string
  /** Texto del botón/opción en el modal de selección. */
  label: string
  endpoint: string
  mapRow: (dbRow: Record<string, unknown>) => Record<string, string>
  /** Clave del body JSON que espera el endpoint (ej. "facturas", "ids_facturacion"). */
  bodyKey: string
  /** Ubica en el encabezado del Excel la columna con el identificador de búsqueda. */
  findColumnIndex: (headerRow: unknown[]) => number
  /** Mensaje de error cuando no se encuentra esa columna en el archivo. */
  columnNotFoundMessage: string
  /** Texto de ayuda (tooltip) del botón "Importar Excel" cuando esta es la única opción. */
  helpText: string
}

function toStr(v: unknown): string {
  return v === null || v === undefined ? "" : String(v)
}

function toDateInputStr(v: unknown): string {
  const s = toStr(v)
  return s ? s.slice(0, 10) : ""
}

/** Mapea las columnas devueltas por mipres.fn_reporte_reserva_tecnica_por_facturas a FacturacionPlantillaReservaRow. */
function mapReservaDbRow(row: Record<string, unknown>): Record<string, string> {
  return {
    consecutivo: toStr(row["CONSECUTIVO"]),
    estado: toStr(row["Estado"]),
    tipo_id_prestador: toStr(row["tipoIdeprestador"]),
    id_prestador: toStr(row["Idprestador"]),
    nombre_prestador: toStr(row["nombrePrestador"]),
    plan_salud: toStr(row["planSalud"]),
    id_contrato: toStr(row["idContrato"]),
    tipo_id_usuario: toStr(row["tipoIdUsuario"]),
    id_usuario: toStr(row["idUsuario"]),
    id_avisado: toStr(row["idAvisado"]),
    id_suministro: toStr(row["IDSuministro"]),
    id_facturacion: toStr(row["IDFacturacion"]),
    numero_entrega: toStr(row["Numero Entrega"]),
    favis: toDateInputStr(row["Favis"]),
    ambito: toStr(row["Ambito"]),
    ide_servicio: toStr(row["ideServicio"]),
    des_servicio: toStr(row["DesServicio"]),
    diag_ppal: toStr(row["DiagPpal"]),
    cant: toStr(row["cant"]),
    est: toStr(row["Est"]),
    vr_unidad: toStr(row["VrUnidad"]),
    vl_reserva_pm: toStr(row["VLReserva PM"]),
    pres_max: toStr(row["pres_Max"]),
    pact: toStr(row["Pact"]),
    u_med: toStr(row["UMed"]),
    ffarma: toStr(row["Ffarma"]),
    covid: toStr(row["Covid"]),
  }
}

/** Mapea las columnas devueltas por mipres.fn_reporte_facturas_mipres_por_facturas a FacturacionPlantillaRow. */
function mapGiroDbRow(row: Record<string, unknown>): Record<string, string> {
  // id_datos_facturado combina iddatosfacturado_mipres / id_auxiliar_facturacion, igual que
  // el reporte Excel por rango de fechas (generarExcelReporteFacturasMipres en api-dusakawi).
  const idDatosFacturado = row["iddatosfacturado_mipres"] ?? row["id_auxiliar_facturacion"]
  return {
    tipo_registro: toStr(row["tipo_registro"]),
    consecutivo_registro: toStr(row["consecutivo_registro"]),
    tipo_doc_ips: toStr(row["tipo_documento_ips"]),
    nit_ips: toStr(row["numero_identificacion_ips"]),
    nombre_ips: toStr(row["nombre_ips"]),
    digito_verificacion: toStr(row["digito_verificacion"]),
    numero_prescripcion: toStr(row["numero_prescripcion_mipres"]),
    id_suministro: toStr(row["idsuministro_mipres"]),
    est_suministro: toStr(row["estsuministro_mipres"]),
    id_datos_facturado: toStr(idDatosFacturado),
    est_datos_facturado: toStr(row["estdatosfacturado_mipres"]),
    cufe: toStr(row["cufe"]),
    fecha_emision_factura: toDateInputStr(row["fecha_emision_factura"]),
    numero: toStr(row["numero"]),
    prefijo_factura: toStr(row["prefijo_factura"]),
    numero_factura: toStr(row["numero_factura_solo"]),
    // Solo viene presente cuando el backend resolvió la fila a partir de un número de
    // recepción (endpoint /por-numero-recepcion); en el resto de los casos queda "".
    numero_recepcion: toStr(row["numero_recepcion"]),
    valor_total_factura: toStr(row["valor_total_factura"]),
    valor_pagado: toStr(row["valor_pagado"]),
  }
}

// Encabezados aceptados para la columna de número de factura, normalizados (sin acentos,
// minúsculas, espacios colapsados, guiones bajos tratados como espacio).
const FACTURA_HEADER_ALIASES = new Set(["numero factura", "factura", "numero de la factura"])

const COMBINING_DIACRITICS_RE = new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g")

function normalizeFacturaHeader(s: string): string {
  return s
    .normalize("NFD").replace(COMBINING_DIACRITICS_RE, "")
    .replace(/[_\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()
}

export function findFacturaColumnIndex(headerRow: unknown[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    if (FACTURA_HEADER_ALIASES.has(normalizeFacturaHeader(String(headerRow[i] ?? "")))) return i
  }
  return -1
}

// Encabezados aceptados para la columna de número de recepción RIPS (Estructura de Giro),
// misma lógica de normalización que número de factura.
const NUMERO_RECEPCION_HEADER_ALIASES = new Set(["numero recepcion", "recepcion", "numero de recepcion", "recepcion rips" , "Numero recepcion"])

export function findNumeroRecepcionColumnIndex(headerRow: unknown[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    if (NUMERO_RECEPCION_HEADER_ALIASES.has(normalizeFacturaHeader(String(headerRow[i] ?? "")))) return i
  }
  return -1
}

// Encabezados aceptados para la columna de id_facturacion (Reserva Técnica), ya normalizados
// (normalizeFacturaHeader convierte "_" y acentos antes de comparar, por eso acá van sin
// guion bajo y sin tilde: "id_facturacion" / "ID Facturación" terminan siendo "id facturacion").
const ID_FACTURACION_HEADER_ALIASES = new Set(["id facturacion", "idfacturacion", "id de facturacion",])

export function findIdFacturacionColumnIndex(headerRow: unknown[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    if (ID_FACTURACION_HEADER_ALIASES.has(normalizeFacturaHeader(String(headerRow[i] ?? "")))) return i
  }
  return -1
}

// Encabezados aceptados para la columna de id_suministro (Reserva Técnica), misma lógica
// de normalización que id_facturacion.
const ID_SUMINISTRO_HEADER_ALIASES = new Set(["id suministro", "idsuministro"])

export function findIdSuministroColumnIndex(headerRow: unknown[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    if (ID_SUMINISTRO_HEADER_ALIASES.has(normalizeFacturaHeader(String(headerRow[i] ?? "")))) return i
  }
  return -1
}

export const GIRO_CONFIG: PlantillaTipoConfig = {
  label: "Estructura de Giro",
  columns: GIRO_COLUMNS,
  fillableCols: new Set(["tipo_doc_ips", "nit_ips", "nombre_ips", "digito_verificacion"]),
  correlativoKey: "consecutivo_registro",
  getRows: () => getPlantillaRows() as unknown as PlantillaRow[],
  saveRows: (rows) => savePlantillaRows(rows as unknown as FacturacionPlantillaRow[]),
  clearRows: clearPlantillaRows,
  storageEvent: PLANTILLA_STORAGE_EVENT,
  makeEmptyRow: (overrides = {}) => emptyGiroRow(overrides),
  fileNamePrefix: "plantilla_facturacion",
  exportExcelEndpoint: "/api/reportes/facturas-mipres/plantilla/excel",
  // Dos formas de importar: por número de factura (la de siempre) o por número de recepción
  // RIPS (una recepción agrupa varias facturas del mismo lote de radicación).
  importarPor: [
    {
      key: "factura",
      label: "Número de factura",
      endpoint: "/api/reportes/facturas-mipres/por-facturas",
      mapRow: mapGiroDbRow,
      bodyKey: "facturas",
      findColumnIndex: findFacturaColumnIndex,
      columnNotFoundMessage: "No se encontró una columna de número de factura (numero_factura, factura, Número de la factura)",
      helpText: "Excel con una columna de números de factura (numero_factura, factura, Número de la factura): genera el reporte para esas facturas",
    },
    {
      key: "numero_recepcion",
      label: "Número de recepción",
      endpoint: "/api/reportes/facturas-mipres/por-numero-recepcion",
      mapRow: mapGiroDbRow,
      bodyKey: "numeros_recepcion",
      findColumnIndex: findNumeroRecepcionColumnIndex,
      columnNotFoundMessage: "No se encontró una columna de número de recepción en el archivo",
      helpText: "Excel con una columna de número de recepción: resuelve las facturas de esa recepción y genera el reporte para ellas",
    },
  ],
}

export const RESERVA_CONFIG: PlantillaTipoConfig = {
  label: "Reserva Técnica",
  columns: RESERVA_COLUMNS,
  fillableCols: new Set(["tipo_id_prestador", "id_prestador", "nombre_prestador", "plan_salud"]),
  correlativoKey: "consecutivo",
  getRows: () => getPlantillaReservaRows() as unknown as PlantillaRow[],
  saveRows: (rows) => savePlantillaReservaRows(rows as unknown as FacturacionPlantillaReservaRow[]),
  clearRows: clearPlantillaReservaRows,
  storageEvent: PLANTILLA_RESERVA_STORAGE_EVENT,
  makeEmptyRow: (overrides = {}) => emptyReservaRow(overrides),
  fileNamePrefix: "plantilla_reserva_tecnica",
  exportExcelEndpoint: "/api/reportes/reserva-tecnica/plantilla/excel",
  // Dos formas de importar porque, según en qué etapa esté la entrega, el usuario puede
  // tener solo id_suministro (se asigna primero) o ya tener id_facturacion (llega después,
  // cuando entra a la cola de reporte de facturación) — nunca número de factura, ese dato
  // no existe todavía en Reserva Técnica.
  importarPor: [
    {
      key: "id_suministro",
      label: "ID de Suministro",
      endpoint: "/api/reportes/reserva-tecnica/por-id-suministro",
      mapRow: mapReservaDbRow,
      bodyKey: "ids_suministro",
      findColumnIndex: findIdSuministroColumnIndex,
      columnNotFoundMessage: "No se encontró una columna de id_suministro en el archivo",
      helpText: "Excel con una columna id_suministro: genera el reporte de Reserva Técnica para esos id_suministro",
    },
    {
      key: "id_facturacion",
      label: "ID de Facturación",
      endpoint: "/api/reportes/reserva-tecnica/por-id-facturacion",
      mapRow: mapReservaDbRow,
      bodyKey: "ids_facturacion",
      findColumnIndex: findIdFacturacionColumnIndex,
      columnNotFoundMessage: "No se encontró una columna de id_facturacion en el archivo",
      helpText: "Excel con una columna id_facturacion: genera el reporte de Reserva Técnica para esos id_facturacion",
    },
  ],
}

export function parseCurrency(value: string): number {
  const n = parseFloat(String(value || "").replace(/[^\d.-]/g, ""))
  return isNaN(n) ? 0 : n
}

function fmtCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtNumber(amount: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(amount)
}

export function fmtColNumber(col: ColDef, amount: number): string {
  return col.currency ? fmtCOP(amount) : fmtNumber(amount)
}

// Filas por página: con cientos/miles de registros importados, renderizar toda la tabla
// de una vez degrada la vista (y es la causa raíz de los keys duplicados reportados bajo carga).
export const PAGE_SIZE = 100
