export interface NoDireccionamiento {
    ID?: number
    IDNODireccionamiento?: number
    NoPrescripcion: string
    TipoTec: string
    ConTec: number
    TipoIDPaciente: string
    NoIDPaciente: string
    NoPrescripcionAsociada: string | null
    ConTecAsociada: number
    CausaNoEntrega: number
    FecAnulacion?: string | null
    tipoRegimen?: "Subsidiado" | "Contributivo"
}

export interface NoDireccionamientoPayload {
    NoPrescripcion: string
    TipoTec: string
    ConTec: number
    TipoIDPaciente: string
    NoIDPaciente: string
    NoPrescripcionAsociada: string | null
    ConTecAsociada: number
    CausaNoEntrega: number
}
