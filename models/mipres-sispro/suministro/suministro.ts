
export interface Suministro {
    ID:number // ID del registro
    IDSuministro:string // ID del suministro
    UltEntrega:number // 0 si no se ha entregado, 1 si se ha entregado
    EntregaCompleta:number // 0 si no se ha entregado completamente, 1 si se ha entregado completamente
    CausaNoEntrega:number // Causa de no entrega, si aplica
    NoPrescripcionAsociada:string // Número de prescripción
    ConTecAsociada:number // Consecutivo de tecnología asociada
    CantTotEntregada:string // Cantidad total entregada
    NoLote:string // Número de lote, si aplica
    ValorEntregado:string // Valor entregado, si aplica
    TipoTec?: string
    FecEntrega?: string
    FecSuministro?: string
    EstSuministro?: number
    NoEntrega?: number
    EstadoEntrega?: number
    EstRepEntrega?: number
    CodTecEntregado?: string
    FecAnulacion?: string
    TipoIDPaciente?: string
    NoIDPaciente?: string
}
