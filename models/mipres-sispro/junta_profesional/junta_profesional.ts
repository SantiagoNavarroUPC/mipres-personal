export interface JuntaProfesional {
  NoPrescripcion: string; // Número de Prescripción
  FPrescripcion: string; // Fecha de la Prescripción (ISO date string)
  TipoTecnologia: string; // Tipo de Tecnología
  Consecutivo: number; // Consecutivo Tecnología
  EstJM: number; // Estado de la Junta de Profesionales
  CodEntProc: string | null; // Código de Habilitación de la IPS
  Observaciones: string | null; // Observaciones
  JustificacionTecnica: string | null; // Justificación médica, técnica y de pertinencia
  Modalidad: string | null; // Modalidad
  NoActa: string | null; // Número Acta
  FechaActa: string | null; // Fecha de Acta (ISO date string)
  FProceso: string | null; // Fecha del Proceso (ISO date string)
  TipoIDPaciente: string; // Tipo de Documento de Identificación del Paciente
  NroIDPaciente: string; // Número de Identificación del Paciente
  CodEntJM: string; // Código de Habilitación de la entidad donde se encuentra la Junta de Profesionales
}