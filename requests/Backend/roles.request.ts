const DUSAKAWI_API_URL = process.env.DUSAKAWI_API_URL;

export interface CrearRolApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface ActualizarEstadoRolApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
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

export async function crearRolRequest(
  nombre: string,
  descripcion: string | null,
  estado: boolean,
  idTipoEmpresa: number,
  authToken: string
): Promise<RequestResult<CrearRolApiResponse>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/usuarios/roles`, {
    method: "POST",
    headers: {
      ...withAuthHeader(authToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nombre,
      descripcion: descripcion ?? null,
      estado,
      id_tipo_empresa: idTipoEmpresa,
    }),
    cache: "no-store",
  });

  const rawText = await response.text();
  const parsed = tryParseJson(rawText);
  const body = (parsed ?? {}) as CrearRolApiResponse;

  return {
    success: response.ok && body.success !== false,
    status: response.status,
    message: body.message,
    data: body,
    raw: parsed,
  };
}

export async function patchRolEstadoRequest(
  consecutivoRol: number,
  estado: boolean,
  authToken: string
): Promise<RequestResult<ActualizarEstadoRolApiResponse>> {
  const response = await fetch(`${DUSAKAWI_API_URL}/api/usuarios/roles`, {
    method: "PATCH",
    headers: {
      ...withAuthHeader(authToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consecutivo_rol: consecutivoRol,
      estado,
    }),
    cache: "no-store",
  });

  const rawText = await response.text();
  const parsed = tryParseJson(rawText);
  const body = (parsed ?? {}) as ActualizarEstadoRolApiResponse;

  return {
    success: response.ok && body.success !== false,
    status: response.status,
    message: body.message,
    data: body,
    raw: parsed,
  };
}
