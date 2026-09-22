// Constantes y enumeraciones para el modelo de Prescripción

// Tipos de documento permitidos
export const TIPOS_DOCUMENTO = {
  CC: "Cédula de Ciudadanía",
  RC: "Registro Civil",
  TI: "Tarjeta de Identidad",
  CE: "Cédula de Extranjería",
  PA: "Pasaporte",
  NV: "Nacido Vivo",
  CD: "Carné Diplomático",
  SC: "Salvoconducto de permanencia",
  PR: "Pasaporte de la ONU",
  PE: "Permiso Especial de Permanencia",
  AS: "Adulto sin Identificación",
  MS: "Menor sin Identificación",
  PT: "Permiso por Protección Temporal",
} as const

// Ámbitos de atención
export const AMBITOS_ATENCION = {
  "11": "Ambulatorio – Priorizado",
  "12": "Ambulatorio – No Priorizado",
  "21": "Hospitalario – Domiciliario",
  "22": "Hospitalario – Internación",
  "30": "Urgencias",
} as const

// Iniciales de ámbitos de atención
export const INICIALES_AMBITO = {
  "11": "AP",
  "12": "ANP",
  "21": "HD",
  "22": "HI",
  "30": "U",
} as const

// Estados de prescripción
export const ESTADOS_PRESCRIPCION = {
  2: "Anulado",
  4: "Activo",
} as const

// Tipos de medicamento
export const TIPOS_MEDICAMENTO = {
  1: "Medicamento",
  2: "Vital No Disponible",
  3: "Preparación Magistral",
  7: "UNIRS",
  9: "Urgencia Médica (Solo Transcripción)",
} as const

// Frecuencias de administración
export const UNIDADES_TIEMPO = {
  1: "Minuto(s)",
  2: "Hora(s)",
  3: "Día(s)",
  4: "Semana(s)",
  5: "Mes(es)",
  6: "Año",
  8: "Unica",
} as const
// Tipos de novedades
export const TIPOS_NOVEDAD = {
  1: "Modificación (Valor Permitido Obsoleto)",
  2: "Anulación",
  3: "Transcripción",
} as const

export const ESTADOS_TECNOLOGIAS = {
  1: "No requiere junta de profesionales",
  2: "Requiere junta de profesionales y pendiente evaluación",
  3: "Evaluada por la junta de profesionales y fue aprobada",
  4: "Evaluada por la junta de profesionales y no fue aprobada",
} as const;

export const CAUSAS_NO_ENTREGAS = {
  1: "Misma solicitud en otra prescripción",
  2: "Existe evidencia de interacción o reacción medicamentosa",
  3: "La indicación de uso del medicamento no está aprobada por el INVIMA",
  4:"Presentacion no Fraccionable",
  5: "Suministro por tutela",
  6: "Paciente corresponde a otra EPS",
  7: "No fue posible contactar al paciente",
  8: "Paciente fallecido",
  9: "Paciente se niega a recibir el suministro",
  10: "No se han agotado los topes o su prescripción corresponde a los condicionamientos de cobertura del PBS",
  11: "La prescripción excede la dosis máxima recomendada",
  12: "La prescripción excede los tres meses tratándose de una formulación de primera vez",
  13: "La prescripción excede el año y no está formulada como sucesiva.",
  14: "El INVIMA no aprobó el MND",
  15: "El paciente tiene suministro de otra prescripción",
  16: "El prescriptor y el paciente son el mismo",
  17: "Tecnología incluida en el Plan de Beneficios en Salud",
  18: "Exclusión del Plan de Beneficios en Salud",
  19: "Tecnología cubierta por otro Plan Adicional en Salud",
} as const;

export const VIA_ADMINISTRACION = {
  1: "Oral",
  2: "Sonda",} as const;

export const ESTADOS_ENTREGA = {
  1: "Si se entrega",
  0: "No se entrega",
} as const;

export const ESTADOS_REPORTE_ENTREGA = {
  2: "Procesado",
  1: "Activo",
  0: "Anulado",
} as const;


export const TIPOS_TECNOLOGIAS = {
  N:"Poductos Nutricional",
  M:"Medicamento",
  P:"Procedimiento",
  S:"Servicio Complementario",
  D:"Dispositivo Médico",
} as const;

export const MODALIDAD = {
  1: "Presencial",
  2: "virtual",
} as const;

export const UNIDADES_DOSIS = [
  { codigo: '0005', nombre: 'AgU' },
  { codigo: '0010', nombre: 'Bq' },
  { codigo: '0018', nombre: 'billon CFU' },
  { codigo: '0021', nombre: 'billon de organismos' },
  { codigo: '0032', nombre: 'm3' },
  { codigo: '0046', nombre: 'Gtt' },
  { codigo: '0047', nombre: 'unidades ELISA' },
  { codigo: '0053', nombre: 'GBq' },
  { codigo: '0062', nombre: 'g' },
  { codigo: '0072', nombre: 'UI' },
  { codigo: '0082', nombre: 'KUI' },
  { codigo: '0098', nombre: 'LfU' },
  { codigo: '0100', nombre: 'l' },
  { codigo: '0120', nombre: 'MBq' },
  { codigo: '0128', nombre: 'm' },
  { codigo: '0137', nombre: 'µg' },
  { codigo: '0148', nombre: 'µmol' },
  { codigo: '0151', nombre: 'mCi' },
  { codigo: '0159', nombre: 'mEq' },
  { codigo: '0168', nombre: 'mg' },
  { codigo: '0176', nombre: 'ml' },
  { codigo: '0179', nombre: 'mmol' },
  { codigo: '0184', nombre: 'millon UFC' },
  { codigo: '0187', nombre: 'millon UI' },
  { codigo: '0188', nombre: 'millon de organismos' },
  { codigo: '0203', nombre: 'ng' },
  { codigo: '0212', nombre: 'ppm' },
  { codigo: '0245', nombre: 'unidad de tuberculina' },
  { codigo: '0247', nombre: 'U' },
  { codigo: '0257', nombre: 'vg' },
  { codigo: '9000', nombre: 'Dosis' },
  { codigo: '9011', nombre: 'DL50' }
];

// Facturación
export const ESTADOS_FACTURACION: Record<number, string> = {
  1: "Activa",
  2: "Procesada",
}

export const TIPOS_TEC_FACTURACION: Record<string, string> = {
  M: "Medicamento",
  P: "Procedimiento",
  D: "Dispositivo Médico",
  N: "Producto Nutricional",
  S: "Servicio Complementario",
}

export const COMP_ADM: Record<number, string> = {
  1: "Comparador Administrativo",
  2: "Homólogo",
  3: "No aplica",
}

export const ESTADOS_DATOS_FACTURADO: Record<number, string> = {
  1: "Activo",
  2: "Anulado",
}

export function numeroALetras(num: number): string {
    const unidades = [
        "", "uno", "dos", "tres", "cuatro", "cinco",
        "seis", "siete", "ocho", "nueve", "diez"
    ];

    if (num <= 10) {
        return unidades[num];
    }

    return num.toString();
}
