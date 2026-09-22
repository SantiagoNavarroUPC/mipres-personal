// Modelo de Servicios Complementarios

export interface ServicioComplementario {
  ConOrdenSC: number // Consecutivo Orden Servicios Complementarios
  CodSerComp: string // Código Servicio Complementario
  DescSerComp: string // Descripción del Servicio Complementario
  CanForm: string // Cantidad Formulada
  CadaFreUso: string // Cada Frecuencia de Uso
  CodFreUso: number // Código Frecuencia de Uso (1-7)
  Cant: string // Cantidad Servicio Complementario en tiempo
  CantTotal: string // Cantidad Total a entregar
  CodPerDurTrat: number // Código Periodicidad Duración Tratamiento (1-6)
  TipoTrans:number // Tipo de Transporte (1-3)
  ReqAcom: number // Requiere Acompañante (1: Sí, 0: No)
  TipoIDAcomAlb:string // Tipo de Identificación del Acompañante o Albergue
  NroIDAcomAlb:string // Número de Identificación del Acompañante o Albergue
  ParentAcomAlb:string // Parentesco del Acompañante o Albergue
  NombAcomAlb:string // Nombre del Acompañante o Albergue
  CodMunOriAlb :string // Código Municipio Origen del Acompañante o Albergue
  CodMunDestAlb:string // Código Municipio Destino del Acompañante o Albergue
  JustNoPBSSC: string // Justificación No UPC
  IndRec: string // Indicaciones y recomendaciones
  EstJM: number // Estado 
}
