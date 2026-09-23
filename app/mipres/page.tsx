"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MipresHeader } from "@/components/MipresHeader"
import { MipresSidebar } from "@/components/MipresSidebar"
import { PrescripcionModule } from "@/modules/PrescripcionModule"
import { DireccionamientoModule } from "@/modules/DireccionamientoModule"
import { NoDireccionamientoModule } from "@/modules/NoDireccionamientoModule"
import { SuministroModule } from "@/modules/SuministroModule"
import { ProgramacionModule } from "@/modules/ProgramacionModule"
import { EntregaModule } from "@/modules/EntregaModule"
import { TutelasModule } from "@/modules/TutelaModule"
import { ConfiguracionModule } from "@/modules/ConfiguracionModule"
import { UsuariosModule } from "@/modules/UsuariosModule"
import { ReporteEntregaModule } from "@/modules/ReporteEntregaModule"
import { InformesModule } from "@/modules/InformesModule"
import { FacturacionModule } from "@/modules/FacturacionModule"
import type { MipresCredentials } from "@/models/credentials.model"
import { secureStorageGetItem, secureStorageRemoveItem, secureStorageSetItem } from "@/lib/secure-storage"
import { obtenerPermisosPorRol } from "@/requests/Backend/permisos.requests"
import type { Permiso } from "@/models/permisos.model"
import { MODULOS } from "@/models/permisos.model"

export type MipresModule = "prescripcion" | "direccionamiento" | "no_direccionamiento" | "programacion" | "entrega" | "reporte_entrega" | "suministro" | "facturacion" | "tutelas" | "configuracion" | "usuarios" | "informes"

export type { MipresCredentials } from "@/models/credentials.model"

function buildModuleUrl(module: MipresModule) {
  return `/mipres?module=${encodeURIComponent(module)}`
}

function MipresContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeModule, setActiveModule] = useState<MipresModule>("prescripcion")
  const [credentials, setCredentials] = useState<MipresCredentials>({
    nit: "",
    tokenSubsidiado: "",
    tokenContributivo: "",
    tokenAcceso: "",
    tokenAccesoSubsidiado: undefined,
    tokenAccesoContributivo: undefined,
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [credentialsLoaded, setCredentialsLoaded] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [permisosLoaded, setPermisosLoaded] = useState(false)

  useEffect(() => {
    const loggedIn = secureStorageGetItem("mipres_logged_in") === "true"
    const expiresAtRaw = secureStorageGetItem("mipres_session_expires_at")
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : NaN
    const sessionValid = loggedIn && Number.isFinite(expiresAt) && Date.now() < expiresAt

    if (!sessionValid) {
      secureStorageRemoveItem("mipres_logged_in")
      secureStorageRemoveItem("mipres_session_expires_at")
      secureStorageRemoveItem("mipres_credentials")
      router.replace("/login")
      return
    }

    setAuthChecked(true)

    if (window.innerWidth >= 768) {
      setSidebarOpen(true)
    }

    const saved = secureStorageGetItem("mipres_credentials")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCredentials(parsed)
        setCredentialsLoaded(true)
      } catch {
      }
    }
  }, [])

  useEffect(() => {
    if (credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo) {
      secureStorageSetItem("mipres_credentials", JSON.stringify(credentials))
    }
  }, [credentials])

  useEffect(() => {
    if (!credentialsLoaded) return

    const rawToken = String(credentials.authToken || "").trim()
    if (!rawToken) {
      secureStorageRemoveItem("mipres_logged_in")
      secureStorageRemoveItem("mipres_session_expires_at")
      secureStorageRemoveItem("mipres_credentials")
      router.replace("/login")
      return
    }

    const role = credentials.rolMipres ?? 3
    const authHeader = rawToken.toLowerCase().startsWith("bearer ") ? rawToken : `Bearer ${rawToken}`

    let active = true
    setPermisosLoaded(false)
    obtenerPermisosPorRol(role, authHeader)
      .then((perms) => {
        if (!active) return
        setPermisos(perms)
      })
      .catch((error) => {
        console.error("Error loading permissions:", error)
        if (!active) return
        secureStorageRemoveItem("mipres_logged_in")
        secureStorageRemoveItem("mipres_session_expires_at")
        secureStorageRemoveItem("mipres_credentials")
        setPermisos([])
        router.replace("/login")
      })
      .finally(() => {
        if (active) setPermisosLoaded(true)
      })

    return () => {
      active = false
    }
  }, [credentialsLoaded, credentials.authToken, credentials.rolMipres, router])

  function hasModulePermission(module: MipresModule): boolean {
    return permisos.some((p) => p.modulo_id === module && p.activo === true)
  }

  const previousModuleRef = useRef<MipresModule>("prescripcion")

  useEffect(() => {
    const moduleParam = searchParams.get("module")
    if (
      moduleParam === "prescripcion" ||
      moduleParam === "direccionamiento" ||
      moduleParam === "no_direccionamiento" ||
      moduleParam === "programacion" ||
      moduleParam === "entrega" ||
      moduleParam === "suministro" ||
      moduleParam === "facturacion" ||
      moduleParam === "tutelas" ||
      moduleParam === "configuracion" ||
      moduleParam === "usuarios" ||
      moduleParam === "informes"
    ) {
      setActiveModule(moduleParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (!permisosLoaded) return

    if (hasModulePermission(activeModule)) {
      previousModuleRef.current = activeModule
      return
    }

    const fallback =
      hasModulePermission(previousModuleRef.current)
        ? previousModuleRef.current
        : (MODULOS.find((m) => hasModulePermission(m.id as MipresModule))?.id as MipresModule | undefined)

    if (!fallback || fallback === activeModule) return

    setActiveModule(fallback)
    router.replace(buildModuleUrl(fallback))
  }, [activeModule, permisosLoaded, permisos, router])

  if (!authChecked) {
    return null
  }

  const renderModule = () => {
    if (!permisosLoaded) {
      return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando...</div>
    }

    if (!hasModulePermission(activeModule)) {
      return null
    }

    switch (activeModule) {
      case "prescripcion":
        return <PrescripcionModule credentials={credentials} />
      case "direccionamiento":
        return <DireccionamientoModule credentials={credentials} />
      case "no_direccionamiento":
        return <NoDireccionamientoModule credentials={credentials} />
      case "programacion":
        return <ProgramacionModule credentials={credentials} />
      case "entrega":
        return <EntregaModule credentials={credentials} />
      case "reporte_entrega":
        return <ReporteEntregaModule credentials={credentials} />
      case "suministro":
        return <SuministroModule credentials={credentials} />
      case "facturacion":
        return <FacturacionModule credentials={credentials} />
      case "tutelas":
        return <TutelasModule credentials={credentials} />
      case "configuracion":
        return <ConfiguracionModule credentials={credentials} onSave={(cred) => {
          setCredentials((prev) => ({ ...prev, ...cred }))
          if (cred.nit && cred.tokenSubsidiado && cred.tokenContributivo && cred.tokenAccesoSubsidiado && cred.tokenAccesoContributivo) {
            setCredentialsLoaded(true)
          }
        }} />
      case "usuarios":
        return <UsuariosModule credentials={credentials} />
      case "informes":
        return <InformesModule credentials={credentials} />
      default:
        return <PrescripcionModule credentials={credentials} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MipresHeader
        credentials={credentials}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 top-[60px] z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        <MipresSidebar
          activeModule={activeModule}
          onModuleChange={(module) => {
            if (!hasModulePermission(module)) return
            setActiveModule(module)
            router.push(buildModuleUrl(module))
            if (window.innerWidth < 768) {
              setSidebarOpen(false)
            }
          }}
          isOpen={sidebarOpen}
          permisos={permisos}
          permisosLoaded={permisosLoaded}
        />
        <main className={`flex-1 min-w-0 w-full p-3 sm:p-4 lg:p-6 transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "md:ml-0"}`}>
          <div key={`${credentials.nit}-${credentials.tokenAcceso}`}>
            {renderModule()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function MipresPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <MipresContent />
    </Suspense>
  )
}
