// Modelo de Dispositivos Médicos

export interface DispositivoMedico {
  ConOrdenDM: number // Consecutivo Orden Dispositivos
  CodDisp: string // Código Dispositivo Médico
  CantForm: string // Cantidad
  CadaFreUso: string // Cada Frecuencia de Uso
  CodFreUso : number // Código Frecuencia de Uso (1-7)
  Cant :string // Cantidad Dispositivo
  CodPerDurTrat : number // Código Periodicidad Duración Tratamiento (1-6)
  CantTotal:string // Cantidad Total Formulada
  JustNoPBS: string // Justificación No UPC
  CantDM: number // Cantidad Dispositivo
  IndRec: string // Indicaciones y recomendaciones
  EstJM: number // Estado
}
