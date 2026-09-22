import type { MipresCredentials } from "@/models/credentials.model"
import type {
  Facturacion,
  DatosFacturado,
  RegistrarDatosFacturadoRequest,
  RegistrarDatosFacturadoResponse,
} from "@/models/mipres-sispro/facturacion/facturacion"
import type { Suministro } from "@/models/mipres-sispro/suministro/suministro"
import {
  fetchFacturacionPorFecha,
  fetchFacturacionPorPrescripcion,
  fetchDatosFacturadosPorPrescripcion,
  putDatosFacturados,
  putAnularDatosFacturado,
  type TipoConsultaFacturacion,
} from "@/requests/mipres-sispro/facturacion.request"
import { consultarSuministroPorPrescripcion } from "@/controllers/mipres-controller/suministro-controller/suministro.controller"
import {
  generarRangoFechas,
  ejecutarConConcurrencia,
  validarRangoFechas,
} from "@/controllers/mipres-controller/prescripcion-controller/prescripcion-procesos.controller"

function getTokenAcceso(credentials: MipresCredentials): string {
  return (
    credentials.tokenAcceso ||
    credentials.tokenAccesoSubsidiado ||
    credentials.tokenAccesoContributivo ||
    ""
  )
}

function extractFacturaciones(raw: unknown): Facturacion[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as Facturacion[]
  const obj = raw as any
  if (Array.isArray(obj.root)) return obj.root as Facturacion[]
  if (Array.isArray(obj.facturaciones)) return obj.facturaciones as Facturacion[]
  return [raw as Facturacion]
}

export async function consultarFacturacionPorFecha(
  credentials: MipresCredentials,
  fecha: string
): Promise<{ success: boolean; data?: Facturacion[]; error?: string }> {
  const token = getTokenAcceso(credentials)
  if (!credentials.nit || !token) {
    return { success: false, error: "NIT y token de acceso son requeridos" }
  }

  const result = await fetchFacturacionPorFecha(credentials.nit, token, fecha)
  if (!result.success) return { success: false, error: result.error }

  return { success: true, data: extractFacturaciones(result.data) }
}

export async function consultarFacturacionPorPrescripcion(
  credentials: MipresCredentials,
  noPrescripcion: string
): Promise<{ success: boolean; data?: Facturacion[]; error?: string }> {
  const token = getTokenAcceso(credentials)
  if (!credentials.nit || !token) {
    return { success: false, error: "NIT y token de acceso son requeridos" }
  }

  const result = await fetchFacturacionPorPrescripcion(credentials.nit, token, noPrescripcion)
  if (!result.success) return { success: false, error: result.error }

  return { success: true, data: extractFacturaciones(result.data) }
}

export async function consultarFacturacionPorRango(
  credentials: MipresCredentials,
  fechaInicio: string,
  fechaFin: string
): Promise<{ success: boolean; data?: Facturacion[]; error?: string }> {
  const token = getTokenAcceso(credentials)
  if (!credentials.nit || !token) {
    return { success: false, error: "NIT y token de acceso son requeridos" }
  }

  const validacion = validarRangoFechas(fechaInicio, fechaFin)
  if (!validacion.valid) return { success: false, error: validacion.error }

  const fechas = generarRangoFechas(fechaInicio, fechaFin)
  const tareas = fechas.map((fecha) => () => consultarFacturacionPorFecha(credentials, fecha))
  const resultados = await ejecutarConConcurrencia(tareas, 10)

  let allData: Facturacion[] = []
  for (const r of resultados) {
    if (r.success && r.data) allData = [...allData, ...r.data]
  }

  return { success: true, data: allData }
}

