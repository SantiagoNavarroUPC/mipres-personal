export type DireccionamientoRow = {
  id: string
  label: string
  NoPrescripcion: string
  TipoTec: string
  ConTec: number | string
  allowManualTipo?: boolean
  TipoIDPaciente: string
  NoIDPaciente: string
  NoEntrega: string
  NoSubEntrega: string
  TipoIDProv: string
  NoIDProv: string
  NomProv?: string
  CodMunEnt: string
  FecMaxEnt: string
  CantTotAEntregar: string
  DirPaciente: string
  CodSerTecAEntregar: string
  CodSerTecFixed: boolean
  codigoMipres?: string // Código MIPRES para productos nutricionales
  isUnique: boolean
  intervalValue: number | null
  intervalUnit: number | null
  deliveryIndex: number
  deliveryCount: number
}

export type Municipio = {
  cod_mpio: string
  nom_mpio: string
}

export type IpsProveedor = {
  nit: string
  ips: string
  ips_nombre: string
  direccion_sede: string
  municipio_codigo: string
  municipio_nombre: string
  razon_social?: string
}

export type Medicamento = {
  producto: string
  expedientecum: string
  consecutivocum: string
  codigo: string
}
