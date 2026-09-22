"use client"

import { useEffect } from "react"
import { validateStoredCredentials } from "@/lib/auth"

/**
 * Componente que valida las credenciales almacenadas al cargar la app.
 * Limpia credenciales expiradas e intenta hacer refresh si es necesario.
 * Se debe renderizar temprano en el árbol de componentes.
 */
export function CredentialsValidator() {
  useEffect(() => {
    validateStoredCredentials().catch(() => {
      // Silent fail - las credenciales se limpiarán si están expiradas
    })
  }, [])

  return null
}
