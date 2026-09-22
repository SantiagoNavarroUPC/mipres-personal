import { AMBITOS_ATENCION, type Prescripcion } from "@/models/mipres-sispro/prescripcion"
import { ESTADOS_TECNOLOGIAS, UNIDADES_DOSIS } from "@/models/constants"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"


// Función para buscar IPS por NIT
async function fetchIPSData(nitOrCode: string): Promise<{ nombre: string; nit: string; municipio: string } | null> {
  try {
    const apiUrl = `/api/mipres/direccionamiento/ips?search=${encodeURIComponent(nitOrCode)}`
    const response = await fetch(apiUrl)
    if (!response.ok) return null
    
    const data = await response.json()
    const ipsArray = Array.isArray(data) ? data : (data.value || [])
    const found = ipsArray.find(
      (item: any) => String(item.nit) === String(nitOrCode)
    )
    
    return found ? { nombre: found.ips, nit: found.nit, municipio: found.municipio_codigo } : null
  } catch (error) {
    return null
  }
}

// Función para buscar municipio por código DANE
async function fetchMunicipioData(codigoMunicipio: string): Promise<{ departamento: string; departamentoCodigo: string; municipio: string; municipioCodigo: string } | null> {
  try {
    const apiUrl = `https://www.datos.gov.co/resource/gdxc-w37w.json?cod_mpio=${encodeURIComponent(codigoMunicipio)}`
    const response = await fetch(apiUrl)
    if (!response.ok) return null
    
    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) return null
    
    const municipioData = data[0]
    return {
      departamento: municipioData.dpto || 'N/A',
      departamentoCodigo: municipioData.cod_dpto || 'N/A',
      municipio: municipioData.nom_mpio || 'N/A',
      municipioCodigo: municipioData.cod_mpio || 'N/A'
    }
  } catch (error) {
    return null
  }
}

function pickField(obj: any, candidates: string[]) {
  for (const candidate of candidates) {
    if (obj && obj[candidate] !== undefined && obj[candidate] !== null) return obj[candidate]
  }
  return undefined
}

function getCodigoProductoNutricional(prod: any): string | undefined {
  const raw = pickField(prod, [
    "CodProdNutr",
    "CodProdNutrP",
    "CodProd",
    "CodPN",
    "CodigoMipres",
    "codigo_mipres",
    "CodProdNutrional",
    "CodProdNutrPN",
    "CodNutr",
  ])

  if (raw !== undefined && raw !== null) {
    return String(raw).trim()
  }

  const desc = pickField(prod, ["DescProdNutr", "DescPN", "DescProd", "Desc"])
  if (typeof desc === "string" && /^\d+$/.test(desc.trim())) {
    return desc.trim()
  }

  return undefined
}

async function fetchProductoNutricionalData(codigoMipres: string): Promise<{ nombre_comercial: string; forma?: string } | null> {
  try {
    const response = await fetch(`/api/mipres/prescripciones/productos-nutricionales?codigo_mipres=${encodeURIComponent(codigoMipres)}`)
    if (!response.ok) return null

    const data = await response.json()
    const producto = Array.isArray(data) ? data[0] : data
    if (!producto?.nombre_comercial) return null

    return {
      nombre_comercial: String(producto.nombre_comercial),
      forma: producto.forma ? String(producto.forma) : undefined,
    }
  } catch (error) {
    return null
  }
}

/**
 * Genera y descarga un PDF con los datos de la prescripción
 * Convierte el HTML template a PDF manteniendo el formato original
 * @param prescripcion Datos de la prescripción completa
 */
