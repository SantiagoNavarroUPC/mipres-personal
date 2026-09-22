
export interface DispositivoMedico {
  ConOrden: number;        // Consecutivo Dispositivo
  TipTut: string;          // Tipo de Tutela
  TipoPrest: string;       // Tipo de Prestación
  CodDisp: string;         // Código Dispositivo
  CanForm: number;         // Cantidad Formulada
  CadaFreUso: number;      // Frecuencia de uso
  CodFreUso: string;       // Código Frecuencia de Uso
  Cant: number;            // Cantidad Duración Tratamiento
  CodPerDurTrat: string;   // Código Período Duración Tratamiento
  CantTotal: number;       // Cantidad Total
  JustNoPBS: string;       // Justificación No UPC (No PBS)
  IndRec: string;          // Indicaciones o Recomendaciones para el paciente
  Objetivo: string;        // Objetivo
}
