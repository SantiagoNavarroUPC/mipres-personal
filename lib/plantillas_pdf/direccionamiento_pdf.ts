import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import {
  obtenerProductoNutricional,
  obtenerServicioComplementario,
} from '@/controllers/mipres-controller/prescripcion-controller/prescripcion-tecnologias.controller'
import { leerEmpresaDeSesion } from '../use-empresa-actual'

interface DireccionamientoInfo {
  // Direccionamiento
  IDDireccionamiento: string
  FecDireccionamiento: string
  FecMaxEnt: string
  
  // Prestador
  NitPrestador: string
  NombrePrestador: string
  DireccionPrestador: string
  MunicipioPrestador: string
  DepartamentoPrestador: string
  CodigoPrestador: string
  TelefonoPrestador: string
  
  // Paciente
  NombrePaciente: string
  ApellidoPaciente: string
  TipoDocPaciente: string
  NumDocPaciente: string
  Regimen: string
  NivelSisben: string
  DireccionPaciente: string
  MunicipioPaciente: string
  TelefonoPaciente: string
  
  // Tecnología
  TipoTecnologia: string
  CodigoServicio: string
  DescripcionServicio: string
  Cantidad: string
  NumEntrega: string
  NumSubEntrega: string
  TotalEntregas: string
  
  // Prescripción
  IPSPrescriptora: string
  NoPrescripcion: string
  RegimenPrescripcion: string
  Ambito: string
  Profesional: string
  JustificacionNoPBS: string
}

// Función para buscar IPS por NIT o código
async function fetchIPSData(nitOrCode: string): Promise<{ nombre: string; nit: string; municipio: string } | null> {
  try {
    const apiUrl = `/api/mipres/direccionamiento/ips?search=${encodeURIComponent(nitOrCode)}`
    const response = await fetch(apiUrl)
    if (!response.ok) return null
    
    const data = await response.json()
    // La API devuelve { value: [...], Count: n }
    const ipsArray = Array.isArray(data) ? data : (data.value || [])
    const found = ipsArray.find(
      (item: any) => String(item.nit) === String(nitOrCode)
    )
    
    return found ? { nombre: found.ips_nombre, nit: found.nit, municipio: found.municipio_codigo } : null
  } catch (error) {
    return null
  }
}

