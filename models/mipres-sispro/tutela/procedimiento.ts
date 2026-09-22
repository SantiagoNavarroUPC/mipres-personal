export interface Procedimiento {
  ConOrden: string // Consecutivo Orden Procedimientos
  TipTut: number // Tipo de Tutela (1: taxativo, 2: Integral)
  TipoPrest: number // Tipo de Prestación (1: Unica 2:Sucesiva)
  TipoPro: number // Tipo de Medicamento (1: PBs, 2: No PBS)
  CodCUPS: string // Código CUPS
  NomProc: string // Nombre del Procedimiento
  CanForm: string // Cantidad Formulada
  CadaFreUso: string // Cada Frecuencia de Uso
  CodFreUso: number // Código Frecuencia de Uso (1-8)
  Cant: string // Cantidad Procedimiento
  CodPerDurTrat: number // Código Periodicidad Duración Tratamiento (1-6)
  CantTotal: string // Cantidad Total Formulada
  JustNoPBS: string // Justificación No UPC
  IndRec: string // Indicaciones y recomendaciones
  Objetivo: string // Objetivo del Procedimiento
}
