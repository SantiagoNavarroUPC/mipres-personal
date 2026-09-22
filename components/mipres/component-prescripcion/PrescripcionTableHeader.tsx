import type { Dispatch, SetStateAction } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AMBITOS_ATENCION } from "@/models/constants"
import { Download, FileText, Loader2, Search } from "lucide-react"

interface CategoryFilterState {
  med: boolean
  proc: boolean
  disp: boolean
  nutr: boolean
  serv: boolean
}

type DireccionamientoFilter = "todos" | "direccionado" | "no-direccionado" | "no-direccionamiento"
type EstJmFilter = "todos" | "aprobada" | "pendiente" | "rechazada"
type RegimenFilter = "todos" | "Contributivo" | "Subsidiado"
type DateSort = "none" | "asc" | "desc"

interface PrescripcionTableHeaderProps {
  total: number
  absoluteTotal?: number
  refreshing?: boolean
  isAdminUser: boolean
  municipiosLoading: boolean
  municipiosError: string | null
  departamentoFilter: string
  setDepartamentoFilter: Dispatch<SetStateAction<string>>
  municipioFilter: string
  setMunicipioFilter: Dispatch<SetStateAction<string>>
  departamentoOptions: Array<{ value: string; label: string }>
  municipioOptions: Array<{ value: string; label: string }>
  searchNoPrescripcion: string
  setSearchNoPrescripcion: Dispatch<SetStateAction<string>>
  direccionamientoFilter: DireccionamientoFilter
  setDireccionamientoFilter: Dispatch<SetStateAction<DireccionamientoFilter>>
  estJmFilter: EstJmFilter
  setEstJmFilter: Dispatch<SetStateAction<EstJmFilter>>
  regimenFilter: RegimenFilter
  setRegimenFilter: Dispatch<SetStateAction<RegimenFilter>>
  ambitoFilter: Record<string, boolean>
  setAmbitoFilter: Dispatch<SetStateAction<Record<string, boolean>>>
  categoryFilter: CategoryFilterState
  setCategoryFilter: Dispatch<SetStateAction<CategoryFilterState>>
  handleExportExcel: () => void | Promise<void>
}

