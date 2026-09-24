// Modelo de Credenciales MIPRES

export interface MipresCredentials {
  nit: string
  nitIps?: string
  tokenSubsidiado?: string
  tokenContributivo?: string
  tokenAcceso: string
  tokenAccesoSubsidiado?: string
  tokenAccesoContributivo?: string
  authToken?: string
  contrasena?: string
  usuario?: string
  usuarioSesion?: string
  documentoUsuario?: string
  rolMipres?: RolMipres
  rol_nombre?: string
  // Empresa (mipres.empresa) asignada al usuario logueado (ya no una única
  // "empresa actual" por variable de entorno: cada usuario tiene la suya).
  nombreEmpresa?: string
  direccionEmpresa?: string
  municipioEmpresa?: string
  municipioCodigoEmpresa?: string
  departamentoEmpresa?: string
  departamentoCodigoEmpresa?: string
  idTipoEmpresa?: number
}

export interface TokenResponse {
  success: boolean
  tokenAcceso?: string
  tokenAccesoSubsidiado?: string
  tokenAccesoContributivo?: string
  error?: string
  details?: string
}

export type RolMipres = number

export interface AuthLoginRequest {
  usuario: string
  contrasena: string
}

export interface AuthRegisterRequest {
  usuario: string
  password: string
  rol_mipres?: number
  id_empresa: number
}

export interface AuthLoginApiResponse {
  token: string
  expiresIn?: number // Segundos de vida del token (JWT_EXPIRES_IN en el backend)
  refreshToken?: string // Token opaco para renovar sesion sin pedir contrasena
  refreshExpiresIn?: number // Segundos de vida del refresh token
  usuario: string
  rol_mipres: number
  rol_nombre?: string
  nit?: string
  nombre_empresa?: string
  direccion_empresa?: string
  municipio_empresa?: string
  municipio_codigo_empresa?: string
  departamento_empresa?: string
  departamento_codigo_empresa?: string
  id_tipo_empresa?: number
}

export interface AuthSession {
  authToken: string
  expiresIn?: number // Segundos de vida del token
  refreshToken?: string
  refreshExpiresIn?: number
  usuario: string
  rolMipres: RolMipres
  rolNombre?: string
  // Empresa (mipres.empresa) asignada al usuario, tal como la devuelve el
  // backend (login/refresh). Sin esto, el NIT/nombre de empresa nunca llega
  // al cliente y la card de Configuración/el header quedan sin datos.
  nit?: string
  nombreEmpresa?: string
  direccionEmpresa?: string
  municipioEmpresa?: string
  municipioCodigoEmpresa?: string
  departamentoEmpresa?: string
  departamentoCodigoEmpresa?: string
  idTipoEmpresa?: number
}

export interface AuthLoginResult {
  success: boolean
  session?: AuthSession
  error?: string
  details?: string
  status?: number
}

export interface AuthRegisterApiResponse {
  message?: string
}

export interface AuthRegisterResult {
  success: boolean
  message?: string
  error?: string
  details?: string
  status?: number
}

export interface AuthRestablecerPasswordRequest {
  id_usuario_mipres: number
  nueva_password: string
  authToken: string
}

export interface AuthRestablecerPasswordResult {
  success: boolean
  message?: string
  error?: string
  details?: string
  status?: number
}
