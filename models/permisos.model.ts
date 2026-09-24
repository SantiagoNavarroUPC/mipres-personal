export interface Permiso {
  consecutivo_rol: number
  modulo_id: string
  activo: boolean
}

export interface PermisosResponse {
  permisos: Permiso[]
  rol: number
}

// Fila real de mipres.modulos_app (fuente de verdad para ids de módulo).
// id_tipo_empresa: 1=IPS, 2=EPS, 3=AMBAS (ver mipres.tipo_empresa).
export interface ModuloApp {
  id: number
  nombre: string
  descripcion?: string
  id_tipo_empresa?: number
}

export const MODULOS = [
  { id: "prescripcion", label: "Prescripciones", description: "Consulta de prescripciones" },
  { id: "direccionamiento", label: "Direccionamiento", description: "Gestión de direccionamientos" },
  { id: "tutelas", label: "Tutelas", description: "Gestión de tutelas" },
  { id: "no_direccionamiento", label: "No Direccionamiento", description: "Gestión de no direccionamientos" },
  { id: "programacion", label: "Programación", description: "Gestión de programaciones" },
  { id: "entrega", label: "Entrega", description: "Gestión de entregas" },
  { id: "reporte_entrega", label: "Reporte de Entrega", description: "Reporte de entrega de tecnologías" },
  { id: "suministro", label: "Suministros", description: "Gestión de suministros" },
  { id: "facturacion", label: "Facturación", description: "Gestión de Facturacion" },
  { id: "usuarios", label: "Mantenimiento", description: "Gestión de Mantenimiento" },
  { id: "informes", label: "Informes", description: "Reportes e indicadores" },
  { id: "configuracion", label: "Configuración", description: "Credenciales API" },
] as const
