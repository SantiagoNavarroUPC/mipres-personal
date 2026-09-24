'use client'

import { useEffect, useState } from "react"
import {
  Loader2,
  AlertCircle,
  FileText,
  ArrowRight,
  Package,
  ClipboardCheck,
  FileBarChart,
  ClipboardList,
  Settings,
  ArrowLeft,
  Users,
  CalendarClock,
  Truck,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import type { MipresCredentials } from "@/models/credentials.model"
import type { ModuloApp, Permiso } from "@/models/permisos.model"
import { MODULOS } from "@/models/permisos.model"
import { obtenerPermisosPorRol, actualizarPermiso, obtenerModulos, foldAccents } from "@/requests/Backend/permisos.requests"

const ID_TIPO_EMPRESA_AMBAS = 3

interface PermisosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rolId: number
  rolNombre: string
  // mipres.rol_mipres.id_tipo_empresa: 1=IPS, 2=EPS, 3=AMBAS
  rolTipoEmpresa?: number
  credentials: MipresCredentials
  showForm?: boolean
}

export function PermisosModal({
  open,
  onOpenChange,
  rolId,
  rolNombre,
  rolTipoEmpresa,
  credentials,
  showForm = true,
}: PermisosModalProps) {
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [modulosReales, setModulosReales] = useState<ModuloApp[]>([])
  const [loading, setLoading] = useState(false)
  const [updatingModulo, setUpdatingModulo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  function getAuthHeader() {
    const rawToken = String(credentials?.authToken || "").trim()
    return rawToken
      ? rawToken.toLowerCase().startsWith("bearer ")
        ? rawToken
        : `Bearer ${rawToken}`
      : undefined
  }

  // slug de UI para un módulo real de la base, matcheado por nombre (no por id)
  function slugFor(modulo: ModuloApp): string {
    const meta = MODULOS.find((m) => foldAccents(m.label) === foldAccents(modulo.nombre))
    return meta?.id ?? String(modulo.id)
  }

  // Un rol AMBAS (o sin tipo definido) ve todos los módulos. Un rol IPS/EPS
  // solo ve módulos compatibles con su propio tipo (o módulos AMBAS).
  const modulosVisibles =
    rolTipoEmpresa == null || rolTipoEmpresa === ID_TIPO_EMPRESA_AMBAS
      ? modulosReales
      : modulosReales.filter((m) => m.id_tipo_empresa == null || m.id_tipo_empresa === ID_TIPO_EMPRESA_AMBAS || m.id_tipo_empresa === rolTipoEmpresa)

  // Cargar módulos (mipres.modulos_app) y permisos del rol cuando se abre el modal
  useEffect(() => {
    if (!open) return

    const loadPermisos = async () => {
      try {
        setLoading(true)
        setError(null)
        const authHeader = getAuthHeader()

        const [perms, modulos] = await Promise.all([
          obtenerPermisosPorRol(rolId, authHeader),
          obtenerModulos(authHeader),
        ])
        setPermisos(perms)
        setModulosReales(modulos)
      } catch (err) {
        console.error("Error cargando permisos:", err)
        setError(err instanceof Error ? err.message : "Error al cargar permisos")
        setPermisos([])
        setModulosReales([])
      } finally {
        setLoading(false)
      }
    }

    loadPermisos()
  }, [open, rolId, credentials?.authToken])

  const handleTogglePermiso = async (modulo: ModuloApp, currentActivo: boolean) => {
    const slug = slugFor(modulo)
    try {
      setUpdatingModulo(slug)
      const authHeader = getAuthHeader()

      await actualizarPermiso(rolId, modulo.id, !currentActivo, authHeader)

      setPermisos((prev) => {
        const exists = prev.some((p) => p.modulo_id === slug)
        if (!exists) {
          return [...prev, { consecutivo_rol: rolId, modulo_id: slug, activo: !currentActivo }]
        }
        return prev.map((p) => (p.modulo_id === slug ? { ...p, activo: !currentActivo } : p))
      })

      toast({
        title: "Éxito",
        description: `Permiso de ${modulo.nombre} ${!currentActivo ? "activado" : "desactivado"}`,
      })
    } catch (err) {
      console.error("Error actualizando permiso:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo actualizar el permiso",
        variant: "destructive",
      })
    } finally {
      setUpdatingModulo(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          showForm
            ? "!max-w-none sm:!max-w-none !w-[70vw] !h-[60vh] max-h-none overflow-y-auto scrollbar-hidden border-0 bg-background text-foreground shadow-[0_18px_40px_rgba(15,118,110,0.12)]"
            : "max-w-sm border-0 bg-background text-foreground shadow-[0_18px_40px_rgba(15,118,110,0.12)]"
        }
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E6F7F5] text-[#0f766e] dark:bg-primary/20 dark:text-primary">
              <Settings className="h-4 w-4" />
            </span>
            <DialogTitle>Permisos del Rol</DialogTitle>
          </div>
          <DialogDescription>
            Gestionar permisos de acceso a módulos para <span className="font-semibold">{rolNombre}</span> (ID: {rolId})
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Cargando permisos...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {modulosVisibles.map((modulo) => {
              const slug = slugFor(modulo)
              const meta = MODULOS.find((m) => m.id === slug)
              const permiso = permisos.find((p) => p.modulo_id === slug)
              const activo = permiso?.activo ?? false
              const isUpdating = updatingModulo === slug
              const ICON_MAP: Record<string, React.ElementType> = {
                prescripcion: FileText,
                direccionamiento: ArrowRight,
                tutelas: ClipboardList,
                no_direccionamiento: ArrowLeft,
                programacion: CalendarClock,
                entrega: Truck,
                reporte_entrega: ClipboardCheck,
                suministro: Package,
                facturacion: Receipt,
                usuarios: Users,
                informes: FileBarChart,
                configuracion: Settings,
              }
              const Icon = ICON_MAP[slug] ?? FileText

              return (
                <div
                  key={modulo.id}
                  className="flex items-center justify-between rounded-lg border border-[#D8EBDD] bg-[#F4FAF4] p-3 transition-colors hover:bg-[#EAF7EA] dark:border-primary/25 dark:bg-primary/10 dark:hover:bg-primary/15"
                >
                  <div className="flex items-center flex-1 pr-3 gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className={"font-medium text-sm " + (activo ? "text-accent-foreground" : "text-foreground")}>{meta?.label ?? modulo.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-1">{meta?.description ?? modulo.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-muted-foreground">{activo ? "Activo" : "Inactivo"}</span>
                    <Switch
                      checked={activo}
                      onCheckedChange={() => handleTogglePermiso(modulo, activo)}
                      disabled={isUpdating}
                    />
                    {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
