export interface RegistrarDatosFacturadoRequest {
  ID: number
  CompAdm: number
  CodCompAdm: string
  CodHom: string
  UniCompAdm: string
  UniDispHom: string
  ValUnMiCon: string
  CantTotEnt: string
  ValTotCompAdm: string
  ValTotHom: string
}

export interface RegistrarDatosFacturadoResponse {
  Id: number
  IDDatosFacturado: number
}

export interface DatosFacturado {
  ID: number;
  IDDatosFacturado: number;
  NoPrescripcion: string;
  TipoTec: string;
  ConTec: number;
  TipoIDPaciente: string;
  NoIDPaciente: string;
  NoEntrega: number;
  CompAdm: number;
  CodCompAdm: string | null;
  CodHom: string | null;
  UniCompAdm: number | null;
  UniDispHom: number | null;
  ValUnMiCon: number | null;
  CantTotEnt: number | null;
  ValTotCompAdm: number | null;
  ValTotHom: number | null;
  FecDatosFacturado: string | null;
  EstDatosFacturado: number;
  FecAnulacion: string | null;
}

export interface Facturacion {
  ID: number;
  IDFacturacion: number;
  NoPrescripcion: string;
  TipoTec: string;
  ConTec: number;
  TipoIDPaciente: string;
  NoIDPaciente: string;
  NoEntrega: number;
  NoSubEntrega: number | null;
  NoFactura: string;
  NoIDEPS: string;
  CodEPS: string;
  CodSerTecAEntregado: string;
  CantUnMinDis: number;
  ValorUnitFacturado: number;
  ValorTotFacturado: number;
  CuotaModer: number;
  Copago: number;
  FecFacturacion: string; // o Date si lo conviertes
  EstFacturacion: number;
  FecAnulacion: string | null; // o Date | null si lo conviertes
  CodigosFacturacion: string | null;
}