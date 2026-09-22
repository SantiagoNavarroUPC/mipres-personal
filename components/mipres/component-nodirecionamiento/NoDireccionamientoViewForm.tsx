"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NotebookPen } from "lucide-react"
import type { MipresCredentials } from "@/models/credentials.model"
import type { NoDireccionamientoPayload } from "@/models/mipres-sispro/no_direccionamiento/no_direccionamiento"
import { CAUSAS_NO_ENTREGAS } from "@/models/constants"
import { getArray } from "@/components/mipres/component-prescripcion/utils"
import { toast } from "sonner"

interface NoDireccionamientoModalProps {
  prescripcion: any
  open: boolean
  onClose: () => void
  credentials: MipresCredentials
  onSuccess?: () => void
  tipo?: "prescripcion" | "tutela"
}

import { Checkbox } from "@/components/ui/checkbox"

type NoDireccionamientoRow = {
  id: string
  label: string
  payload: NoDireccionamientoPayload
  observacion: string
  selected: boolean
}

function getPacienteNombre(prescripcion: any): string {
  const nombres = [prescripcion?.PNPaciente, prescripcion?.SNPaciente].filter(Boolean).join(" ")
  const apellidos = [prescripcion?.PAPaciente, prescripcion?.SAPaciente].filter(Boolean).join(" ")
  return `${nombres} ${apellidos}`.trim() || "Paciente"
}

