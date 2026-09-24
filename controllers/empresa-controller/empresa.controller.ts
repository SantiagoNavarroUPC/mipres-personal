import {
  listarEmpresasRequest,
  listarMunicipiosRequest,
  listarEmpresasAsignablesRequest,
  crearEmpresaRequest,
  actualizarEmpresaRequest,
  eliminarEmpresaRequest,
  obtenerMisCredencialesMipresRequest,
  guardarTokensFuenteRequest,
  guardarTokensValidadosRequest,
  type EmpresaApiItem,
  type MunicipioApiItem,
  type EmpresaPayload,
  type CredencialesMipresApiItem,
} from "@/requests/Backend/empresa.requests"

export interface EmpresaResult<T> {
  success: boolean
  message?: string
  data?: T
  status?: number
  error?: string
}

function validarPayload(payload: EmpresaPayload): string | null {
  if (!payload.nit || !payload.nit.trim()) return "nit es requerido"
  if (!payload.nombre || !payload.nombre.trim()) return "nombre es requerido"
  if (!Number.isFinite(payload.id_municipio) || payload.id_municipio <= 0) return "id_municipio es requerido"
  if (![1, 2, 3].includes(payload.id_tipo_empresa)) return "id_tipo_empresa es requerido (1=IPS, 2=EPS, 3=AMBAS)"
  return null
}

export async function listarEmpresasController(authToken: string): Promise<EmpresaResult<EmpresaApiItem[]>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }

  const response = await listarEmpresasRequest(token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudieron consultar empresas" }
  }
  return { success: true, status: response.status, data: response.data }
}

export async function listarMunicipiosController(authToken: string): Promise<EmpresaResult<MunicipioApiItem[]>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }

  const response = await listarMunicipiosRequest(token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudieron consultar municipios" }
  }
  return { success: true, status: response.status, data: response.data }
}

export async function listarEmpresasAsignablesController(authToken: string): Promise<EmpresaResult<EmpresaApiItem[]>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }

  const response = await listarEmpresasAsignablesRequest(token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudieron consultar empresas" }
  }
  return { success: true, status: response.status, data: response.data }
}

export async function crearEmpresaController(
  payload: EmpresaPayload,
  authToken: string
): Promise<EmpresaResult<EmpresaApiItem>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }

  const error = validarPayload(payload)
  if (error) return { success: false, status: 400, error }

  const response = await crearEmpresaRequest(payload, token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudo crear la empresa" }
  }
  return { success: true, status: response.status, message: response.message || "Empresa creada", data: response.data }
}

export async function actualizarEmpresaController(
  idEmpresa: number,
  payload: EmpresaPayload,
  authToken: string
): Promise<EmpresaResult<EmpresaApiItem>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }
  if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) return { success: false, status: 400, error: "id_empresa inválido" }

  const error = validarPayload(payload)
  if (error) return { success: false, status: 400, error }

  const response = await actualizarEmpresaRequest(idEmpresa, payload, token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudo actualizar la empresa" }
  }
  return { success: true, status: response.status, message: response.message || "Empresa actualizada", data: response.data }
}

export async function eliminarEmpresaController(
  idEmpresa: number,
  authToken: string
): Promise<EmpresaResult<null>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }
  if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) return { success: false, status: 400, error: "id_empresa inválido" }

  const response = await eliminarEmpresaRequest(idEmpresa, token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudo eliminar la empresa" }
  }
  return { success: true, status: response.status, message: response.message || "Empresa eliminada" }
}

export async function obtenerMisCredencialesMipresController(authToken: string): Promise<EmpresaResult<CredencialesMipresApiItem>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }

  const response = await obtenerMisCredencialesMipresRequest(token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudieron consultar las credenciales" }
  }
  return { success: true, status: response.status, data: response.data }
}

export async function guardarTokensFuenteController(
  payload: { token_subsidiado?: string | null; token_contributivo?: string | null },
  authToken: string
): Promise<EmpresaResult<CredencialesMipresApiItem>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }
  if (!payload.token_subsidiado?.trim() && !payload.token_contributivo?.trim()) {
    return { success: false, status: 400, error: "Debe indicar al menos un token (subsidiado o contributivo)" }
  }

  const response = await guardarTokensFuenteRequest(payload, token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudieron guardar las credenciales" }
  }
  return { success: true, status: response.status, message: response.message || "Credenciales guardadas", data: response.data }
}

export async function guardarTokensValidadosController(
  payload: { token_subsidiado_validado?: string | null; token_contributivo_validado?: string | null },
  authToken: string
): Promise<EmpresaResult<CredencialesMipresApiItem>> {
  const token = authToken.trim()
  if (!token) return { success: false, status: 401, error: "Token JWT requerido" }
  if (!payload.token_subsidiado_validado?.trim() && !payload.token_contributivo_validado?.trim()) {
    return { success: false, status: 400, error: "Debe indicar al menos un token de acceso" }
  }

  const response = await guardarTokensValidadosRequest(payload, token)
  if (!response.success) {
    return { success: false, status: response.status, error: response.message || "No se pudo guardar el token de acceso" }
  }
  return { success: true, status: response.status, message: response.message || "Token de acceso guardado", data: response.data }
}
