# Prescripción PDF - Documentación

## Archivos modificados/creados

1. **`public/prescripcion_pdf.html`** - Template HTML con mapeo completo del modelo `Prescripcion`
2. **`lib/plantillas_pdf/prescripcion_pdf.ts`** - Función TypeScript para generar y descargar PDF
3. **`components/mipres/component-prescripcion/PrescripcionTable.tsx`** - Tabla con botón de descarga PDF

## Características implementadas

### Template HTML (`prescripcion_pdf.html`)

✅ Mapea **todos los campos** del modelo `Prescripcion`:
- Datos generales (NoPrescripcion, FPrescripcion, HPrescripcion, etc.)
- Datos del prestador (IPS)
- Datos del paciente
- Datos del profesional
- **Listas dinámicas de tecnologías**:
  - Medicamentos
  - Procedimientos
  - Dispositivos Médicos
  - Productos Nutricionales
  - Servicios Complementarios

✅ Logo: Usa `/logo.png` (ya presente en `public/`)

✅ Impresión y descarga como PDF:
- Usa el diálogo nativo de impresión del navegador
- Opción "Guardar como PDF" disponible en el diálogo
- Botones visibles para reimprimir o cerrar la ventana
- Totalmente compatible, sin dependencias de librerías externas
- No requiere permisos especiales más allá de ventanas emergentes

### Función TypeScript (`prescripcion_pdf.ts`)

```typescript
import { generarPrescripcionHTML } from "@/lib/plantillas_pdf/prescripcion_pdf"

// Uso:
await generarPrescripcionHTML(prescripcion)
```

**Cómo funciona:**
1. Carga el template HTML desde `/prescripcion_pdf.html`
2. Inyecta los datos de la prescripción en `window.prescripcionData`
3. Abre una nueva ventana con el HTML renderizado
4. Dispara automáticamente el diálogo de impresión del navegador
5. El usuario puede:
   - Seleccionar "Guardar como PDF" como destino
   - Elegir impresión física
   - Ajustar márgenes y configuración
   - Cancelar y usar los botones de la ventana

### Botón en la tabla (PrescripcionTable.tsx)

Icono: `<Printer />` (lucide-react)
- Ubicación: Columna "Acciones", antes del botón "Ver prescriptor"
- Tooltip: "Guardar como PDF"
- Handler: `handlePrintPrescripcion(presc)`

## Estructura de datos esperada

El template espera recibir un objeto `Prescripcion` completo:

```typescript
interface Prescripcion {
  NoPrescripcion: string
  FPrescripcion: string
  HPrescripcion: string
  // ... todos los campos del modelo
  medicamentos?: Medicamento[]
  procedimientos?: Procedimiento[]
  dispositivos?: DispositivoMedico[]
  productosNutricionales?: ProductoNutricional[]
  serviciosComplementarios?: ServicioComplementario[]
}
```

## Validación

- ✅ Sin errores de TypeScript
- ✅ HTML válido (sin `<tbody>` anidados)
- ✅ Logo.png disponible en `/public`
- ✅ Template accesible vía HTTP en `/prescripcion_pdf.html`

## Uso en producción

1. El usuario hace clic en el ícono de impresora en cualquier fila de la tabla
2. Se abre una nueva ventana con la prescripción formateada
3. El navegador muestra automáticamente el diálogo de impresión
4. El usuario selecciona:
   - **Destino: "Guardar como PDF"** para descargar el archivo
   - O una impresora física para imprimir directamente
5. El archivo se guarda con el nombre que elija el usuario
6. La ventana permanece abierta para revisar o reimprimir

## Notas técnicas

- **Método**: Diálogo nativo de impresión del navegador (`window.print()`)
- **Ventanas emergentes**: Requiere permisos de popup en el navegador
- **Compatibilidad**: Compatible con todos los navegadores modernos
- **Formato**: El usuario controla márgenes, orientación y tamaño
- **Sin dependencias**: No requiere librerías externas de generación de PDF
- **Botones de control**: Reimprimir y cerrar ventana disponibles
- **Nombre del archivo**: El usuario elige el nombre al guardar

## Mantenimiento

El template HTML se encuentra en: **`public/prescripcion_pdf.html`**

Este archivo es servido directamente por Next.js y cargado vía fetch desde la función `generarPrescripcionHTML()`.

Cualquier modificación al template debe hacerse directamente en este archivo.
