"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Direccionamiento } from "@/models/mipres-sispro/direccionamiento"
import type { MipresCredentials } from "@/models/credentials.model"

interface DireccionamientoModalAnularProps {
  open: boolean
  onClose: () => void
  items: Direccionamiento[]
  credentials: MipresCredentials
  onSuccess?: () => void
}

const PAGE_SIZE = 6

export function DireccionamientoModalAnular({ open, onClose, items, credentials, onSuccess }: DireccionamientoModalAnularProps) {
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [anuladosIds, setAnuladosIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)

  const handleAnular = async (item: Direccionamiento) => {
    if (!item.IDDireccionamiento) return

    if (!credentials.nit) {
      toast.error("NIT no configurado")
      return
    }

    const token = item.tipoRegimen === "Subsidiado" 
      ? credentials.tokenAccesoSubsidiado 
      : item.tipoRegimen === "Contributivo"
      ? credentials.tokenAccesoContributivo
      : credentials.tokenAcceso

    if (!token) {
      toast.error(`Token ${item.tipoRegimen || "Principal"} no configurado`)
      return
    }

    setAnulandoId(item.IDDireccionamiento)
    try {
      const response = await fetch("/api/mipres/direccionamiento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit: credentials.nit,
          tokenAcceso: token,
          idDireccionamiento: item.IDDireccionamiento,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(`Direccionamiento ${item.IDDireccionamiento} anulado`)
        setAnuladosIds(prev => new Set(prev).add(item.IDDireccionamiento!))
        onSuccess?.()
      } else {
        let errorMsg = result.error || "Error al anular"
        
        // Manejar estructura de errores si no vino pre-procesada
        if (result.details?.Errors && Array.isArray(result.details.Errors)) {
           errorMsg = result.details.Errors[0]
        } else if (result.Errors && Array.isArray(result.Errors)) {
           errorMsg = result.Errors[0]
        }
        
        toast.error(errorMsg)
      }
    } catch (error) {
      toast.error("Error de conexión")
    } finally {
      setAnulandoId(null)
    }
  }

  const itemsVigentes = items.filter(i => !i.FecAnulacion && !anuladosIds.has(i.IDDireccionamiento || ""))
  const noPrescripcion = items[0]?.NoPrescripcion || ""
  const totalPages = Math.max(1, Math.ceil(itemsVigentes.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = itemsVigentes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Anular Direccionamientos</DialogTitle>
          <DialogDescription>
            Prescripción: <span className="font-mono font-medium">{noPrescripcion}</span>
          </DialogDescription>
        </DialogHeader>

        {itemsVigentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-muted p-3 rounded-full mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No hay direccionamientos vigentes para anular.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Precaución</AlertTitle>
              <AlertDescription>
                La anulación es irreversible. Verifique el ID antes de proceder.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              {pageItems.map((item) => (
                <div key={item.IDDireccionamiento} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">{item.IDDireccionamiento}</span>
                      <Badge variant="outline" className="text-[10px]">{item.tipoRegimen || "N/A"}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {`${String(item.TipoTec || "").toUpperCase()}${item.ConTec ?? ""}`} - Entrega {item.NoEntrega}
                      {item.CantTotAEntregar && ` (${item.CantTotAEntregar} unds)`}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleAnular(item)}
                    disabled={anulandoId === item.IDDireccionamiento}
                  >
                    {anulandoId === item.IDDireccionamiento ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Anular
                  </Button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  {itemsVigentes.length} direccionamientos · página {safePage} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
