/**
 * Utilidad para exportar datos a Excel real (.xlsx)
 */

import * as XLSX from "xlsx"

export interface ExportRow {
  [key: string]: string | number | boolean | null | undefined
}

const HEADER_LABELS: Record<string, string> = {
  NoPrescripcion: "No. Prescripción",
  FPrescripcion: "Fecha Prescripción",
  HPrescripcion: "Hora Prescripción",
  CodHabIPS: "Código Habilitación IPS",
  TipoIDIPS: "Tipo ID IPS",
  NroIDIPS: "Nro. ID IPS",
  NombreIPS: "Nombre IPS",
  CodDANEMunIPS: "Código DANE Municipio IPS",
  MunicipioIPS: "Municipio IPS",
  DirSedeIPS: "Dirección Sede IPS",
  TelSedeIPS: "Teléfono Sede IPS",
  TipoIDProf: "Tipo ID Profesional",
  NumIDProf: "Número ID Profesional",
  PNProfS: "Primer Nombre Profesional",
  SNProfS: "Segundo Nombre Profesional",
  PAProfS: "Primer Apellido Profesional",
  SAProfS: "Segundo Apellido Profesional",
  RegProfS: "Registro Profesional",
  TipoIDPaciente: "Tipo ID Paciente",
  NroIDPaciente: "Nro. ID Paciente",
  PNPaciente: "Primer Nombre Paciente",
  SNPaciente: "Segundo Nombre Paciente",
  PAPaciente: "Primer Apellido Paciente",
  SAPaciente: "Segundo Apellido Paciente",
  CodAmbAte: "Código Ámbito Atención",
  AmbitoAtencion: "Ámbito Atención",
  RefAmbAte: "Referencia Ámbito Atención",
  PacCovid19: "Paciente COVID-19",
  EnfHuerfana: "Enfermedad Huérfana",
  CodEnfHuerfana: "Código Enfermedad Huérfana",
  EnfHuerfanaDX: "Diagnóstico Enfermedad Huérfana",
  CodDxPpal: "Código Dx Principal",
  CodDxRel1: "Código Dx Rel. 1",
  CodDxRel2: "Código Dx Rel. 2",
  SopNutricional: "Soporte Nutricional",
  CodEPS: "Código EPS",
  EstPres: "Estado Prescripción",
  EstadoPrescripcion: "Estado Prescripción",
  Exclusion: "Exclusión",
  tipoRegimen: "Régimen",
  M: "Medicamentos",
  P: "Procedimientos",
  DM: "Dispositivos Médicos",
  PN: "Productos Nutricionales",
  C: "Servicios Complementarios",
  EstadoDireccionamiento: "Estado Direccionamiento",
}

const formatHeaderLabel = (key: string): string => {
  if (HEADER_LABELS[key]) return HEADER_LABELS[key]

  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim()
}

/**
 * Descarga un workbook XLSX en el navegador
 */
export const downloadWorkbookAsExcel = (data: ExportRow[], filename: string, headers?: string[]): void => {
  const keys = headers && headers.length > 0
    ? headers
    : data.length > 0
      ? Object.keys(data[0])
      : []

  const rows = data.map((row) => keys.map((key) => row[key] ?? ""))
  const worksheet = XLSX.utils.aoa_to_sheet([
    keys.map((key) => formatHeaderLabel(key)),
    ...rows,
  ])

  worksheet["!cols"] = keys.map((key, index) => {
    const headerLength = formatHeaderLabel(key).length
    const dataLength = rows.reduce((max, currentRow) => {
      const value = currentRow[index]
      return Math.max(max, String(value ?? "").length)
    }, 0)

    return { wch: Math.min(45, Math.max(12, headerLength, dataLength)) }
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos")

  const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)

  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exporta datos a Excel
 */
export const exportToExcel = (
  data: ExportRow[],
  filename: string,
  headers?: string[]
): void => {
  const safeFilename = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`
  downloadWorkbookAsExcel(data, safeFilename, headers)
}

/**
 * Prepara datos de prescripción para exportar (versión simplificada)
 */
export const preparePrescripcionExportData = (prescripciones: any[]): ExportRow[] => {
  return prescripciones.map((presc) => ({
    "No. Prescripción": presc.NoPrescripcion || "",
    "Paciente": `${presc.PNPaciente || ""} ${presc.PAPaciente || ""}`.trim(),
    "ID Paciente": presc.NoIDPaciente || "",
    "Tipo ID": presc.TipoIDPaciente || "",
    "Régimen": presc.tipoRegimen || "",
    "Ámbito": presc.codigoAmbitoPrestador || "",
    "Fecha Prescripción": presc.FPrescripcion || "",
    "Estado": presc.EstJM === 1 ? "Aprobada" : presc.EstJM === 2 ? "Pendiente" : "Rechazada",
    "Prescriptor": presc.NomPrescriptor || "",
    "Medicamentos": presc.medicamentos?.length || 0,
    "Procedimientos": presc.procedimientos?.length || 0,
    "Dispositivos": presc.dispositivos?.length || 0,
    "Prod. Nutricionales": presc.productosNutricionales?.length || 0,
    "Servicios Comp.": presc.serviciosComplementarios?.length || 0,
  }))
}
