
export interface Programacion {
    ID: number // ID del registro
    IDProgramacion?: number // ID de la programación
    NoPrescripcion?: string // Número de prescripción
    TipoTec?: string // Tipo de tecnología (M, P, D, N, S)
    ConTec?: number // Consecutivo de la tecnología
    TipoIDPaciente?: string
    NoIDPaciente?: string
    NoEntrega?: number // Número de entrega
    FecMaxEnt?: string // Fecha máxima de entrega
    TipoIDSedeProv?: string // Tipo de identificación de la sede del proveedor
    NoIDSedeProv?: string // Número de identificación de la sede del proveedor
    CodSedeProv?: string // Código de la sede del proveedor
    CodSerTecAEntregar?: string // Código del servicio/tecnología a entregar
    CantTotAEntregar?: string // Cantidad total a entregar
    FecProgramacion?: string // Fecha de la programación
    EstProgramacion?: number // 0 = Anulado, 1 = Activo, 2 = Procesado
    FecAnulacion?: string | null
    tipoRegimen?: string
}
