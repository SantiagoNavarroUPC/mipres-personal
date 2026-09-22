// Modelo de Productos para Soporte Nutricional

export interface ProductoNutricional {
  ConOrdenPN: number // Consecutivo Orden Productos Nutricionales
  DXEnfHuer: number // Diagnóstico Enfermedad Huérfana
  DXVIH: number // Diagnóstico VIH
  DXCaPal: number // Diagnóstico Enfermedad Cancer en estado paliativo
  DXEnfRCEV: number // Diagnóstico Enfermedad renal
  DxDesPro: number // Diagnóstico Proteicocalorica
  TippProNut: number // Tipo de Producto Nutricional (ver tabla de tipos)
  DescProdNutr: string // Descripción del Producto Nutricional
  CodForma:string // Código Forma
  CodViaAdmon: string // Código Vía de Administración
  JustNoPB: string // Justificación No UPC
  Dosis: number // Dosis Número
  DosisUM: string // Dosis Unidad Medida
  NoFAdmon: number // Número frecuencia administración
  CodFreAdmon: number // Código Frecuencia de Administración
  IndEsp:string // Indicaciones Especiales
  CanTrat: string // Cantidad Tratamiento
  DurTrat: number // Duración Tratamiento
  CantTotalF: number // Cantidad Total Formulada
  UFCantTotalF: string // Unidad Formulación Cantidad Total
  IndRec:string // Indicador de Recomendación
  NoPrescAso:string // Número de Prescripción Asociada
  EstJM: number // Estado Producto Nutricional (2: Anulado, 4: Activo)
}
