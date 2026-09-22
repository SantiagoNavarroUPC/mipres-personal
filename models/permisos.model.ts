export interface Permiso {
  consecutivo_rol: number
  modulo_id: string
  activo: boolean
}

export interface PermisosResponse {
  permisos: Permiso[]
  rol: number
}

export const MODULOS = [
  { id: "prescripcion", label: "Prescripciones", description: "Consulta de prescripciones" },
  { id: "direccionamiento", label: "Direccionamiento", description: "Gestión de direccionamientos" },
  { id: "tutelas", label: "Tutelas", description: "Gestión de tutelas" },
  { id: "no_direccionamiento", label: "No Direccionamiento", description: "Gestión de no direccionamientos" },
  { id: "reporte_entrega", label: "Reporte de Entrega", description: "Reporte de entrega de tecnologías" },
  { id: "suministro", label: "Suministros", description: "Gestión de suministros" },
  { id: "facturacion", label: "Facturación", description: "Gestión de Facturacion" },
  { id: "usuarios", label: "Usuarios", description: "Gestión de Usuarios" },
  { id: "informes", label: "Informes", description: "Reportes e indicadores" },
  { id: "configuracion", label: "Configuración", description: "Credenciales API" },
] as const
