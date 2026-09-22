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
}

export interface AuthLoginApiResponse {
  token: string
  expiresIn?: number // Segundos de vida del token (JWT_EXPIRES_IN en el backend)
  refreshToken?: string // Token opaco para renovar sesion sin pedir contrasena
  refreshExpiresIn?: number // Segundos de vida del refresh token
  usuario: string
  rol_mipres: number
  rol_nombre?: string
}

export interface AuthSession {
  authToken: string
  expiresIn?: number // Segundos de vida del token
  refreshToken?: string
  refreshExpiresIn?: number
  usuario: string
  rolMipres: RolMipres
  rolNombre?: string
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
