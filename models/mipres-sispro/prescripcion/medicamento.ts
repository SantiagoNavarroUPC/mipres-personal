// Modelo de Medicamentos

export interface Medicamento {
  ConOrden: number // Consecutivo Orden Medicamentos
  TipoMed: number // Tipo de Medicamento (1: Medicamento, 2: Vital No Disponible, 3: Preparación Magistral, 7: UNIRS, 9: Urgencia Médica)
  DescMedPrinAct: string // Descripción medicamento principios activos
  CodFF: string // Código Forma Farmacéutica
  CodVA: string // Código Vía de Administración
  JustNoPBS: string // Justificación No UPC
  Dosis: number // Dosis Número
  DosisUM: string // Dosis Unidad Medida
  NoFAdmon: string // Número frecuencia administración
  CodFreAdmon: number // Código Frecuencia de Administración (1-7)
  IndEsp: number // Indicaciones Especiales (1-10)
  CanTrat: string // Cantidad Tratamiento
  DurTrat: string // Duración Tratamiento (1-6)
  CantTotalF: number // Cantidad Total Formulada
  UFCantTotalF: string // Unidad Formulación Cantidad Total
  IndRec: string // Indicaciones y recomendaciones
  EstJM: number // Estado Medicamento (2: Anulado, 4: Activo)
  
  // Principios Activos asociados
  principiosActivos?: PrincipioActivo[]
  indicacionesUNIRS?: IndicacionUNIRS[]
}

// Principios Activos de Medicamentos
export interface PrincipioActivo {
  CodPriAct: string // Código Principio Activo
  ConcCant: number // Concentración Cantidad
  UMConcCant: string // Unidad Medida Concentración Cantidad
  CantCont: number | null // Cantidad Contenido
  UMCantCont: string | null // Unidad Medida Cantidad Contenido
}

// Indicaciones UNIRS
export interface IndicacionUNIRS {
  CodIndUNIRS: string // Código Indicación UNIRS
}