export function NoDireccionamientoModal({ prescripcion, open, onClose, credentials, onSuccess, tipo }: NoDireccionamientoModalProps) {
  const tipoDocumento = tipo || (prescripcion?.NoTutela ? "tutela" : "prescripcion")
  const numero = tipoDocumento === "tutela" ? prescripcion?.NoTutela : prescripcion?.NoPrescripcion

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [rows, setRows] = useState<NoDireccionamientoRow[]>([])
  const [page, setPage] = useState(1)
  // Estado para el input de prescripción asociada por fila
  const [prescripcionAsociada, setPrescripcionAsociada] = useState<string[]>([])
  // Estado para el input de ConTecAsociada por fila
  const [conTecAsociada, setConTecAsociada] = useState<number[]>([])

  useEffect(() => {
    if (!open || !prescripcion) return

    setShowForm(true)
    setFormError(null)
    setFormSuccess(null)
    setPage(1)

    const noPrescripcion = prescripcion.NoPrescripcion || prescripcion.NoTutela || ""
    const tipoIdPaciente = prescripcion.TipoIDPaciente || prescripcion.TipoIDPac || ""
    const noIdPaciente = prescripcion.NoIDPaciente || prescripcion.NroIDPaciente || ""

    const nextRows: NoDireccionamientoRow[] = []

    const pushRows = (
      items: any[],
      tipoTec: string,
      conTecResolver: (item: any, index: number) => number,
      labelResolver: (item: any, index: number) => string
    ) => {
      items.forEach((item, index) => {
        const conTec = conTecResolver(item, index)
        nextRows.push({
          id: `${tipoTec}-${conTec}-${index}`,
          label: labelResolver(item, index),
          observacion: "",
          selected: true,
          payload: {
            NoPrescripcion: String(noPrescripcion),
            TipoTec: tipoTec,
            ConTec: Number(conTec),
            TipoIDPaciente: String(tipoIdPaciente),
            NoIDPaciente: String(noIdPaciente),
            NoPrescripcionAsociada: null,
            ConTecAsociada: 0,
            CausaNoEntrega: 17,
          },
        })
      })
    }

    pushRows(
      getArray(prescripcion, "medicamentos"),
      "M",
      (item, index) => Number(item.ConOrden || index + 1),
      (item, index) => `Medicamento ${index + 1} ${item.DescMedPrinAct || item.DscMedPA || ""}`.trim()
    )

    pushRows(
      getArray(prescripcion, "procedimientos"),
      "P",
      (item, index) => Number(item.ConOrdenPro || item.ConOrden || index + 1),
      (item) => `Procedimiento ${item.CodCUPS || ""} ${item.DescPro || item.NomProc || ""}`.trim()
    )

    pushRows(
      getArray(prescripcion, "dispositivos"),
      "D",
      (item, index) => Number(item.ConOrdenDM || item.ConOrden || index + 1),
      (item) => `Dispositivo ${item.DescDM || item.CodDisp || ""}`.trim()
    )

    pushRows(
      getArray(prescripcion, "productosNutricionales"),
      "N",
      (item, index) => Number(item.ConOrdenPN || item.ConOrden || index + 1),
      (item) => `Producto Nutricional ${item.DescProdNutr || item.DescPN || ""}`.trim()
    )

    pushRows(
      getArray(prescripcion, "serviciosComplementarios"),
      "S",
      (item, index) => Number(item.ConOrdenSC || item.ConOrden || index + 1),
      (item) => `Servicio Complementario ${item.DescSerComp || ""}`.trim()
    )

    setRows(nextRows)
    // Inicializar prescripcionAsociada para cada fila
    setPrescripcionAsociada(nextRows.map(() => ""))
    // Inicializar ConTecAsociada para cada fila
    setConTecAsociada(nextRows.map(() => 0))
  }, [open, prescripcion])

  const handleObservacionChange = (index: number, observacion: string) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        observacion,
      }
      return next
    })
  }

  // Manejar cambio en prescripcion asociada (asegurar que esté en el scope del componente)
  const handlePrescripcionAsociadaChange = (index: number, value: string) => {
    setPrescripcionAsociada((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    setRows((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        payload: {
          ...next[index].payload,
          NoPrescripcionAsociada: value || null,
        },
      }
      return next
    })
  }

  const handleConTecAsociadaChange = (index: number, value: string) => {
    const num = Number(value)
    setConTecAsociada((prev) => {
      const next = [...prev]
      next[index] = isNaN(num) ? 0 : num
      return next
    })
    setRows((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        payload: {
          ...next[index].payload,
          ConTecAsociada: isNaN(num) ? 0 : num,
        },
      }
      return next
    })
  }

  const handleCausalChange = (index: number, causal: string) => {
    const parsed = Number(causal)
    if (Number.isNaN(parsed)) return

    setRows((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        payload: {
          ...next[index].payload,
          CausaNoEntrega: parsed,
        },
      }
      return next
    })
  }

  const toggleSelection = (index: number) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        selected: !next[index].selected,
      }
      return next
    })
  }

  const handleSubmit = async () => {
    const selectedRows = rows.filter((r) => r.selected)
    // Validar prescripcion asociada si alguna causa es 1
    for (const [idx, row] of rows.entries()) {
      if (row.selected && String(row.payload.CausaNoEntrega) === "1") {
        if (!prescripcionAsociada[idx] || !prescripcionAsociada[idx].trim()) {
          setFormError("Debe ingresar la prescripción asociada para la causal 1 en la tecnología seleccionada.")
          return
        }
        if (isNaN(conTecAsociada[idx]) || conTecAsociada[idx] < 0) {
          setFormError("Debe ingresar un ConTec asociado válido (número mayor o igual a 0) para la causal 1.")
          return
        }
      }
    }
    if (selectedRows.length === 0) {
      setFormError("Debe seleccionar al menos una tecnología para registrar no direccionamiento")
      return
    }

    const regimen = prescripcion?.tipoRegimen?.toLowerCase()
    let accessToken = ""

    if (regimen === "subsidiado") {
      accessToken = credentials.tokenAccesoSubsidiado || ""
      if (!accessToken) {
        setFormError("Token Subsidiado no configurado. Valide sus credenciales en Configuración.")
        return
      }
    } else if (regimen === "contributivo") {
      accessToken = credentials.tokenAccesoContributivo || ""
      if (!accessToken) {
        setFormError("Token Contributivo no configurado. Valide sus credenciales en Configuración.")
        return
      }
    } else {
      setFormError(`Régimen no especificado en el registro (valor: "${prescripcion?.tipoRegimen}").`)
      return
    }

    if (!credentials.nit) {
      setFormError("Configure el NIT en Configuración antes de registrar no direccionamiento")
      return
    }

    setSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const errors: string[] = []
      let successCount = 0

      for (const row of selectedRows) {
        const response = await fetch("/api/mipres/no-direccionamiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nit: credentials.nit,
            tokenAcceso: accessToken,
            tipo: "registrar",
            body: row.payload,
          }),
        })

        const result = await response.json()

        if (!result.success) {
          errors.push(result.error || `Error al registrar ${row.label}`)
          continue
        }

        successCount++
      }

      if (successCount === 0) {
        const resumenErrores = errors.slice(0, 3)
        const message = resumenErrores.length > 0
          ? resumenErrores.join("\n")
          : "No se registraron tecnologías"
        setFormError(message)
        toast.error(message)
        return
      }

      if (errors.length > 0) {
        const resumenErrores = errors.slice(0, 3).join("\n")
        setFormSuccess(`No direccionamiento registrado para ${successCount} tecnología(s).`)
        setFormError(`Algunas tecnologías no se registraron:\n${resumenErrores}`)
        toast.warning(`Registro parcial: ${successCount} registradas, ${errors.length} con error`)
      } else {
        setFormSuccess(`No direccionamiento registrado exitosamente para ${successCount} tecnología(s)`)
        toast.success("No direccionamiento registrado exitosamente")
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("no-direccionamiento:refresh"))
      }
      onSuccess?.()
    } catch {
      setFormError("Error de conexión con el servidor")
      toast.error("Error de conexión con el servidor")
    } finally {
      setSubmitting(false)
    }
  }

  const currentRow = rows[page - 1]
  const currentPrescripcionAsociada = prescripcionAsociada[page - 1] || ""
  const currentConTecAsociada = conTecAsociada[page - 1] || 0
  const requierePrescripcionAsociada = String(currentRow?.payload.CausaNoEntrega) === "1"

  if (!prescripcion) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={showForm ? "!max-w-none sm:!max-w-none !w-[70vw] max-h-[90vh] overflow-y-auto scrollbar-hidden !gap-0 !p-6 border dark:border-zinc-700" : "max-w-sm !gap-0 border dark:border-zinc-700"}>
        <div className="flex flex-col gap-1">
          <DialogHeader className="space-y-0 pb-0 mb-0">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <NotebookPen className="h-5 w-5 text-red-600" />
              Formulario de no direccionamiento
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pb-1 text-sm">
              {tipoDocumento === "tutela" ? "Tutela" : "Prescripción"} {numero}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-0 mt-0">
            <div className="p-4 rounded-lg border border-red-200 bg-white/70 dark:border-zinc-700 dark:bg-zinc-900/70">
              <p className="text-sm text-muted-foreground mb-1">Paciente</p>
              <p className="text-sm font-medium text-foreground">{getPacienteNombre(prescripcion)}</p>
            </div>

            {showForm && (
              <div className="space-y-5">
                {(formError || formSuccess) && (
                  <Alert variant={formError ? "destructive" : "default"} className={formSuccess ? "border-green-500 bg-green-50 text-green-700 dark:border-green-700 dark:bg-zinc-900 dark:text-green-300" : "border-red-300 bg-red-100 dark:border-zinc-700 dark:bg-zinc-900"}>
                    <AlertDescription>{formError || formSuccess}</AlertDescription>
                  </Alert>
                )}

                {rows.length === 0 ? (
                  <Alert className="border-red-300 bg-red-100 dark:border-zinc-700 dark:bg-zinc-900">
                    <AlertDescription>No hay tecnologías asociadas para no direccionar.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-5 rounded-md border border-red-200 bg-white/80 p-5 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox 
                          id={`tech-${currentRow.id}`}
                          checked={currentRow.selected}
                          onCheckedChange={() => toggleSelection(page - 1)}
                          className="border-red-300 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600 dark:border-zinc-600"
                        />
                        <label 
                          htmlFor={`tech-${currentRow.id}`}
                          className="text-sm font-medium text-foreground cursor-pointer select-none"
                        >
                          Seleccionar para No Direccionamiento
                        </label>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Tecnología</p>
                        <p className="text-sm text-muted-foreground">{currentRow?.label}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">No. Prescripción</p>
                        <p className="text-sm font-medium">{currentRow?.payload.NoPrescripcion}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">TipoTec</p>
                        <p className="text-sm font-medium">{currentRow?.payload.TipoTec}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ConTec</p>
                        <p className="text-sm font-medium">{currentRow?.payload.ConTec}</p>
                      </div>
                    </div>


                    <div className="space-y-2">
                      <div className="flex flex-col md:flex-row md:items-end gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Causal de no entrega</p>
                          <Select
                            value={String(currentRow?.payload.CausaNoEntrega || "")}
                            onValueChange={(value) => handleCausalChange(page - 1, value)}
                          >
                            <SelectTrigger className="h-10 border-red-200 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-500">
                              <SelectValue placeholder="Seleccione causal" />
                            </SelectTrigger>
                            <SelectContent className="rounded-md border border-red-200 bg-rose-50 dark:border-zinc-700 dark:bg-zinc-900">
                              {Object.entries(CAUSAS_NO_ENTREGAS).map(([codigo, descripcion]) => (
                                <SelectItem key={codigo} value={codigo} className="py-2 hover:bg-rose-100 focus:bg-rose-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800">
                                  {codigo} - {descripcion}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {requierePrescripcionAsociada && (
                          <div className="flex-1 flex flex-col">
                            <div className="flex flex-row gap-2 items-end">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Prescripción asociada <span className="text-red-600">*</span></p>
                                <Input
                                  value={currentPrescripcionAsociada}
                                  onChange={(e) => handlePrescripcionAsociadaChange(page - 1, e.target.value)}
                                  placeholder="N° prescripción asociada"
                                  className="h-10 border-red-200 focus-visible:ring-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                  required={requierePrescripcionAsociada}
                                />
                              </div>
                              <div style={{ width: 80 }}>
                                <p className="text-xs text-foreground">ConTec</p>
                                <Input
                                  type="number"
                                  min={0}
                                  value={currentConTecAsociada}
                                  onChange={(e) => handleConTecAsociadaChange(page - 1, e.target.value)}
                                  placeholder="ConTec"
                                  className="h-10 border-red-200 focus-visible:ring-red-500 text-xs px-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                  style={{ fontSize: 13 }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Observación</p>
                      <Input
                        value={currentRow?.observacion || ""}
                        onChange={(e) => handleObservacionChange(page - 1, e.target.value)}
                        placeholder="Digite una observación (Esta se guardara internamente)"
                        className="h-10 border-red-200 focus-visible:ring-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>


                    {rows.length > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                          disabled={page <= 1}
                          className="h-9 border-red-200 px-4 hover:bg-red-100 hover:text-red-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Anterior
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {page} / {rows.length}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setPage((prev) => Math.min(rows.length, prev + 1))}
                          disabled={page >= rows.length}
                          className="h-9 border-red-200 px-4 hover:bg-red-100 hover:text-red-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <Button 
                    className="flex-1 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800" 
                    variant="outline" 
                    onClick={onClose} 
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-md transition-all hover:scale-[1.02]" 
                    onClick={handleSubmit} 
                    disabled={
                      submitting ||
                      rows.filter(r => r.selected).length === 0 ||
                      (requierePrescripcionAsociada && !currentPrescripcionAsociada.trim())
                    }
                  >
                    {submitting 
                      ? "Registrando..." 
                      : rows.filter(r => r.selected).length > 1
                        ? `Registrar ${rows.filter(r => r.selected).length} tecnologías`
                        : "Guardar no direccionamiento"
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
