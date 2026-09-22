export interface Medicamento {
  ConOrden: number // Consecutivo Orden Medicamentos
  TipoMed: number // Tipo de Medicamento (1: Medicamento, 2: Vital No Disponible, 3: Preparación Magistral, 7: UNIRS, 9: Urgencia Médica)
  TipTutela: number // Tipo de Tutela (1: taxativo, 2: Integral)
  TipoPrest: number // Tipo de Prestación (1: Unica 2:Sucesiva)
  TipMed:number // 1.PBS, 2.No PBS
  DscMedPA: string // Descripción medicamento principios activos
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
  
  // Principios Activos asociados
  principiosActivos?: PrincipioActivo[]
  indicacionesUNIRS?: IndicacionUNIRS[]
}
export interface PrincipioActivo {
  CodPriAct: string // Código Principio Activo
  ConcCant: number // Concentración Cantidad
  UMedConc: string // Unidad Medida Concentración Cantidad
  CantCont: number | null // Cantidad Contenido
  UMedCantCont: string | null // Unidad Medida Cantidad Contenido
}

// Indicaciones UNIRS
export interface IndicacionUNIRS {
  CodIndicacion: string // Código Indicación UNIRS
}
