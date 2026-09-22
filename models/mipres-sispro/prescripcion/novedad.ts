export interface NovedadPrescripcion {
  TipoNov: number // Tipo de Novedad (1-6)
  NoPrescripcion: string // Número de Prescripción (20 caracteres)
  NoPrescripcionF: string // Número de Prescripción Final (20 caracteres)
  FNov: string // Fecha de la Novedad (AAAA-MM-DD)
}

export interface NovedadPrescripcionResponse {
  novedades: NovedadPrescripcion[]
  total: number
  fecha: string
}
