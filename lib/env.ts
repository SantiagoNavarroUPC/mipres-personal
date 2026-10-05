export function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export function getBackendApiUrl(): string {
  const value = process.env.MIPRES_API_URL?.trim()

  if (!value) {
    throw new Error("Missing required env var: MIPRES_API_URL")
  }
  return value
}