export interface SuministroInfo {
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

export async function consultarDetalleFacturacion(
  credentials: MipresCredentials,
  noPrescripcion: string,
  conTec: number,
  noEntrega: number,
  tipoTec: string
): Promise<{
  success: boolean
  datosFacturado: DatosFacturado | null
  suministroInfo: SuministroInfo | null
  error?: string
}> {
  const token = getTokenAcceso(credentials)
  if (!credentials.nit || !token) {
    return { success: false, datosFacturado: null, suministroInfo: null, error: "NIT y token son requeridos" }
  }

  const [datosRes, suministroRes] = await Promise.all([
    fetchDatosFacturadosPorPrescripcion(credentials.nit, token, noPrescripcion),
    consultarSuministroPorPrescripcion(credentials, noPrescripcion),
  ])

  const datosFacturado: DatosFacturado | null = (() => {
    if (!datosRes.success || !datosRes.data) return null
    const arr: DatosFacturado[] = Array.isArray(datosRes.data) ? datosRes.data : [datosRes.data as DatosFacturado]
    return arr.find((d) => d.ConTec === conTec && d.NoEntrega === noEntrega && d.EstDatosFacturado !== 0) ?? null
  })()

  const suministroInfo: SuministroInfo | null = (() => {
    if (!suministroRes.success || !suministroRes.data) return null
    const tipoTecNormalizado = String(tipoTec ?? "").trim().toUpperCase()
    const match = (suministroRes.data as Suministro[]).find(
      (s) =>
        String(s.NoPrescripcionAsociada ?? "").trim() === noPrescripcion.trim() &&
        Number(s.ConTecAsociada) === conTec &&
        String(s.TipoTec ?? "").trim().toUpperCase() === tipoTecNormalizado &&
        Number(s.NoEntrega) === noEntrega &&
        !s.FecAnulacion
    )
    if (!match) return null
    return {
      ID: match.ID,
      IDSuministro: match.IDSuministro,
      EstSuministro: match.EstSuministro,
      ValorEntregado: match.ValorEntregado,
      UltEntrega: match.UltEntrega,
      EntregaCompleta: match.EntregaCompleta,
      NoLote: match.NoLote,
      CodTecEntregado: match.CodTecEntregado,
      FecAnulacion: match.FecAnulacion,
    }
  })()

  return { success: true, datosFacturado, suministroInfo }
}

export async function registrarDatosFacturado(
  credentials: MipresCredentials,
  id: number
): Promise<{ success: boolean; data?: RegistrarDatosFacturadoResponse; error?: string }> {
  const token = getTokenAcceso(credentials)
  if (!credentials.nit || !token) {
    return { success: false, error: "NIT y token de acceso son requeridos" }
  }

  const payload: RegistrarDatosFacturadoRequest = {
    ID: id,
    CompAdm: 3,
    CodCompAdm: "",
    CodHom: "",
    UniCompAdm: "",
    UniDispHom: "",
    ValUnMiCon: "",
    CantTotEnt: "",
    ValTotCompAdm: "",
    ValTotHom: "",
  }

  return putDatosFacturados(credentials.nit, token, payload)
}

export async function anularDatosFacturado(
  credentials: MipresCredentials,
  idDatosFacturado: number
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const token = getTokenAcceso(credentials)
  if (!credentials.nit || !token) {
    return { success: false, error: "NIT y token de acceso son requeridos" }
  }

  return putAnularDatosFacturado(credentials.nit, token, idDatosFacturado)
}

export async function consultarFacturacion(
  credentials: MipresCredentials,
  tipo: TipoConsultaFacturacion,
  params: { fecha?: string; fechaInicio?: string; fechaFin?: string; noPrescripcion?: string }
): Promise<{ success: boolean; data?: Facturacion[]; error?: string }> {
  switch (tipo) {
    case "fecha":
      if (!params.fecha) return { success: false, error: "Fecha es requerida" }
      return consultarFacturacionPorFecha(credentials, params.fecha)

    case "prescripcion":
      if (!params.noPrescripcion) return { success: false, error: "Número de prescripción es requerido" }
      return consultarFacturacionPorPrescripcion(credentials, params.noPrescripcion)

    case "rango":
      if (!params.fechaInicio || !params.fechaFin) return { success: false, error: "Fechas inicio y fin son requeridas" }
      return consultarFacturacionPorRango(credentials, params.fechaInicio, params.fechaFin)

    default:
      return { success: false, error: "Tipo de consulta no válido" }
  }
}
