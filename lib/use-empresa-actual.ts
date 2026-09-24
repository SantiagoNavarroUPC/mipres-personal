"use client"

import { useEffect, useState } from "react"
import { secureStorageGetItem } from "./secure-storage"

// Reemplaza NEXT_PUBLIC_TIPO_USUARIO / NEXT_PUBLIC_NIT_EPSI / NEXT_PUBLIC_NIT_IPS:
// la empresa (IPS/EPS) ya no es una configuración global de la instancia, es
// del usuario logueado (mipres.usuario_mipres.id_empresa). El login guarda
// nombreEmpresa/idTipoEmpresa en la sesión (mipres_credentials); este hook
// solo lee esa sesión ya persistida, sin pedir nada al servidor.
export interface EmpresaSesion {
  nombreEmpresa: string | null
  direccionEmpresa: string | null
  municipioEmpresa: string | null
  municipioCodigoEmpresa: string | null
  departamentoEmpresa: string | null
  departamentoCodigoEmpresa: string | null
  idTipoEmpresa: number | null
}

const EMPRESA_SESION_VACIA: EmpresaSesion = {
  nombreEmpresa: null,
  direccionEmpresa: null,
  municipioEmpresa: null,
  municipioCodigoEmpresa: null,
  departamentoEmpresa: null,
  departamentoCodigoEmpresa: null,
  idTipoEmpresa: null,
}

// Exportada para código no-React (ej. generadores de PDF) que necesita leer
// la empresa de la sesión sin poder usar el hook.
export function leerEmpresaDeSesion(): EmpresaSesion {
  try {
    const raw = secureStorageGetItem("mipres_credentials")
    if (!raw) return EMPRESA_SESION_VACIA
    const parsed = JSON.parse(raw)
    return {
      nombreEmpresa: parsed?.nombreEmpresa ?? null,
      direccionEmpresa: parsed?.direccionEmpresa ?? null,
      municipioEmpresa: parsed?.municipioEmpresa ?? null,
      municipioCodigoEmpresa: parsed?.municipioCodigoEmpresa ?? null,
      departamentoEmpresa: parsed?.departamentoEmpresa ?? null,
      departamentoCodigoEmpresa: parsed?.departamentoCodigoEmpresa ?? null,
      idTipoEmpresa: typeof parsed?.idTipoEmpresa === "number" ? parsed.idTipoEmpresa : null,
    }
  } catch {
    return EMPRESA_SESION_VACIA
  }
}

export function useEmpresaActual(): { empresa: EmpresaSesion; loading: boolean; esIPS: boolean } {
  const [empresa, setEmpresa] = useState<EmpresaSesion>(EMPRESA_SESION_VACIA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setEmpresa(leerEmpresaDeSesion())
    setLoading(false)
  }, [])

  return { empresa, loading, esIPS: empresa.idTipoEmpresa === 1 }
}
