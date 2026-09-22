export interface ServicioComplementario {
  ConOrden: number;        // Consecutivo Servicio Complementario
  TipTut: string;          // Tipo de Tutela (1: Taxativo, 2: Integral)
  TipoPrest: string;       // Tipo de Prestación
  CodSerComp: string;      // Código Servicio Complementario
  DescSerComp: string;     // Descripcion Servicio Complementario
  CanForm: string;         // Numero de cantidad formulada
  CadaFreUso: string // Cada Frecuencia de Uso
  CodFreUso: number // Código Frecuencia de Uso (1-7)
  Cant: string;           // Cantidad Servicio Complementario
  CodPerDurTrat: number // Código Periodicidad Duración Tratamiento (1-6)
  CantTotal: string // Cantidad Total Formulada
  JustNoPBS: string // Justificación No UPC
  IndRec: string // Indicaciones y recomendaciones
}