export async function generateDireccionamientoPDF(data: DireccionamientoInfo) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const { width, height } = page.getSize()
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Colores institucionales
  const primaryColor = rgb(0.0, 0.56, 0.38)
  const headerColor = rgb(0.94, 0.97, 0.94)
  const borderColor = rgb(0.65, 0.65, 0.65)
  const textColor = rgb(0.1, 0.1, 0.1)
  const lightGray = rgb(0.97, 0.97, 0.97)
  
  // Logo
  try {
    const logoResponse = await fetch('/logo.png')
    const logoImageBytes = await logoResponse.arrayBuffer()
    const logoImage = await pdfDoc.embedPng(logoImageBytes)
    const logoScale = 0.24
    const logoDims = logoImage.scale(logoScale)
    page.drawImage(logoImage, {
      x: 40,
      y: height - 70,
      width: logoDims.width,
      height: logoDims.height,
    })
  } catch {
  }
  
  // Título principal
  page.drawText('DIRECCIONAMIENTO MIPRES', {
    x: width / 2 - 110,
    y: height - 35,
    size: 20,
    font: fontBold,
    color: textColor,
  })
  
  page.drawText('Ministerio de Salud y Protección Social', {
    x: width / 2 - 70,
    y: height - 55,
    size: 12,
    font: font,
    color: textColor,
  })
  
  let yPosition = height - 100

  let descripcionServicio = data.DescripcionServicio
  
  if (data.TipoTecnologia === "Productos Nutricionales") {
    const result = await obtenerProductoNutricional(String(data.CodigoServicio))
    if (result.success && result.data) {
      descripcionServicio = result.data.forma
        ? `${result.data.nombre_comercial} - ${result.data.forma}`
        : result.data.nombre_comercial
    }
  } else if (data.TipoTecnologia === "Servicios Complementarios") {
    const result = await obtenerServicioComplementario(String(data.CodigoServicio))
    if (result.success && result.data) {
      descripcionServicio = result.data.descripcion
    }
  }
  
  // Función para dibujar secciones
  const drawSection = (title: string, y: number) => {
    page.drawLine({
      start: { x: 40, y: y + 2 },
      end: { x: width - 40, y: y + 2 },
      thickness: 2,
      color: primaryColor,
    })
    
    page.drawRectangle({
      x: 40,
      y: y - 18,
      width: width - 80,
      height: 20,
      color: headerColor,
      borderColor: primaryColor,
      borderWidth: 0.5,
    })
    
    page.drawText(title.toUpperCase(), {
      x: 50,
      y: y - 10,
      size: 10,
      font: fontBold,
      color: primaryColor,
    })
  }
  
  // Función para dibujar campos
  const drawField = (label: string, value: string | number, x: number, y: number) => {
    page.drawText(`${label}:`, {
      x,
      y: y + 12,
      size: 7,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    const stringValue = String(value || 'N/A')
    const truncatedValue = stringValue.length > 60 ? stringValue.substring(0, 57) + '...' : stringValue
    page.drawText(truncatedValue, {
      x,
      y: y,
      size: 9,
      font: font,
      color: textColor,
    })
  }

  const drawMultilineField = (
    label: string,
    value: string | number,
    x: number,
    y: number,
    maxCharsPerLine: number,
    maxLines: number
  ) => {
    page.drawText(`${label}:`, {
      x,
      y: y + 12,
      size: 7,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    })

    const text = String(value || "N/A")
    const lines: string[] = []
    const words = text.trim().split(/\s+/).filter(Boolean)
    if (words.length > 6) {
      for (let i = 0; i < words.length && lines.length < maxLines; i += 6) {
        lines.push(words.slice(i, i + 6).join(" "))
      }
    } else {
      for (let i = 0; i < text.length && lines.length < maxLines; i += maxCharsPerLine) {
        lines.push(text.slice(i, i + maxCharsPerLine))
      }
    }

    lines.forEach((line, index) => {
      page.drawText(line, {
        x,
        y: y - index * 10,
        size: 9,
        font: font,
        color: textColor,
      })
    })
  }
  

  page.drawText('ID Direccionamiento:', {
    x: 38,
    y: yPosition - 20,
    size: 12,
    font: font,
    color: textColor,
  })
  
  page.drawText(String(data.IDDireccionamiento), {
    x: 160,
    y: yPosition - 20,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  
  yPosition -= 50
  
  // SECCIÓN PRESTADOR
  drawSection('PRESTADOR', yPosition)
  yPosition -= 28
  
  page.drawRectangle({
    x: 40,
    y: yPosition - 78,
    width: width - 80,
    height: 82,
    color: lightGray,
    borderColor: borderColor,
    borderWidth: 0.8,
  })
  
  page.drawText(String(data.NombrePrestador).toUpperCase(), {
    x: 48,
    y: yPosition - 10,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  
  drawField('NIT', data.NitPrestador, 48, yPosition - 35)
  drawField('Código', data.CodigoPrestador, 280, yPosition - 35)
  drawField('Dirección', data.DireccionPrestador, 48, yPosition - 55)
  drawField('Teléfono', data.TelefonoPrestador, 280, yPosition - 55)
  drawField('Municipio', data.MunicipioPrestador, 48, yPosition - 75)
  drawField('Departamento', data.DepartamentoPrestador, 280, yPosition - 75)

  yPosition -= 105
  
  // SECCIÓN PACIENTE
  drawSection('Paciente', yPosition)
  yPosition -= 28
  
  page.drawRectangle({
    x: 40,
    y: yPosition - 100,
    width: width - 80,
    height: 104,
    color: lightGray,
    borderColor: borderColor,
    borderWidth: 0.8,
  })
  
  page.drawText(`${String(data.NombrePaciente)} ${String(data.ApellidoPaciente)}`.toUpperCase(), {
    x: 48,
    y: yPosition - 15,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  
  drawField('Tipo y Núm. Documento', `${data.TipoDocPaciente} ${data.NumDocPaciente}`, 48, yPosition - 40)
  drawField('Régimen', data.Regimen, 280, yPosition - 40)
  drawField('Dirección', data.DireccionPaciente, 48, yPosition - 60)
  drawField('Municipio', data.MunicipioPaciente, 280, yPosition - 60)
  drawField('Teléfono', data.TelefonoPaciente, 48, yPosition - 80)
  
  yPosition -= 120
  
  // SECCIÓN SERVICIO
  drawSection('Servicio y Tecnología', yPosition)
  yPosition -= 28
  
  page.drawRectangle({
    x: 40,
    y: yPosition - 78,
    width: width - 80,
    height: 82,
    color: lightGray,
    borderColor: borderColor,
    borderWidth: 0.8,
  })
  
  drawField('Tipo Tecnología', data.TipoTecnologia, 48, yPosition - 20)
  drawField('Código', data.CodigoServicio, 280, yPosition - 20)
  drawMultilineField('Descripción', descripcionServicio, 48, yPosition - 45, 80, 2)
  const isMedicamento = data.TipoTecnologia === "Medicamentos"
  const cantidadY = isMedicamento ? yPosition - 70 : yPosition - 45
  const fecMaxEntY = isMedicamento ? yPosition - 70 : yPosition - 45
  const entregaX = isMedicamento ? 380 : 48
  const entregaY = isMedicamento ? yPosition - 20 : yPosition - 70
  drawField('Cantidad', data.Cantidad, 280, cantidadY)
  drawField('Entrega', `${data.NumEntrega}/${data.TotalEntregas}`, entregaX, entregaY)
  drawField('Fecha Máxima Entrega', data.FecMaxEnt, 380, fecMaxEntY)
  
  yPosition -= 105
  
  // SECCIÓN PRESCRIPCIÓN
  drawSection('Prescripción', yPosition)
  yPosition -= 28
  
  page.drawRectangle({
    x: 40,
    y: yPosition - 100,
    width: width - 80,
    height: 104,
    color: lightGray,
    borderColor: borderColor,
    borderWidth: 0.8,
  })
  
  drawField('IPS Prescriptora', data.IPSPrescriptora || leerEmpresaDeSesion().nombreEmpresa || '', 48, yPosition - 20)
  drawField('Número Prescripción', data.NoPrescripcion, 280, yPosition - 20)
  drawField('Régimen', data.RegimenPrescripcion, 48, yPosition - 45)
  drawField('Ámbito', data.Ambito, 280, yPosition - 45)
  drawField('Profesional', data.Profesional, 48, yPosition - 65)
  drawField('Justificación NO PBS', data.JustificacionNoPBS || 'N/A', 48, yPosition - 85)
  
  // Footer institucional
  page.drawLine({
    start: { x: 40, y: 50 },
    end: { x: width - 40, y: 50 },
    thickness: 1,
    color: borderColor,
  })
  
  page.drawText(`Impreso el ${new Date().toLocaleString('es-CO', { 
    dateStyle: 'long', 
    timeStyle: 'short' 
  })}`, {
    x: 40,
    y: 35,
    size: 7,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  })
  
  page.drawText(`Sistema MIPRES - Página 1 de 1`, {
    x: width - 150,
    y: 35,
    size: 7,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  })
  
  page.drawText(`Este documento certifica el direccionamiento de tecnologías en salud.`, {
    x: 40,
    y: 20,
    size: 6,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  })
  
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}