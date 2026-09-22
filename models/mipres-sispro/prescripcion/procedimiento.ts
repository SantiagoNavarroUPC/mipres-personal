// Modelo de Procedimientos

export interface Procedimiento {
  ConOrdenPro: string // Consecutivo Orden Procedimientos
  CodCUPS: string // Código CUPS
  CanForm: string // Cantidad Formulada
  CadaFreUso: string // Cada Frecuencia de Uso
  CodFreUso: number // Código Frecuencia de Uso (1-8)
  Cant: string // Cantidad Procedimiento
  CantTotal: string // Cantidad Total Formulada
  CodPerDurTrat: number // Código Periodicidad Duración Tratamiento (1-6)
  DescPro: string // Descripción del Procedimiento
  JustNoPBS: string // Justificación No UPC
  IndRec: string // Indicaciones y recomendaciones
  EstJM: number // Estado
}
