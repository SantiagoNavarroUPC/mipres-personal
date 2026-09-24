"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Building2, AlertCircle, Plus, Pencil, Trash2, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { MipresCredentials } from "@/models/credentials.model"
import { fetchWithAuth } from "@/lib/auth"
import type { EmpresaApiItem, EmpresaPayload, MunicipioApiItem } from "@/requests/Backend/empresa.requests"
import { EmpresaModalForm } from "./EmpresaModalForm"

const TIPO_EMPRESA_LABEL: Record<number, string> = {
  1: "IPS",
  2: "EPS",
  3: "Ambas",
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
      toast({ title: "Empresa eliminada" })
      await cargarEmpresas()
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <Card className="relative pt-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 z-10 h-5 w-5 rounded-sm p-0 opacity-40 hover:opacity-100"
        aria-label="Agregar empresa"
        onClick={async () => {
          setEmpresaEditando(null)
          await cargarMunicipios()
          setModalOpen(true)
        }}
      >
        <Plus className="h-3 w-3" />
        <span className="sr-only">Agregar empresa</span>
      </Button>

      <EmpresaModalForm
        open={modalOpen}
        onOpenChange={setModalOpen}
        empresa={empresaEditando}
        municipios={municipios}
        loadingMunicipios={loadingMunicipios}
        onSubmit={handleSubmit}
      />

      <CardContent className="px-3 pt-2 pb-2">
        {error ? (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 px-2 pb-0 pt-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando empresas...
          </div>
        ) : empresas.length === 0 ? (
          <div className="flex items-center gap-2 px-2 pb-0 pt-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            No hay empresas registradas
          </div>
        ) : (
          <div className="grid gap-3 px-2 pb-1 pt-2 sm:grid-cols-2 xl:grid-cols-3">
            {empresas.map((empresa) => (
              <div key={empresa.id_empresa} className="rounded-lg border bg-background p-4 shadow-sm relative">
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-60 hover:opacity-100"
                    aria-label="Editar empresa"
                    onClick={async () => {
                      setEmpresaEditando(empresa)
                      await cargarMunicipios()
                      setModalOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive opacity-60 hover:opacity-100 hover:text-destructive"
                    aria-label="Eliminar empresa"
                    disabled={eliminandoId === empresa.id_empresa}
                    onClick={() => void handleEliminar(empresa)}
                  >
                    {eliminandoId === empresa.id_empresa ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="text-xs uppercase tracking-wide text-muted-foreground">NIT {empresa.nit}</p>
                <p className="text-sm font-semibold text-foreground pr-16">{empresa.nombre}</p>
                {empresa.direccion ? (
                  <p className="mt-1 text-xs text-muted-foreground">{empresa.direccion}</p>
                ) : null}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {empresa.municipio_nombre}, {empresa.departamento_nombre}
                  </Badge>
                  <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {TIPO_EMPRESA_LABEL[empresa.id_tipo_empresa] ?? empresa.id_tipo_empresa}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
