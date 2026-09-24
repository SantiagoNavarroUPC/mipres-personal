const DUSAKAWI_API_URL = process.env.DUSAKAWI_API_URL;

export interface EmpresaApiItem {
  id_empresa: number;
  nit: string;
  nombre: string;
  direccion: string | null;
  id_municipio: number;
  municipio_nombre?: string;
  departamento_nombre?: string;
  id_tipo_empresa: number;
  tipo_empresa_nombre?: string;
}

export interface MunicipioApiItem {
  id_municipio: number;
  codigo_dane: string;
  nombre: string;
  id_departamento: number;
  departamento_nombre: string;
}

interface RequestResult<T = unknown> {
  success: boolean;
  status: number;
  message?: string;
  data?: T;
  raw?: unknown;
}

function withAuthHeader(token: string): Record<string, string> {
  const normalized = token.trim().toLowerCase().startsWith("bearer ") ? token.trim() : `Bearer ${token.trim()}`;
  return {
    Authorization: normalized,
    Accept: "application/json",
  };
}

function tryParseJson(raw: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function parseResult<T>(response: Response): Promise<RequestResult<T>> {
  const rawText = await response.text();
  const parsed = tryParseJson(rawText);
  const body = (parsed ?? {}) as { success?: boolean; message?: string; data?: T };

  return {
    success: response.ok && body.success !== false,
    status: response.status,
    message: body.message,
    data: body.data,
    raw: parsed,
  };
}

export async function listarEmpresasRequest(authToken: string): Promise<RequestResult<EmpresaApiItem[]>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa`, {
    method: "GET",
    headers: withAuthHeader(authToken),
    cache: "no-store",
  });
  return parseResult<EmpresaApiItem[]>(response);
}

export async function listarMunicipiosRequest(authToken: string): Promise<RequestResult<MunicipioApiItem[]>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa/municipios`, {
    method: "GET",
    headers: withAuthHeader(authToken),
    cache: "no-store",
  });
  return parseResult<MunicipioApiItem[]>(response);
}

// Empresas asignables al crear un usuario: excluye la reservada al super_admin.
export async function listarEmpresasAsignablesRequest(authToken: string): Promise<RequestResult<EmpresaApiItem[]>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa/asignables`, {
    method: "GET",
    headers: withAuthHeader(authToken),
    cache: "no-store",
  });
  return parseResult<EmpresaApiItem[]>(response);
}

export interface CredencialesMipresApiItem {
  id_empresa: number;
  token_subsidiado: string | null;
  token_contributivo: string | null;
  token_subsidiado_validado: string | null;
  token_contributivo_validado: string | null;
  usuario_grabado: number | null;
  fecha_grabado: string | null;
}

// Credenciales MIPRES (Sispro) de la empresa del usuario autenticado. El
// backend resuelve la empresa desde el token, nunca desde el cliente.
export async function obtenerMisCredencialesMipresRequest(authToken: string): Promise<RequestResult<CredencialesMipresApiItem>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa/mis-credenciales-mipres`, {
    method: "GET",
    headers: withAuthHeader(authToken),
    cache: "no-store",
  });
  return parseResult<CredencialesMipresApiItem>(response);
}

export async function guardarTokensFuenteRequest(
  payload: { token_subsidiado?: string | null; token_contributivo?: string | null },
  authToken: string
): Promise<RequestResult<CredencialesMipresApiItem>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa/mis-credenciales-mipres/fuente`, {
    method: "PUT",
    headers: { ...withAuthHeader(authToken), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResult<CredencialesMipresApiItem>(response);
}

export async function guardarTokensValidadosRequest(
  payload: { token_subsidiado_validado?: string | null; token_contributivo_validado?: string | null },
  authToken: string
): Promise<RequestResult<CredencialesMipresApiItem>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa/mis-credenciales-mipres/validados`, {
    method: "PUT",
    headers: { ...withAuthHeader(authToken), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResult<CredencialesMipresApiItem>(response);
}

export interface EmpresaPayload {
  nit: string;
  nombre: string;
  direccion?: string | null;
  id_municipio: number;
  id_tipo_empresa: number;
}

export async function crearEmpresaRequest(
  payload: EmpresaPayload,
  authToken: string
): Promise<RequestResult<EmpresaApiItem>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa`, {
    method: "POST",
    headers: {
      ...withAuthHeader(authToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResult<EmpresaApiItem>(response);
}

export async function actualizarEmpresaRequest(
  idEmpresa: number,
  payload: EmpresaPayload,
  authToken: string
): Promise<RequestResult<EmpresaApiItem>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa/${idEmpresa}`, {
    method: "PUT",
    headers: {
      ...withAuthHeader(authToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResult<EmpresaApiItem>(response);
}

export async function eliminarEmpresaRequest(
  idEmpresa: number,
  authToken: string
): Promise<RequestResult<null>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/empresa/${idEmpresa}`, {
    method: "DELETE",
    headers: withAuthHeader(authToken),
    cache: "no-store",
  });
  return parseResult<null>(response);
}
