"use client"

// Re-exportamos EntregaViewForm como EntregaModalForm para mantener compatibilidad
// total hacia atrás con cualquier import existente, prescindiendo del modal emergente.
export {
  EntregaViewForm as EntregaModalForm,
  EntregaViewForm,
  getEstadoEntrega,
} from "./EntregaViewForm"

export type {
  EntregaViewFormProps as EntregaModalFormProps,
  EstadoEntrega,
} from "./EntregaViewForm"

export { EntregaViewForm as default } from "./EntregaViewForm"
