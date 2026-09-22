import { Interface } from "readline";

export interface Direccionamiento {
  ID: any;
  IDDireccionamiento: any;
  NoPrescripcion: string;
  TipoTec: string;
  ConTec: number;
  TipoIDPaciente: string;
  NoIDPaciente: string;
  NoEntrega: number;
  NoSubEntrega: number;
  TipoIDProv: string;
  NoIDProv: string;
  CodMunEnt: string;
  FecMaxEnt: string;
  CantTotAEntregar: string;
  DirPaciente: string;
  CodSerTecAEntregar: string;
  NoIDEPS: string;
  CodEPS: string;
  EstDireccionamiento: number;
  FecDireccionamiento: string;
  FecAnulacion: string | null;
  // (campo no en WebService, pero útil para lógica interna)
  tipoRegimen?: "Subsidiado" | "Contributivo";
}

export interface DireccionamientoResponse {
  prescripciones: Direccionamiento[]
  total: number
  fecha: string
}