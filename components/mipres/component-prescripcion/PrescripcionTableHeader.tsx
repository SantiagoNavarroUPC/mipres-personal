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
import {
  Boxes,
  Building2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Map,
  MapPin,
  Scale,
  Search,
  Shield,
  SlidersHorizontal,
  X,
} from "lucide-react"

interface CategoryFilterState {
  med: boolean
  proc: boolean
  disp: boolean
  nutr: boolean
  serv: boolean
}

type DireccionamientoFilter = "todos" | "direccionado" | "no-direccionado" | "no-direccionamiento"
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
        <div className="relative w-[185px] group">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchNoPrescripcion}
            onChange={(e) => setSearchNoPrescripcion(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-white dark:bg-card pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/70 shadow-2xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground/40"
          />
          {searchNoPrescripcion && (
            <button
              type="button"
              onClick={() => setSearchNoPrescripcion("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <Select value={direccionamientoFilter} onValueChange={(value: any) => setDireccionamientoFilter(value)}>
          <SelectTrigger className="w-[145px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Estado: Todos</SelectItem>
            <SelectItem value="direccionado">Direccionado</SelectItem>
            <SelectItem value="no-direccionado">Sin Proceso</SelectItem>
            <SelectItem value="no-direccionamiento">No Direccionamiento</SelectItem>
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
          <SelectTrigger className="w-[160px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <Map className="size-3.5 text-primary shrink-0" />
              <span className="truncate"><SelectValue placeholder="Departamento IPS" /></span>
            </div>
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
          <SelectTrigger className="w-[160px] h-8 text-xs bg-white dark:bg-card text-foreground border-input rounded-lg hover:border-primary/50 transition-colors shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span className="truncate"><SelectValue placeholder={departamentoFilter === "todos" ? "Depto primero" : "Municipio"} /></span>
            </div>
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
          <span className="text-[10px] text-destructive max-w-[170px] leading-tight font-medium">
            {municipiosError}
          </span>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-lg bg-white dark:bg-card text-foreground border-input hover:bg-muted/40 hover:border-primary/50 transition-colors shadow-2xs"
            >
              <Building2 className="size-3.5 text-primary shrink-0" />
              <span>Ámbito Hospitalario</span>
              <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                {Object.values(ambitoFilter).filter(Boolean).length}
              </span>
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
              className="h-8 text-xs gap-1.5 rounded-lg bg-white dark:bg-card text-foreground border-input hover:bg-muted/40 hover:border-primary/50 transition-colors shadow-2xs"
              disabled={!isAdminUser}
              title={!isAdminUser ? "Solo Medicamentos disponible para este usuario" : "Seleccionar tecnologías"}
            >
              <Boxes className="size-3.5 text-primary shrink-0" />
              <span>Tecnologías</span>
              <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                {Object.values(categoryFilter).filter(Boolean).length}
              </span>
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
          className="h-8 text-xs gap-1.5 rounded-lg bg-white dark:bg-card text-foreground border-input hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shadow-2xs"
          onClick={handleExportExcel}
        >
          <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Exportar Excel</span>
        </Button>

      </div>
    </div>
  )
}
