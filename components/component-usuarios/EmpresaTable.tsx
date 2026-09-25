"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Building2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  X,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { MipresCredentials } from "@/models/credentials.model"
import { fetchWithAuth } from "@/lib/auth"
import type { EmpresaApiItem, EmpresaPayload, MunicipioApiItem } from "@/requests/Backend/empresa.requests"
import { EmpresaModalForm } from "./EmpresaModalForm"

const TIPO_EMPRESA_CONFIG: Record<
  number,
  { label: string; className: string }
> = {
  1: {
    label: "IPS",
    className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
  },
  2: {
    label: "EPS",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  },
  3: {
    label: "IPS / EPS",
    className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  },
}

interface EmpresaTableProps {
  credentials: MipresCredentials
}

export default function EmpresaTable({ credentials }: EmpresaTableProps) {
  const [empresas, setEmpresas] = useState<EmpresaApiItem[]>([])
  const [municipios, setMunicipios] = useState<MunicipioApiItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState<EmpresaApiItem | null>(null)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  async function cargarEmpresas() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth("/api/empresa")
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.success) {
        setEmpresas([])
        setError(body?.message || "No se pudieron cargar las empresas")
        return
      }
      setEmpresas(body.data || [])
    } catch {
      setEmpresas([])
      setError("Error de conexión al consultar empresas")
    } finally {
      setLoading(false)
    }
  }

  async function cargarMunicipios() {
    if (municipios.length > 0) return
    setLoadingMunicipios(true)
    try {
      const res = await fetchWithAuth("/api/empresa/municipios")
      const body = await res.json().catch(() => null)
      if (res.ok && body?.success) {
        setMunicipios(body.data || [])
      }
    } finally {
      setLoadingMunicipios(false)
    }
  }

  useEffect(() => {
    void cargarEmpresas()
  }, [])

  async function handleSubmit(payload: EmpresaPayload): Promise<{ success: boolean; error?: string }> {
    const res = await fetchWithAuth(
      empresaEditando ? `/api/empresa/${empresaEditando.id_empresa}` : "/api/empresa",
      {
        method: empresaEditando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )
    const body = await res.json().catch(() => null)
    const success = res.ok && Boolean(body?.success)
    if (success) {
      await cargarEmpresas()
    }
    return { success, error: body?.message }
  }

  async function handleEliminar(empresa: EmpresaApiItem) {
    setEliminandoId(empresa.id_empresa)
    try {
      const res = await fetchWithAuth(`/api/empresa/${empresa.id_empresa}`, { method: "DELETE" })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.success) {
        toast({ title: "Error", description: body?.message || "No se pudo eliminar la empresa", variant: "destructive" })
        return
      }
      toast({ title: "Empresa eliminada", description: `Se eliminó ${empresa.nombre}` })
      await cargarEmpresas()
    } finally {
      setEliminandoId(null)
    }
  }

  const filteredEmpresas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return empresas
    return empresas.filter(
      (e) =>
        e.nombre?.toLowerCase().includes(q) ||
        String(e.nit || "").includes(q) ||
        e.municipio_nombre?.toLowerCase().includes(q) ||
        e.departamento_nombre?.toLowerCase().includes(q)
    )
  }, [empresas, searchQuery])

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre, NIT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-8 text-xs md:text-xs placeholder:text-xs bg-background border-border/80 rounded-lg focus-visible:ring-1 focus-visible:ring-primary w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 cursor-pointer border-border hover:bg-muted"
            onClick={() => void cargarEmpresas()}
            disabled={loading}
            title="Actualizar listado"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            className="h-9 gap-1.5 font-medium text-xs bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer rounded-lg px-3.5"
            onClick={async () => {
              setEmpresaEditando(null)
              await cargarMunicipios()
              setModalOpen(true)
            }}
          >
            <Plus className="size-3.5" />
            <span>Nueva Empresa</span>
          </Button>
        </div>
      </div>

      <EmpresaModalForm
        open={modalOpen}
        onOpenChange={setModalOpen}
        empresa={empresaEditando}
        municipios={municipios}
        loadingMunicipios={loadingMunicipios}
        onSubmit={handleSubmit}
      />

      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Table Card */}
      <div className="w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 py-2.5 animate-pulse">
              <div className="size-8 rounded-lg bg-muted shrink-0" />
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/6" />
              <div className="h-4 bg-muted rounded w-1/6" />
              <div className="h-4 bg-muted rounded w-1/5 ml-auto" />
            </div>
          ))}
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <Building2 className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-sm text-foreground">
            {searchQuery ? "No se encontraron empresas" : "No hay empresas registradas"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery
              ? "Prueba buscando con otro término o limpia el filtro de búsqueda."
              : "Agrega la primera IPS o EPS para comenzar la operación en MIPRES."}
          </p>
          {searchQuery ? (
            <Button
              variant="link"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs"
            >
              Limpiar filtro
            </Button>
          ) : (
            <Button
              size="sm"
              className="mt-3 text-xs bg-primary text-primary-foreground gap-1.5"
              onClick={async () => {
                setEmpresaEditando(null)
                await cargarMunicipios()
                setModalOpen(true)
              }}
            >
              <Plus className="size-3.5" />
              Crear Empresa
            </Button>
          )}
        </div>
      ) : (
        <div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider border-b border-border w-[35%]">
                    Empresa / Razón Social
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider border-b border-border">
                    NIT
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider border-b border-border">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider border-b border-border">
                    Ubicación
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-foreground/80 tracking-wider border-b border-border text-right pr-4">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredEmpresas.map((empresa) => {
                  const tipoConfig = TIPO_EMPRESA_CONFIG[empresa.id_tipo_empresa] ?? {
                    label: `Tipo ${empresa.id_tipo_empresa}`,
                    className: "bg-muted text-muted-foreground",
                  }

                  return (
                    <tr key={empresa.id_empresa} className="hover:bg-muted/30 transition-colors">
                      {/* Empresa */}
                      <td className="px-4 py-3.5 border-b border-border/80">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                            <Building2 className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs sm:text-sm text-foreground leading-tight truncate">
                              {empresa.nombre}
                            </p>
                            {empresa.direccion && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {empresa.direccion}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* NIT */}
                      <td className="px-4 py-3.5 border-b border-border/80">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-foreground">
                          {empresa.nit}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3.5 border-b border-border/80">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold border ${tipoConfig.className}`}
                        >
                          {tipoConfig.label}
                        </Badge>
                      </td>

                      {/* Ubicación */}
                      <td className="px-4 py-3.5 border-b border-border/80">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 text-primary/70 shrink-0" />
                          <span className="truncate">
                            {empresa.municipio_nombre}, {empresa.departamento_nombre}
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 border-b border-border/80 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            aria-label={`Editar ${empresa.nombre}`}
                            title="Editar empresa"
                            onClick={async () => {
                              setEmpresaEditando(empresa)
                              await cargarMunicipios()
                              setModalOpen(true)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            aria-label={`Eliminar ${empresa.nombre}`}
                            title="Eliminar empresa"
                            disabled={eliminandoId === empresa.id_empresa}
                            onClick={() => void handleEliminar(empresa)}
                          >
                            {eliminandoId === empresa.id_empresa ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <p>
              Mostrando{" "}
              <span className="font-semibold text-foreground">
                {filteredEmpresas.length}
              </span>{" "}
              de <span className="font-semibold text-foreground">{empresas.length}</span> empresas registradas
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
