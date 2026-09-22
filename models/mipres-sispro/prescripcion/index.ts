// Re-exportar todas las interfaces y constantes del modelo de Prescripción

export type { Prescripcion, PrescripcionResponse } from "./prescripcion"
export type { Medicamento, PrincipioActivo, IndicacionUNIRS } from "./medicamento"
export type { Procedimiento } from "./procedimiento"
export type { DispositivoMedico } from "./dispositivo"
export type { ProductoNutricional } from "./producto-nutricional"
export type { ServicioComplementario } from "./servicio-complementario"
export type { NovedadPrescripcion, NovedadPrescripcionResponse } from "./novedad"

export {
  TIPOS_DOCUMENTO,
  AMBITOS_ATENCION,
  ESTADOS_PRESCRIPCION,
  TIPOS_MEDICAMENTO,
  UNIDADES_TIEMPO,
  TIPOS_NOVEDAD,
} from "../../constants"
