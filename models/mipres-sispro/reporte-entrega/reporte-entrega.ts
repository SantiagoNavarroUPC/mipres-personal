export interface ReporteEntrega {
  ID: number | string
  IDReporteEntrega: number
  NoPrescripcion: string
  TipoTec: string
  ConTec: number
  TipoIDPaciente: string
  NoIDPaciente: string
  NoEntrega: number
  EstadoEntrega: number
  CausaNoEntrega: string | null
  ValorEntregado: number
  CodTecEntregado: string
  CantTotEntregada: string
  NoLote: string | null
  FecEntrega: string
  FecRepEntrega: string
  EstRepEntrega: number
  FecAnulacion: string | null
  tipoRegimen?: string
}
