// Modelo de Prescripción MIPRES - Datos Generales
// Basado en Anexo Técnico Disposición de Información de Prescripción MIPRES V2.4 - Versión 6.1

import type { Medicamento } from "./medicamento"
import type { Procedimiento } from "./procedimiento"
import type { DispositivoMedico } from "./dispositivo"
import type { ProductoNutricional } from "./producto-nutricional"
import type { ServicioComplementario } from "./servicio-complementario"

export interface Prescripcion {
  NoPrescripcion: string // Número de Prescripción (20 caracteres)
  FPrescripcion: string // Fecha de la Prescripción (AAAA-MM-DD)
  HPrescripcion: string // Hora de la Prescripción (HH:MM:SS)
  CodHabIPS: string // Código de Habilitación de la IPS (12 caracteres)
  TipoIDIPS: string // Tipo de identificación de la IPS (NI)
  NroIDIPS: string // Número de identificación de la IPS
  CodDANEMunIPS: string // Código DANE Municipio IPS
  DirSedeIPS: string // Dirección Sede IPS
  TelSedeIPS: string // Teléfono Sede IPS
  TipoIDProf: string // Tipo de Documento del Profesional (CC, CE, PE, PT)
  NumIDProf: string // Número de Identificación del Profesional
  PNProfS: string // Primer Nombre del Profesional
  SNProfS: string // Segundo Nombre del Profesional
  PAProfS: string // Primer Apellido del Profesional
  SAProfS: string // Segundo Apellido del Profesional
  RegProfS: string // Registro Profesional
  TipoIDPaciente: string // Tipo de Documento del Paciente (CC, RC, TI, CE, PA, NV, CD, SC, PR, PE, AS, MS, PT)
  NroIDPaciente: string // Número de Identificación del Paciente
  PNPaciente: string // Primer Nombre del Paciente
  SNPaciente: string // Segundo Nombre del Paciente
  PAPaciente: string // Primer Apellido del Paciente
  SAPaciente: string // Segundo Apellido del Paciente
  CodAmbAte: string // Código Ámbito de Atención (11, 12, 21, 22, 30)
  RefAmbAte: number // Referencia o contrareferencia (0: NO, 1: SI)
  PacCovid19: number | null // Caso sospechoso o confirmado COVID19
  EnfHuerfana: number | null // Tiene Enfermedad Huérfana
  CodEnfHuerfana: string | null // Código Enfermedad Huérfana
  EnfHuerfanaDX: number | null // Enfermedad huérfana es diagnóstico principal
  CodDxPpal: string // Código Diagnóstico Principal (CIE10)
  CodDxRel1: string | null // Código Diagnóstico Relacionado 1
  CodDxRel2: string | null // Código Diagnóstico Relacionado 2
  SopNutricional: number | null // Requiere soporte nutricional (obsoleto)
  CodEPS: string // Código de la EPS
  TipoIDMadrePaciente: string | null // Tipo de Documento de la madre
  NroIDMadrePaciente: string | null // Número de Identificación de la madre
  TipoTransc: number | null // Tipo de Transcripción (1-6)
  TipoIDDonanteVivo: string | null // Tipo de Documento del Donante Vivo
  NroIDDonanteVivo: string | null // Número de Identificación del Donante Vivo
  EstPres: number // Estado Prescripción (2: Anulado, 4: Activo)
  Exclusion: number // Exclusión (0: NO, 1: SI)
  
  // Listas de tecnologías asociadas
  medicamentos?: Medicamento[]
  procedimientos?: Procedimiento[]
  dispositivos?: DispositivoMedico[]
  productosNutricionales?: ProductoNutricional[]
  serviciosComplementarios?: ServicioComplementario[]

  // Estado de direccionamiento (calculado al consultar prescripciones)
  direccionada?: boolean

  // Nombre de la IPS solicitante / prescriptora, resuelto antes de llegar a la vista
  ipsSolicitanteNombre?: string

  // Regimen por token de consulta
  tipoRegimen?: "Subsidiado" | "Contributivo"
}

// Tipo para respuesta de API
export interface PrescripcionResponse {
  prescripciones: Prescripcion[]
  total: number
  fecha: string
}