export function PrescripcionTableHeader({
  total,
  absoluteTotal,
  refreshing,
  isAdminUser,
  municipiosLoading,
  municipiosError,
  departamentoFilter,
  setDepartamentoFilter,
  municipioFilter,
  setMunicipioFilter,
  departamentoOptions,
  municipioOptions,
  searchNoPrescripcion,
  setSearchNoPrescripcion,
  direccionamientoFilter,
  setDireccionamientoFilter,
  estJmFilter,
  setEstJmFilter,
  regimenFilter,
  setRegimenFilter,
  ambitoFilter,
  setAmbitoFilter,
  categoryFilter,
  setCategoryFilter,
  handleExportExcel,
}: PrescripcionTableHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-base">Prescripciones</h2>
        <Badge variant="secondary" className="text-xs">
          {total}
        </Badge>
        {absoluteTotal !== undefined && total !== absoluteTotal && (
          <span className="text-xs text-muted-foreground">de {absoluteTotal}</span>
        )}
        {refreshing && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar"
            value={searchNoPrescripcion}
            onChange={(e) => setSearchNoPrescripcion(e.target.value)}
            className="h-8 w-full rounded-md border bg-white pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Select value={direccionamientoFilter} onValueChange={(value: any) => setDireccionamientoFilter(value)}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-white text-foreground border border-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Estado: Todos</SelectItem>
            <SelectItem value="direccionado">Direccionado</SelectItem>
            <SelectItem value="no-direccionado">Sin Proceso</SelectItem>
            <SelectItem value="no-direccionamiento">No Direccionamiento</SelectItem>
          </SelectContent>
        </Select>

        {isAdminUser ? (
          <Select value={estJmFilter} onValueChange={(value: any) => setEstJmFilter(value)}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-white text-foreground border border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Estados JM</SelectItem>
              <SelectItem value="aprobada">Aprobada</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="rechazada">Rechazada</SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        <Select value={regimenFilter} onValueChange={(value: any) => setRegimenFilter(value)}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-white text-foreground border border-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Régimen: Todos</SelectItem>
            <SelectItem value="Contributivo">Contributivo</SelectItem>
            <SelectItem value="Subsidiado">Subsidiado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={departamentoFilter}
          onValueChange={(value: any) => {
            setDepartamentoFilter(value)
            setMunicipioFilter("todos")
          }}
          disabled={municipiosLoading && departamentoOptions.length === 0}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs bg-white text-foreground border border-input">
            <SelectValue placeholder="Departamento IPS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Departamentos</SelectItem>
            {municipiosLoading && departamentoOptions.length === 0 ? (
              <SelectItem value="loading" disabled>
                Cargando departamentos...
              </SelectItem>
            ) : (
              departamentoOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Select
          value={municipioFilter}
          onValueChange={(value: any) => setMunicipioFilter(value)}
          disabled={departamentoFilter === "todos" || (municipiosLoading && municipioOptions.length === 0)}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs bg-white text-foreground border border-input">
            <SelectValue placeholder={departamentoFilter === "todos" ? "Depto primero" : "Municipio"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Municipio: Todos</SelectItem>
            {municipiosLoading && municipioOptions.length === 0 ? (
              <SelectItem value="loading-municipio" disabled>
                Cargando municipios...
              </SelectItem>
            ) : (
              municipioOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {municipiosError ? (
          <span className="text-[10px] text-red-600 max-w-[170px] leading-tight">
            {municipiosError}
          </span>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-white text-foreground border border-input hover:bg-muted/40">
              Ámbito Hospitalario ({Object.values(ambitoFilter).filter(Boolean).length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[240px]">
            {isAdminUser ? (
              <>
                <DropdownMenuCheckboxItem
                  checked={Object.values(ambitoFilter).every(Boolean)}
                  onCheckedChange={(checked) =>
                    setAmbitoFilter({
                      "11": Boolean(checked),
                      "12": Boolean(checked),
                      "21": Boolean(checked),
                      "22": Boolean(checked),
                      "30": Boolean(checked),
                    })
                  }
                >
                  Seleccionar todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={false} disabled>
                  ----------------
                </DropdownMenuCheckboxItem>
                {Object.entries(AMBITOS_ATENCION).map(([key, value]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={ambitoFilter[key]}
                    onCheckedChange={(checked) =>
                      setAmbitoFilter((prev) => ({ ...prev, [key]: Boolean(checked) }))
                    }
                  >
                    {value}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            ) : (
              <>
                <DropdownMenuCheckboxItem
                  checked={ambitoFilter["11"] && ambitoFilter["12"]}
                  onCheckedChange={(checked) =>
                    setAmbitoFilter((prev) => ({
                      ...prev,
                      "11": Boolean(checked),
                      "12": Boolean(checked),
                    }))
                  }
                >
                  Seleccionar todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={false} disabled>
                  ----------------
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={ambitoFilter["11"]}
                  onCheckedChange={(checked) =>
                    setAmbitoFilter((prev) => ({ ...prev, "11": Boolean(checked) }))
                  }
                >
                  {AMBITOS_ATENCION["11"]}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={ambitoFilter["12"]}
                  onCheckedChange={(checked) =>
                    setAmbitoFilter((prev) => ({ ...prev, "12": Boolean(checked) }))
                  }
                >
                  {AMBITOS_ATENCION["12"]}
                </DropdownMenuCheckboxItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs bg-white text-foreground border border-input hover:bg-muted/40"
              disabled={!isAdminUser}
              title={!isAdminUser ? "Solo Medicamentos disponible para este usuario" : "Seleccionar tecnologías"}
            >
              Tecnologias ({Object.values(categoryFilter).filter(Boolean).length})
            </Button>
          </DropdownMenuTrigger>
          {isAdminUser && (
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuCheckboxItem
                checked={Object.values(categoryFilter).every(Boolean)}
                onCheckedChange={(checked) =>
                  setCategoryFilter({
                    med: Boolean(checked),
                    proc: Boolean(checked),
                    disp: Boolean(checked),
                    nutr: Boolean(checked),
                    serv: Boolean(checked),
                  })
                }
              >
                Seleccionar todos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={false} disabled>
                ----------------
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={categoryFilter.med}
                onCheckedChange={(checked) =>
                  setCategoryFilter((prev) => ({ ...prev, med: Boolean(checked) }))
                }
              >
                Medicamentos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={categoryFilter.proc}
                onCheckedChange={(checked) =>
                  setCategoryFilter((prev) => ({ ...prev, proc: Boolean(checked) }))
                }
              >
                Procedimientos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={categoryFilter.disp}
                onCheckedChange={(checked) =>
                  setCategoryFilter((prev) => ({ ...prev, disp: Boolean(checked) }))
                }
              >
                Dispositivos Medicos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={categoryFilter.nutr}
                onCheckedChange={(checked) =>
                  setCategoryFilter((prev) => ({ ...prev, nutr: Boolean(checked) }))
                }
              >
                Productos Nutricionales
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={categoryFilter.serv}
                onCheckedChange={(checked) =>
                  setCategoryFilter((prev) => ({ ...prev, serv: Boolean(checked) }))
                }
              >
                Servicios Complementarios
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1 bg-white text-foreground border border-input hover:bg-muted/40"
          onClick={handleExportExcel}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Excel
        </Button>

      </div>
    </div>
  )
}