export async function generarPrescripcionHTML(prescripcion: Prescripcion) {
  // Verificar que estamos en el navegador
  if (typeof window === "undefined") {
    throw new Error("Esta función solo puede ejecutarse en el navegador")
  }

  let iframe: HTMLIFrameElement | null = null

  try {
    // Buscar datos de la IPS
    let ipsData = null
    if (prescripcion.NroIDIPS) {
      ipsData = await fetchIPSData(prescripcion.NroIDIPS)
    }

    // Buscar datos del municipio
    let municipioData = null
    if (prescripcion.CodDANEMunIPS) {
      municipioData = await fetchMunicipioData(prescripcion.CodDANEMunIPS)
    }

    // Preparar datos enriquecidos
    const productosNutricionales = Array.isArray(prescripcion.productosNutricionales)
      ? await Promise.all(
        prescripcion.productosNutricionales.map(async (producto: any) => {
          const codigoProducto = getCodigoProductoNutricional(producto)
          if (!codigoProducto) return producto

          const productoInfo = await fetchProductoNutricionalData(codigoProducto)
          return {
            ...producto,
            codigo_mipres: codigoProducto,
            nombre_comercial: productoInfo?.nombre_comercial,
            forma: productoInfo?.forma,
          }
        })
      )
      : prescripcion.productosNutricionales

    const presc = prescripcion as any
    const datosEnriquecidos = {
      ...prescripcion,
      productosNutricionales,
      nombreIPS: presc.nombreIPS || ipsData?.nombre || 'N/A',
      departamentoIPS: presc.departamentoIPS || (municipioData ? `${municipioData.departamentoCodigo} - ${municipioData.departamento}` : 'N/A'),
      municipioIPS: presc.municipioIPS || (municipioData ? `${municipioData.municipioCodigo} - ${municipioData.municipio}` : (prescripcion.CodDANEMunIPS || 'N/A')),
      ambitoAtencionNombre: AMBITOS_ATENCION[prescripcion.CodAmbAte as keyof typeof AMBITOS_ATENCION] || prescripcion.CodAmbAte || 'N/A',
    }
    // Fetch del template HTML desde public
    const response = await fetch('/prescripcion_pdf.html')
    if (!response.ok) {
      throw new Error('No se pudo cargar el template de prescripción')
    }
    
    let htmlContent = await response.text()
    
    // Inyectar los datos DENTRO del HTML antes de cargarlo
    const dataScript = `
      <script>
        window.prescripcionData = ${JSON.stringify(datosEnriquecidos)};
        window.prescripcion = ${JSON.stringify(datosEnriquecidos)};
        window.__PDF_CONSTANTS__ = ${JSON.stringify({ ESTADOS_TECNOLOGIAS, UNIDADES_DOSIS })};
      </script>
    `
    htmlContent = htmlContent.replace('</head>', `${dataScript}</head>`)
    
    // Crear un iframe oculto para renderizar el HTML
    iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '-10000px'
    iframe.style.left = '-10000px'
    iframe.style.width = '1200px'
    iframe.style.height = '2000px'
    document.body.appendChild(iframe)

    // Escribir el HTML en el iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      throw new Error('No se pudo acceder al documento del iframe')
    }

    // Esperar a que el iframe se cargue completamente
    await new Promise<void>((resolve) => {
      const currentIframe = iframe
      if (!currentIframe) {
        throw new Error('No se pudo crear el iframe para renderizar el PDF')
      }

      currentIframe.onload = () => {
        // Esperar a que el JavaScript del HTML se ejecute y renderice
        setTimeout(() => resolve(), 1500)
      }

      // Escribir el HTML
      iframeDoc.open()
      iframeDoc.write(htmlContent)
      iframeDoc.close()
    })

    // Obtener el contenedor principal
    const container = iframeDoc.querySelector('.form-container') as HTMLElement
    if (!container) {
      throw new Error('No se encontró el contenedor de la prescripción')
    }

    // Ocultar tablas vacías (las que tienen la clase hidden-empty)
    const emptyTables = iframeDoc.querySelectorAll('.hidden-empty')
    emptyTables.forEach((table) => {
      ;(table as HTMLElement).style.display = 'none'
    })

    // Forzar el reflow del documento para asegurar renderizado completo
    container.offsetHeight

    // Capturar el HTML como imagen con html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1200,
      windowHeight: container.scrollHeight,
      imageTimeout: 0,
      removeContainer: false,
    })

    // Crear el PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth - 20 // Margen de 10mm a cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 10 // Margen superior

    // Agregar la primera página
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
    heightLeft -= (pageHeight - 20) // Restar altura de la primera página

    // Si hay más contenido, agregar páginas adicionales
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pageHeight - 20)
    }

    // Limpiar el iframe
    if (iframe.parentNode && document.body.contains(iframe)) {
      iframe.parentNode.removeChild(iframe)
    }
    iframe = null

    // Descargar el PDF
    const filename = `prescripcion-${prescripcion.NoPrescripcion || "sin-numero"}.pdf`
    pdf.save(filename)

  } catch (error) {
    throw error
  } finally {
    if (iframe && iframe.parentNode && document.body.contains(iframe)) {
      try {
        iframe.parentNode.removeChild(iframe)
      } catch {
      }
    }
  }
}

/**
 * Genera y descarga el PDF de la prescripción
 * @param prescripcion Datos de la prescripción
 */
export function descargarPrescripcionPDF(prescripcion: Prescripcion) {
  return generarPrescripcionHTML(prescripcion)
}
