
export interface Entrega {
    ID: number // ID del registro
    IDEntrega?: number // ID de la entrega
    NoPrescripcion?: string // Número de prescripción
    TipoTec?: string // Tipo de tecnología (M, P, D, N, S)
    ConTec?: number // Consecutivo de la tecnología
    TipoIDPaciente?: string
    NoIDPaciente?: string
    NoEntrega?: number // Número de entrega
    CodSerTecEntregado?: string // Código del servicio/tecnología entregado
    CantTotEntregada?: string // Cantidad total entregada
    EntTotal?: number // 1 si la entrega es total, 0 si es parcial
    CausaNoEntrega?: number | null // Causa de no entrega, si aplica
    FecEntrega?: string // Fecha de la entrega
    NoLote?: string | null // Número de lote, si aplica
    TipoIDRecibe?: string // Tipo de identificación de quien recibe
    NoIDRecibe?: string // Número de identificación de quien recibe
    EstEntrega?: number // 0 = Anulado, 1 = Activo, 2 = Procesado
    FecAnulacion?: string | null
    tipoRegimen?: string
}
