export interface ProductoNutricional {
  ConOrden: number;        // Consecutivo Productos Nutricionales
  TipTut: string;          // Tipo de Tutela (1: Taxativo, 2: Integral)
  TipoPrest: string;       // Tipo de Prestación
  TippProNut: string;      // Tipo Producto Nutricional
  DescProdNutr: string;    // Producto Nutricional
  CodForma: string;        // Código Forma
  CodViaAdmon: string;     // Código Vía o Forma de Administración
  JustNoPBS?: string;      // Justificación No UPC (opcional según tabla)
  Dosis?: number;          // Dosis Número
  DosisUM?: string;        // Dosis Unidad Medida
  NoFAdmon: number;        // Número Frecuencia Administración
  CodFreAdmon: string;     // Código Frecuencia de Administración
  IndEsp: string;          // Indicaciones Especiales
  CanTrat: number;         // Cantidad Tratamiento
  DurTrat: number // Duración Tratamiento
  CantTotalF: number // Cantidad Total Formulada
  UFCantTotalF: string // Unidad Formulación Cantidad Total
  IndRec:string // Indicador de Recomendación
}
