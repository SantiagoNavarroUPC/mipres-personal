import { DispositivoMedico } from "./dispositivo-medico"
import { Medicamento } from "./medicamento"
import { Procedimiento } from "./procedimiento"
import { ProductoNutricional } from "./producto-nutricional"
import { ServicioComplementario } from "./servicio-complementario"



export interface Tutela {
  NoTutela: string // Número de Tutela (20 caracteres)
  FTutela: string // Fecha de la Tutela (AAAA-MM-DD)
  HTutela: string // Hora de la Tutela (HH:MM:SS)
  CodEPS: string // Código de Habilitación de la Eps (12 caracteres)
  TipoIDEPS: string // Tipo de identificación de la Eps (NI)
  NroIDEPS: string // Número de identificación de la Eps
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
  NroFallo: string // Número de Fallo
  FFalloTutela: string // Fecha del Fallo de la Tutela (AAAA-MM-DD)
  F1Instan:string // Fecha de la Primera Instancia (AAAA-MM-DD)
  F2Instan:string // Fecha de la Segunda Instancia (AAAA-MM-DD)
  FCorte:string // Fecha de la Corte Corte
  FDesacato:string // Fecha de Desacato
  EnfHuerfana: number | null // Tiene Enfermedad Huérfana
  CodEnfHuerfana: string | null // Código Enfermedad Huérfana
  EnfHuerfanaDX: number | null // Enfermedad huérfana es diagnóstico principal
  CodDxPpal: string // Código Diagnóstico Principal (CIE10)
  CodDxRel1: string | null // Código Diagnóstico Relacionado 1
  CodDxRel2: string | null // Código Diagnóstico Relacionado 2
  AclFalloTut: string // Aclaración del Fallo de la Tutela
  CodDxMotS1: string | null // Código Diagnóstico Motivo de Consulta 1
  CodDxMotS2: string | null // Código Diagnóstico Motivo de Consulta 2
  CodDxMotS3: string | null // Código Diagnóstico Motivo de Consulta 3
  JustifMed: string // Justificación Médica
  CriDef1CC: string | null // Criterio de Definición 1 (CC, CD, CI, CR)
  CriDef3CC: string | null // Criterio de Definición 3 (CC, CD, CI, CR)
  CriDef4CC: string | null // Criterio de Definición 4 (CC, CD, CI, CR)
  TipoIDMadrePaciente: string | null // Tipo de Documento de la madre
  NroIDMadrePaciente: string | null // Número de Identificación de la madre
  EstTut: number // Estado Tutela (1:modificada, 4: Activa)
  TipoTransc: number | null // Tipo de Transcripción (1-6)

  fallosTutelasAdicionales?: FalloTutelaAdicional[]
  medicamentos?: Medicamento[]
  procedimientos?: Procedimiento[]
  dispositivos?: DispositivoMedico[]
  productosNutricionales?: ProductoNutricional[]
  serviciosComplementarios?: ServicioComplementario[]

  // Regimen por token de consulta
  tipoRegimen?: "Subsidiado" | "Contributivo"
  // Direccionamiento
  direccionada?: boolean
}

export interface FalloTutelaAdicional {
  FFalloAdic: string // Fecha del Fallo Adicional (AAAA-MM-DD)
  NroFallAdic: string // Número de Fallo Adicional
}