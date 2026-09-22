"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Prescripcion } from "@/models/mipres-sispro/prescripcion"
import type { MipresCredentials } from "@/models/credentials.model"
import { useMipresQueryClient } from "@/hooks/useMipresQueries"
import { AMBITOS_ATENCION, ESTADOS_PRESCRIPCION } from "@/models/constants"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"

import { PrescripcionTableHeader } from "./PrescripcionTableHeader"
import { PrescripcionTableBody } from "./PrescripcionTableBody"
import { AccionesModal, DireccionamientoLecturaModal } from "../component-direccionamiento/DireccionamientoView"
import { NoDireccionamientoLecturaModal } from "../component-nodirecionamiento"
import { getArray } from "./utils"
import { generarPrescripcionHTML } from "@/lib/plantillas_pdf/prescripcion_pdf"
import { exportToExcel } from "@/lib/config/export-utils"
import { toast } from "sonner"

interface PrescripcionTableProps {
  prescripciones: Prescripcion[]
  credentials: MipresCredentials
  onRefreshAfterDireccionamiento?: () => Promise<void>
  onDireccionamientoFormOpen?: (open: boolean) => void
}

type MunicipioCatalogItem = {
  cod_dpto: string
  dpto: string
  cod_mpio: string
  nom_mpio: string
}

type LocationOption = {
  value: string
  label: string
}

export function PrescripcionTable({
  prescripciones,
  credentials,
  onRefreshAfterDireccionamiento,
  onDireccionamientoFormOpen,
}: PrescripcionTableProps) {
  const isAdminUser = credentials?.rolMipres === 1 || credentials?.rolMipres === 2
  const allowedDepartmentCodes = ["20", "47", "44"]
  const { invalidateDireccionamientos } = useMipresQueryClient()
  const [accionesModalOpen, setAccionesModalOpen] = useState(false)
  const [selectedForAcciones, setSelectedForAcciones] = useState<any>(null)
  const [accionesFormOpen, setAccionesFormOpen] = useState(false)
  const [verFormOpen, setVerFormOpen] = useState(false)
  const [noDirFormOpen, setNoDirFormOpen] = useState(false)
  const anyFormOpen = accionesFormOpen || verFormOpen || noDirFormOpen
  useEffect(() => { onDireccionamientoFormOpen?.(anyFormOpen) }, [anyFormOpen])

  const [accionesInitialFocus, setAccionesInitialFocus] = useState<{
    tipoTec?: string
    conTec?: number
    prescItem?: any
    seedFromDelivery?: {
      NoIDProv?: string
      CodMunEnt?: string
      CodSerTecAEntregar?: string
      DirPaciente?: string
      TipoIDProv?: string
      CantTotAEntregar?: string
    }
  } | null>(null)
  const [verModalOpen, setVerModalOpen] = useState(false)
  const [selectedForVer, setSelectedForVer] = useState<any>(null)
  const [noDireccionamientoModalOpen, setNoDireccionamientoModalOpen] = useState(false)
  const [selectedForNoDireccionamiento, setSelectedForNoDireccionamiento] = useState<any>(null)
  const [municipiosCatalog, setMunicipiosCatalog] = useState<MunicipioCatalogItem[]>([])
  const [municipiosLoading, setMunicipiosLoading] = useState(false)
  const [municipiosError, setMunicipiosError] = useState<string | null>(null)
  const [departamentoFilter, setDepartamentoFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prescripcion_departamentoFilter") || "todos"
    }
    return "todos"
  })
  const [municipioFilter, setMunicipioFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prescripcion_municipioFilter") || "todos"
    }
    return "todos"
  })
  const [categoryFilter, setCategoryFilter] = useState(() => {
    if (!isAdminUser) {
      return {
        med: true,
        proc: false,
        disp: false,
        nutr: false,
        serv: false,
      }
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("prescripcion_categoryFilter")
      return saved ? JSON.parse(saved) : {
        med: true,
        proc: true,
        disp: true,
        nutr: true,
        serv: true,
      }
    }
    return {
      med: true,
      proc: true,
      disp: true,
      nutr: true,
      serv: true,
    }
  })
  const [direccionamientoFilter, setDireccionamientoFilter] = useState<"todos" | "direccionado" | "no-direccionado" | "no-direccionamiento">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("prescripcion_direccionamientoFilter") as any) || "todos"
    }
    return "todos"
  })
  const [searchNoPrescripcion, setSearchNoPrescripcion] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prescripcion_searchNoPrescripcion") || ""
    }
    return ""
  })
  const [estJmFilter, setEstJmFilter] = useState<"todos" | "aprobada" | "pendiente" | "rechazada">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("prescripcion_estJmFilter") as any) || "todos"
    }
    return "todos"
  })
  const [regimenFilter, setRegimenFilter] = useState<"todos" | "Contributivo" | "Subsidiado">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("prescripcion_regimenFilter") as any) || "todos"
    }
    return "todos"
  })
  const [ambitoFilter, setAmbitoFilter] = useState<Record<string, boolean>>(() => {
    if (!isAdminUser) {
      return {
        "11": true,
        "12": true,
        "21": false,
        "22": false,
        "30": false,
      }
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("prescripcion_ambitoFilter")
      return saved ? JSON.parse(saved) : {
        "11": true,
        "12": true,
        "21": true,
        "22": true,
        "30": true,
      }
    }
    return {
      "11": true,
      "12": true,
      "21": true,
      "22": true,
      "30": true,
    }
  })
  const [dateSort, setDateSort] = useState<"none" | "asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("prescripcion_dateSort") as any) || "none"
    }
    return "none"
  })

  // Persistir filtros en localStorage
  useEffect(() => {
    localStorage.setItem("prescripcion_categoryFilter", JSON.stringify(categoryFilter))
  }, [categoryFilter])

  useEffect(() => {
    localStorage.setItem("prescripcion_direccionamientoFilter", direccionamientoFilter)
  }, [direccionamientoFilter])

  useEffect(() => {
    localStorage.setItem("prescripcion_searchNoPrescripcion", searchNoPrescripcion)
  }, [searchNoPrescripcion])

  useEffect(() => {
    localStorage.setItem("prescripcion_estJmFilter", estJmFilter)
  }, [estJmFilter])

  useEffect(() => {
    localStorage.setItem("prescripcion_regimenFilter", regimenFilter)
  }, [regimenFilter])

  useEffect(() => {
    localStorage.setItem("prescripcion_ambitoFilter", JSON.stringify(ambitoFilter))
  }, [ambitoFilter])

  useEffect(() => {
    localStorage.setItem("prescripcion_departamentoFilter", departamentoFilter)
  }, [departamentoFilter])

  useEffect(() => {
    localStorage.setItem("prescripcion_municipioFilter", municipioFilter)
  }, [municipioFilter])

  useEffect(() => {
    localStorage.setItem("prescripcion_dateSort", dateSort)
  }, [dateSort])
  const [anulacionStatus, setAnulacionStatus] = useState<Record<string, boolean>>({})
  const [direccionamientoStatus, setDireccionamientoStatus] = useState<Record<string, boolean>>({})
  const [noDireccionamientoStatus, setNoDireccionamientoStatus] = useState<Record<string, boolean>>({})
  const [noDireccionamientoNoAnuladoStatus, setNoDireccionamientoNoAnuladoStatus] = useState<Record<string, boolean>>({})
  const [statusChecked, setStatusChecked] = useState<Record<string, boolean>>({})
  const [refreshingAfterDir, setRefreshingAfterDir] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    const loadMunicipiosCatalog = async () => {
      setMunicipiosLoading(true)
      setMunicipiosError(null)

      try {
        const apiUrl = process.env.NEXT_PUBLIC_MUNICIPIOS_API_URL
        if (!apiUrl) {
          throw new Error("URL de municipios no configurada")
        }

        const response = await fetch(
          `${apiUrl}?$select=cod_dpto,dpto,cod_mpio,nom_mpio&$limit=5000`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error("No se pudo cargar el catálogo de municipios")
        }

        const data = (await response.json()) as Array<Partial<MunicipioCatalogItem>>
        if (!active) return

        const normalized = data
          .filter((item) => {
            const codDpto = String(item.cod_dpto || "").trim()
            return (
              codDpto &&
              allowedDepartmentCodes.includes(codDpto) &&
              item.cod_mpio &&
              item.dpto &&
              item.nom_mpio
            )
          })
          .map((item) => ({
            cod_dpto: String(item.cod_dpto || "").trim(),
            dpto: String(item.dpto || "").trim(),
            cod_mpio: String(item.cod_mpio || "").trim(),
            nom_mpio: String(item.nom_mpio || "").trim(),
          }))

        setMunicipiosCatalog(normalized)
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
        setMunicipiosError("No se pudo cargar el catálogo de municipios")
      } finally {
        if (active) setMunicipiosLoading(false)
      }
    }

    void loadMunicipiosCatalog()

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const departamentoOptions = useMemo<LocationOption[]>(() => {
    const seen = new Map<string, string>()
    municipiosCatalog.forEach((item) => {
      if (!seen.has(item.cod_dpto)) {
        seen.set(item.cod_dpto, item.dpto)
      }
    })

    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"))
  }, [municipiosCatalog])

  const municipiosByCode = useMemo(() => {
    const map = new Map<string, MunicipioCatalogItem>()
    municipiosCatalog.forEach((item) => {
      // Normalizar código a solo dígitos para búsqueda consistente
      const normalized = String(item.cod_mpio || "").replace(/\D/g, "").trim()
      if (normalized && !map.has(normalized)) {
        map.set(normalized, item)
      }
    })
    return map
  }, [municipiosCatalog])

  const municipioOptions = useMemo<LocationOption[]>(() => {
    // Si no hay departamento seleccionado, no listar municipios
    if (departamentoFilter === "todos") return []

    // Paso 1: Filtrar prescripciones por categoría seleccionada
    const enabled = Object.values(categoryFilter).some(Boolean)
    if (!enabled) return [] // Si no hay categoría seleccionada, no hay municipios

    let prescsByCategory = prescripciones.filter((presc) => {
      const medCount = getArray(presc, "medicamentos").length
      const procCount = getArray(presc, "procedimientos").length
      const dispCount = getArray(presc, "dispositivos").length
      const nutrCount = getArray(presc, "productosNutricionales").length
      const servCount = getArray(presc, "serviciosComplementarios").length

      if (categoryFilter.med && medCount > 0) return true
      if (categoryFilter.proc && procCount > 0) return true
      if (categoryFilter.disp && dispCount > 0) return true
      if (categoryFilter.nutr && nutrCount > 0) return true
      if (categoryFilter.serv && servCount > 0) return true
      return false
    })

    // Paso 2: Extraer códigos DANE únicos de prescripciones (filtradas por categoría) que pertenecen al departamento
    const prescCodigos = prescsByCategory
      .map((p) => {
        const codDANE = String(p.CodDANEMunIPS || "").replace(/\D/g, "").trim()
        return codDANE.length >= 5 ? codDANE : ""
      })
      .filter(Boolean)

    const prescCodHelper = prescCodigos.filter((code) => code.substring(0, 2) === departamentoFilter)
    const prescCodSet = new Set(prescCodHelper)

    if (prescCodSet.size === 0) return []

    // Paso 3: Buscar esos códigos en el catálogo
    const municipioMap = new Map<string, string>()
    municipiosCatalog.forEach((item) => {
      const normalized = String(item.cod_mpio || "").replace(/\D/g, "").trim()
      if (prescCodSet.has(normalized)) {
        municipioMap.set(normalized, item.nom_mpio)
      }
    })

    return Array.from(municipioMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"))
  }, [municipiosCatalog, departamentoFilter, prescripciones, categoryFilter])

  useEffect(() => {
    if (municipioFilter === "todos") return
    const municipioSeleccionado = municipiosByCode.get(municipioFilter)
    if (municipioSeleccionado) {
      const catalogDpto = String(municipioSeleccionado.cod_dpto || "").replace(/\D/g, "").trim()
      if (departamentoFilter !== "todos" && catalogDpto !== departamentoFilter) {
        setMunicipioFilter("todos")
      }
    }
  }, [departamentoFilter, municipioFilter, municipiosByCode])

  const normalizeSearchValue = (value: unknown) => {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
  }

  const removeDiacritics = (value: string) => {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  }

  const buildPrescripcionSearchText = (presc: any) => {
    const tokens = [
      presc?.NoPrescripcion,
      presc?.TipoIDPaciente,
      presc?.NroIDPaciente,
      presc?.PNPaciente,
      presc?.SNPaciente,
      presc?.PAPaciente,
      presc?.SAPaciente,
      presc?.ipsSolicitanteNombre,
      presc?.NroIDIPS,
      presc?.TipoIDIPS,
      presc?.CodDANEMunIPS,
      presc?.DirSedeIPS,
      presc?.TelSedeIPS,
    ]

    return removeDiacritics(
      tokens
        .map((token) => normalizeSearchValue(token))
        .filter(Boolean)
        .join(" ")
    )
  }

  // Paginación
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredPrescripciones = useMemo(() => {
    const enabled = Object.values(categoryFilter).some(Boolean)
    if (!enabled) return []

    let filtered = prescripciones.filter((presc) => {
      const medCount = getArray(presc, "medicamentos").length
      const procCount = getArray(presc, "procedimientos").length
      const dispCount = getArray(presc, "dispositivos").length
      const nutrCount = getArray(presc, "productosNutricionales").length
      const servCount = getArray(presc, "serviciosComplementarios").length

      if (categoryFilter.med && medCount > 0) return true
      if (categoryFilter.proc && procCount > 0) return true
      if (categoryFilter.disp && dispCount > 0) return true
      if (categoryFilter.nutr && nutrCount > 0) return true
      if (categoryFilter.serv && servCount > 0) return true
      return false
    })

    // Apply direccionamiento filter
    if (direccionamientoFilter === "direccionado") {
      // Solo mostrar las que tienen direccionamiento pero NO tienen no direccionamiento
      filtered = filtered.filter((presc) =>
        Boolean(presc.direccionada || direccionamientoStatus[presc.NoPrescripcion]) &&
        !noDireccionamientoStatus[presc.NoPrescripcion]
      )
    } else if (direccionamientoFilter === "no-direccionado") {
      // Mostrar las que no tienen ningún proceso (ni direccionamiento ni no direccionamiento)
      filtered = filtered.filter((presc) =>
        !Boolean(presc.direccionada || direccionamientoStatus[presc.NoPrescripcion]) &&
        !noDireccionamientoStatus[presc.NoPrescripcion]
      )
    } else if (direccionamientoFilter === "no-direccionamiento") {
      // Mostrar todas las que tienen no direccionamiento (incluso si también tienen direccionamiento)
      filtered = filtered.filter((presc) => noDireccionamientoStatus[presc.NoPrescripcion] === true)
    }

    // Apply search filter by prescripción, afiliado e IPS
    if (searchNoPrescripcion.trim()) {
      const searchQuery = removeDiacritics(normalizeSearchValue(searchNoPrescripcion))
      filtered = filtered.filter((presc) => 
        buildPrescripcionSearchText(presc).includes(searchQuery)
      )
    }

    // Apply EstJM filter
    if (estJmFilter !== "todos") {
      filtered = filtered.filter((presc) => {
        const allTechs = [
          ...getArray(presc, "medicamentos"),
          ...getArray(presc, "procedimientos"),
          ...getArray(presc, "dispositivos"),
          ...getArray(presc, "productosNutricionales"),
          ...getArray(presc, "serviciosComplementarios"),
        ]
        
        // Map filter value to EstJM codes
        let estJmCodes: number[] = []
        if (estJmFilter === "aprobada") {
          estJmCodes = [1, 3] // No requiere y Aprobada
        } else if (estJmFilter === "pendiente") {
          estJmCodes = [2]
        } else if (estJmFilter === "rechazada") {
          estJmCodes = [4]
        }
        
        // Check if any technology has one of the selected EstJM values
        return allTechs.some((tech: any) => estJmCodes.includes(tech.EstJM))
      })
    }

    // Apply regimen filter
    if (regimenFilter !== "todos") {
      filtered = filtered.filter((presc) => presc.tipoRegimen === regimenFilter)
    }

    // Apply department/municipality filter by CodDANEMunIPS
    if (departamentoFilter !== "todos" || municipioFilter !== "todos") {
      filtered = filtered.filter((presc) => {
        // Normalizar código DANE a solo dígitos para búsqueda consistente
        const codMunicipioIPS = String(presc.CodDANEMunIPS || "").replace(/\D/g, "").trim()
        if (!codMunicipioIPS) return false

        const municipioData = municipiosByCode.get(codMunicipioIPS)
        if (!municipioData) return false

        // Normalizar cod_dpto del catálogo para comparación
        const catalogDpto = String(municipioData.cod_dpto || "").replace(/\D/g, "").trim()
        if (departamentoFilter !== "todos" && catalogDpto !== departamentoFilter) {
          return false
        }

        // Normalizar cod_mpio del catálogo para comparación
        const catalogMpio = String(municipioData.cod_mpio || "").replace(/\D/g, "").trim()
        if (municipioFilter !== "todos" && catalogMpio !== municipioFilter) {
          return false
        }

        return true
      })
    }

    // Apply ambito filter
    const ambitoEnabled = Object.values(ambitoFilter).some(Boolean)
    if (ambitoEnabled) {
      filtered = filtered.filter((presc) => {
        const codAmbAte = presc.CodAmbAte?.toString().trim()
        if (!codAmbAte) return false
        return ambitoFilter[codAmbAte] === true
      })
    }

    // Apply date sorting
    if (dateSort !== "none") {
      const dateCopy = [...filtered]
      dateCopy.sort((a: any, b: any) => {
        // Extraer fecha y hora
        const fechaA = a.FPrescripcion || ""
        const horaA = a.HPrescripcion || "00:00:00"
        const fechaB = b.FPrescripcion || ""
        const horaB = b.HPrescripcion || "00:00:00"
        
        // Limpiar fecha si viene con timestamp (remover parte de hora si existe)
        const cleanFechaA = fechaA.split('T')[0]
        const cleanFechaB = fechaB.split('T')[0]
        
        // Crear strings de fecha-hora completos en formato ISO
        const dateAStr = `${cleanFechaA}T${horaA}`
        const dateBStr = `${cleanFechaB}T${horaB}`
        
        const dateA = new Date(dateAStr).getTime()
        const dateB = new Date(dateBStr).getTime()
        
        // Manejar valores inválidos
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        
        if (dateSort === "asc") {
          return dateA - dateB
        } else {
          return dateB - dateA
        }
      })
      return dateCopy
    }

    return filtered
  }, [
    prescripciones,
    categoryFilter,
    direccionamientoFilter,
    searchNoPrescripcion,
    estJmFilter,
    regimenFilter,
    departamentoFilter,
    municipioFilter,
    ambitoFilter,
    dateSort,
    direccionamientoStatus,
    noDireccionamientoStatus,
    municipiosByCode,
  ])

  const total = filteredPrescripciones.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const displayed = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredPrescripciones.slice(start, start + pageSize)
  }, [filteredPrescripciones, page, pageSize])

  const getSyncStateForPrescripcion = (presc: any) => {
    const noPrescripcion = String(presc?.NoPrescripcion || "")
    const hasDireccionamiento = Boolean(presc?.direccionada || direccionamientoStatus[noPrescripcion])
    const hasNoDireccionamientoNoAnulado = Boolean(noDireccionamientoNoAnuladoStatus[noPrescripcion])
    const isAnulada = Boolean(anulacionStatus[noPrescripcion])

    if (hasDireccionamiento && isAnulada) {
      if (hasNoDireccionamientoNoAnulado) return "red" as const
      return "gray" as const
    }
    if (hasNoDireccionamientoNoAnulado) return "red" as const
    if (hasDireccionamiento) return "green" as const
    return "gray" as const
  }


  const getTokensForPrescripcion = (presc?: any) => {
    const preferContributivo = presc?.tipoRegimen === "Contributivo"
    const preferSubsidiado = presc?.tipoRegimen === "Subsidiado"

    const ordered = preferContributivo
      ? [
          credentials.tokenAccesoContributivo,
          credentials.tokenAccesoSubsidiado,
          credentials.tokenAcceso,
        ]
      : preferSubsidiado
      ? [
          credentials.tokenAccesoSubsidiado,
          credentials.tokenAccesoContributivo,
          credentials.tokenAcceso,
        ]
      : [
          credentials.tokenAcceso,
          credentials.tokenAccesoSubsidiado,
          credentials.tokenAccesoContributivo,
        ]

    return Array.from(new Set(ordered.filter(Boolean))) as string[]
  }

  const parseApiList = (data: any, keys: string[]) => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray(data.root)) return data.root
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key]
    }
    return []
  }

  const fetchDireccionamientosWithTokens = async (noPrescripcion: string, tokens: string[]) => {
    const results = await Promise.all(
      tokens.map(async (tokenAcceso) => {
        try {
          const dirQueryParams = new URLSearchParams({
            nit: credentials.nit,
            tokenAcceso,
            tipo: "prescripcion",
            noPrescripcion,
          })
          const dirResponse = await fetch(`/api/mipres/direccionamiento?${dirQueryParams.toString()}`)
          const dirResult = dirResponse.ok ? await dirResponse.json() : null
          if (dirResult?.success) {
            return parseApiList(dirResult.data, ["direccionamientos"])
          }
        } catch {}
        return []
      })
    )
    return results.flat()
  }

  const fetchNoDireccionamientosWithTokens = async (noPrescripcion: string, tokens: string[]) => {
    const results = await Promise.all(
      tokens.map(async (tokenAcceso) => {
        try {
          const noDirQueryParams = new URLSearchParams({
            nit: credentials.nit,
            tokenAcceso,
            tipo: "prescripcion",
            noPrescripcion,
          })
          const noDirResponse = await fetch(`/api/mipres/no-direccionamiento?${noDirQueryParams.toString()}`)
          const noDirResult = noDirResponse.ok ? await noDirResponse.json() : null
          if (noDirResult?.success && noDirResult.data) {
            return parseApiList(noDirResult.data, ["noDireccionamientos"])
          }
        } catch {}
        return []
      })
    )
    return results.flat()
  }

  useEffect(() => {
    setPage(1)
  }, [categoryFilter, direccionamientoFilter, searchNoPrescripcion, prescripciones, pageSize, estJmFilter, regimenFilter, ambitoFilter, dateSort])

  // Verificar estado de direccionamiento/no direccionamiento por página (lazy + chunks)
  useEffect(() => {
    const checkAnulacionStatus = async () => {
      if (!credentials.nit) return

      const toCheck = displayed.filter((presc) => {
        const noPrescripcion = presc?.NoPrescripcion
        return Boolean(noPrescripcion) && !statusChecked[noPrescripcion]
      })

      if (toCheck.length === 0) return

      const newAnulacionStatus: Record<string, boolean> = {}
      const newDireccionamientoStatus: Record<string, boolean> = {}
      const newNoDireccionamientoStatus: Record<string, boolean> = {}
      const newNoDireccionamientoNoAnuladoStatus: Record<string, boolean> = {}
      const checkedNow: Record<string, boolean> = {}

      // Consultar por lotes (chunks) para no saturar
      const chunkSize = 5
      for (let i = 0; i < toCheck.length; i += chunkSize) {
        const chunk = toCheck.slice(i, i + chunkSize)

        await Promise.all(
          chunk.map(async (presc) => {
          try {
            const noPrescripcion = presc.NoPrescripcion
            if (!noPrescripcion) return

            const tokens = getTokensForPrescripcion(presc)
            if (tokens.length === 0) return

            const direccionamientos = await fetchDireccionamientosWithTokens(noPrescripcion, tokens)
            const tieneDireccionamientoVigente = direccionamientos.some((d: any) => !d.FecAnulacion)
            const tieneSoloDireccionamientosAnulados =
              direccionamientos.length > 0 && !tieneDireccionamientoVigente

            newDireccionamientoStatus[noPrescripcion] = tieneDireccionamientoVigente
            newAnulacionStatus[noPrescripcion] = tieneSoloDireccionamientosAnulados

            const noDireccionamientos = await fetchNoDireccionamientosWithTokens(noPrescripcion, tokens)
            const tieneNoDireccionamiento = noDireccionamientos.length > 0
            const tieneNoDireccionamientoNoAnulado = noDireccionamientos.some(
              (row: any) => !String(row?.FecAnulacion ?? "").trim()
            )
            newNoDireccionamientoStatus[noPrescripcion] = tieneNoDireccionamiento
            newNoDireccionamientoNoAnuladoStatus[noPrescripcion] = tieneNoDireccionamientoNoAnulado

            checkedNow[noPrescripcion] = true
          } catch (error) {
            // Error checking status
          }
          })
        )
      }

      setAnulacionStatus((prev) => ({ ...prev, ...newAnulacionStatus }))
      setDireccionamientoStatus((prev) => ({ ...prev, ...newDireccionamientoStatus }))
      setNoDireccionamientoStatus((prev) => ({ ...prev, ...newNoDireccionamientoStatus }))
      setNoDireccionamientoNoAnuladoStatus((prev) => ({ ...prev, ...newNoDireccionamientoNoAnuladoStatus }))
      setStatusChecked((prev) => ({ ...prev, ...checkedNow }))
    }

    checkAnulacionStatus()
  }, [displayed, statusChecked, credentials.nit, credentials.tokenAcceso, credentials.tokenAccesoSubsidiado, credentials.tokenAccesoContributivo])

  const openAccionesModal = (presc: any) => {
    // Filtrar solo tecnologías aprobadas (EstJM 1 o 3)
    const filteredPresc = {
      ...presc,
      medicamentos: getArray(presc, "medicamentos").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
      procedimientos: getArray(presc, "procedimientos").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
      dispositivos: getArray(presc, "dispositivos").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
      productosNutricionales: getArray(presc, "productosNutricionales").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
      serviciosComplementarios: getArray(presc, "serviciosComplementarios").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
    }
    setSelectedForAcciones(filteredPresc)
    setAccionesModalOpen(true)
  }

  const openAccionesModalWithFocus = (presc: any, focus?: {
    tipoTec?: string
    conTec?: number
    prescItem?: any
    seedFromDelivery?: {
      NoIDProv?: string
      CodMunEnt?: string
      CodSerTecAEntregar?: string
      DirPaciente?: string
      TipoIDProv?: string
      CantTotAEntregar?: string
    }
  }) => {
    const filteredPresc = {
      ...presc,
      medicamentos: getArray(presc, "medicamentos").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
      procedimientos: getArray(presc, "procedimientos").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
      dispositivos: getArray(presc, "dispositivos").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
      productosNutricionales: getArray(presc, "productosNutricionales").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
      serviciosComplementarios: getArray(presc, "serviciosComplementarios").filter((t: any) => t.EstJM === 1 || t.EstJM === 3),
    }
    setSelectedForAcciones(filteredPresc)
    setAccionesInitialFocus(focus || null)
    setAccionesModalOpen(true)
  }

  const openVerModal = (presc: any) => {
    setSelectedForVer(presc)
    setVerModalOpen(true)
  }
  const openNoDireccionamientoModal = (presc: any) => {
    setSelectedForNoDireccionamiento(presc)
    setNoDireccionamientoModalOpen(true)
  }

  const getEstadoDireccionamiento = (presc: any): string => {
    const noPrescripcion = presc.NoPrescripcion
    const hasDireccionamiento = Boolean(presc.direccionada || direccionamientoStatus[noPrescripcion])
    const isAnulada = anulacionStatus[noPrescripcion] === true
    const hasNoDireccionamiento = noDireccionamientoStatus[noPrescripcion] === true

    const estados: string[] = []

    if (hasDireccionamiento) {
      estados.push(isAnulada ? "Direccionada anulada" : "Direccionada")
    }

    if (hasNoDireccionamiento) {
      estados.push("No direccionamiento")
    }

    if (estados.length === 0) {
      estados.push("No tiene proceso")
    }

    return estados.join(" - ")
  }

  const handleExportExcel = async () => {
    const ipsNombreCache = new Map<string, string>()
    const municipioNombreCache = new Map<string, string>()

    const getIpsNombre = async (nit: string | undefined | null) => {
      const key = String(nit || "").trim()
      if (!key) return ""
      if (ipsNombreCache.has(key)) return ipsNombreCache.get(key) || ""

      let nombre = ""
      try {
        const response = await fetch(
          `/api/mipres/direccionamiento/ips?search=${encodeURIComponent(key)}`
        )
        if (response.ok) {
          const data = await response.json()
          const ipsArray = Array.isArray(data) ? data : data.value || []
          const found = ipsArray.find((item: any) => String(item.nit) === key)
          nombre = found?.ips_nombre || ""
        }
      } catch {
      }

      ipsNombreCache.set(key, nombre)
      return nombre
    }

    const getMunicipioNombre = async (codigo: string | undefined | null) => {
      const key = String(codigo || "").trim()
      if (!key) return ""
      if (municipioNombreCache.has(key)) return municipioNombreCache.get(key) || ""

      let nombre = ""
      try {
        const apiUrl = `https://www.datos.gov.co/resource/gdxc-w37w.json?cod_mpio=${encodeURIComponent(
          key
        )}`
        const response = await fetch(apiUrl)
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            nombre = data[0]?.nom_mpio || ""
          }
        }
      } catch {
      }

      municipioNombreCache.set(key, nombre)
      return nombre
    }

    const exportData = await Promise.all(
      filteredPrescripciones.map(async (presc: any) => {
        const medCount = getArray(presc, "medicamentos").length
        const procCount = getArray(presc, "procedimientos").length
        const dispCount = getArray(presc, "dispositivos").length
        const nutrCount = getArray(presc, "productosNutricionales").length
        const servCount = getArray(presc, "serviciosComplementarios").length

        const codAmbAte = presc.CodAmbAte ? String(presc.CodAmbAte).trim() : ""
        const ambitoAtencion =
          (codAmbAte && (AMBITOS_ATENCION as any)[codAmbAte]) || codAmbAte || ""

        const estadoPrescripcion =
          typeof presc.EstPres === "number"
            ? (ESTADOS_PRESCRIPCION as any)[presc.EstPres] || String(presc.EstPres)
            : presc.EstPres || ""

        const nombreIPS = await getIpsNombre(presc.NroIDIPS)
        const nombreMunicipioIPS = await getMunicipioNombre(presc.CodDANEMunIPS)

        return {
          NoPrescripcion: presc.NoPrescripcion || "",
          FPrescripcion: presc.FPrescripcion || "",
          HPrescripcion: presc.HPrescripcion || "",
          CodHabIPS: presc.CodHabIPS || "",
          TipoIDIPS: presc.TipoIDIPS || "",
          NroIDIPS: presc.NroIDIPS || "",
          CodDANEMunIPS: presc.CodDANEMunIPS || "",
          DirSedeIPS: presc.DirSedeIPS || "",
          TelSedeIPS: presc.TelSedeIPS || "",
          NombreIPS: nombreIPS || "",
          MunicipioIPS: nombreMunicipioIPS || "",
          TipoIDProf: presc.TipoIDProf || "",
          NumIDProf: presc.NumIDProf || "",
          PNProfS: presc.PNProfS || "",
          SNProfS: presc.SNProfS || "",
          PAProfS: presc.PAProfS || "",
          SAProfS: presc.SAProfS || "",
          RegProfS: presc.RegProfS || "",
          TipoIDPaciente: presc.TipoIDPaciente || presc.TipoIDPac || "",
          NroIDPaciente: presc.NroIDPaciente || presc.NoIDPaciente || "",
          PNPaciente: presc.PNPaciente || "",
          SNPaciente: presc.SNPaciente || "",
          PAPaciente: presc.PAPaciente || "",
          SAPaciente: presc.SAPaciente || "",
          CodAmbAte: presc.CodAmbAte || "",
          AmbitoAtencion: ambitoAtencion,
          RefAmbAte: presc.RefAmbAte ?? "",
          PacCovid19: presc.PacCovid19 ?? "",
          EnfHuerfana: presc.EnfHuerfana ?? "",
          CodEnfHuerfana: presc.CodEnfHuerfana || "",
          EnfHuerfanaDX: presc.EnfHuerfanaDX ?? "",
          CodDxPpal: presc.CodDxPpal || "",
          CodDxRel1: presc.CodDxRel1 || "",
          CodDxRel2: presc.CodDxRel2 || "",
          SopNutricional: presc.SopNutricional ?? "",
          CodEPS: presc.CodEPS || "",
          EstPres: presc.EstPres ?? "",
          EstadoPrescripcion: estadoPrescripcion,
          Exclusion: presc.Exclusion ?? "",
          tipoRegimen: presc.tipoRegimen || "",
          M: medCount,
          P: procCount,
          DM: dispCount,
          PN: nutrCount,
          C: servCount,
          EstadoDireccionamiento: getEstadoDireccionamiento(presc),
        }
      })
    )

    const timestamp = new Date().toISOString().split("T")[0]
    exportToExcel(exportData, `prescripciones_${timestamp}.xlsx`)
  }

  const handlePrintPrescripcion = async (presc: Prescripcion) => {
    try {
      await generarPrescripcionHTML(presc)
    } catch (error) {
      const errorMessage = error instanceof Error && error.message.includes('ventanas emergentes')
        ? 'Por favor permite ventanas emergentes para esta página y vuelve a intentar.'
        : 'Error al generar el PDF. Por favor intenta nuevamente.'
      
      alert(errorMessage)
    }
  }

  // Función para verificar estado de anulación y no direccionamiento de una prescripción específica
  const checkSingleAnulacionStatus = async (noPrescripcion: string) => {
    if (!credentials.nit) return

    const selectedPresc =
      prescripciones.find((p: any) => String(p?.NoPrescripcion) === String(noPrescripcion)) ||
      displayed.find((p: any) => String(p?.NoPrescripcion) === String(noPrescripcion))
    const tokens = getTokensForPrescripcion(selectedPresc)
    if (tokens.length === 0) return

    try {
      const [direccionamientos, noDireccionamientos] = await Promise.all([
        fetchDireccionamientosWithTokens(noPrescripcion, tokens),
        fetchNoDireccionamientosWithTokens(noPrescripcion, tokens),
      ])

      const tieneDireccionamientoVigente = direccionamientos.some((d: any) => !d.FecAnulacion)
      const tieneSoloDireccionamientosAnulados = direccionamientos.length > 0 && !tieneDireccionamientoVigente

      setDireccionamientoStatus((prev) => ({ ...prev, [noPrescripcion]: tieneDireccionamientoVigente }))
      setAnulacionStatus((prev) => ({ ...prev, [noPrescripcion]: tieneSoloDireccionamientosAnulados }))

      const tieneNoDireccionamiento = noDireccionamientos.length > 0
      const tieneNoDireccionamientoNoAnulado = noDireccionamientos.some(
        (row: any) => !String(row?.FecAnulacion ?? "").trim()
      )
      setNoDireccionamientoStatus((prev) => ({ ...prev, [noPrescripcion]: tieneNoDireccionamiento }))
      setNoDireccionamientoNoAnuladoStatus((prev) => ({ ...prev, [noPrescripcion]: tieneNoDireccionamientoNoAnulado }))
    } catch {
    }
  }

  const handleAccionesSuccess = async () => {
    const currentPrescripcion = selectedForAcciones
    const noPrescripcion = currentPrescripcion?.NoPrescripcion
      ? String(currentPrescripcion.NoPrescripcion)
      : null

    setAccionesModalOpen(false)
    setSelectedForAcciones(null)
    setAccionesFormOpen(false)
    setRefreshingAfterDir(true)

    // Optimistic update: mostrar verde inmediatamente sin esperar al API
    if (noPrescripcion) {
      setDireccionamientoStatus((prev) => ({ ...prev, [noPrescripcion]: true }))
      setAnulacionStatus((prev) => ({ ...prev, [noPrescripcion]: false }))
      setStatusChecked((prev) => ({ ...prev, [noPrescripcion]: false }))
    }

    try {
      if (credentials.nit) {
        await invalidateDireccionamientos(credentials.nit)
      }

      await Promise.all([
        noPrescripcion ? checkSingleAnulacionStatus(noPrescripcion) : Promise.resolve(),
        onRefreshAfterDireccionamiento?.() ?? Promise.resolve(),
      ])
    } finally {
      setRefreshingAfterDir(false)
    }
  }

  if (!prescripciones || prescripciones.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">No se encontraron prescripciones</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Intenta con otros criterios de búsqueda</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {!anyFormOpen && <>
      <PrescripcionTableHeader
        total={total}
        absoluteTotal={prescripciones.length}
        refreshing={refreshingAfterDir}
        isAdminUser={isAdminUser}
        municipiosLoading={municipiosLoading}
        municipiosError={municipiosError}
        departamentoFilter={departamentoFilter}
        setDepartamentoFilter={setDepartamentoFilter}
        municipioFilter={municipioFilter}
        setMunicipioFilter={setMunicipioFilter}
        departamentoOptions={departamentoOptions}
        municipioOptions={municipioOptions}
        searchNoPrescripcion={searchNoPrescripcion}
        setSearchNoPrescripcion={setSearchNoPrescripcion}
        direccionamientoFilter={direccionamientoFilter}
        setDireccionamientoFilter={setDireccionamientoFilter}
        estJmFilter={estJmFilter}
        setEstJmFilter={setEstJmFilter}
        regimenFilter={regimenFilter}
        setRegimenFilter={setRegimenFilter}
        ambitoFilter={ambitoFilter}
        setAmbitoFilter={setAmbitoFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        handleExportExcel={handleExportExcel}
      />

      <PrescripcionTableBody
        displayed={displayed}
        allFiltered={filteredPrescripciones}
        dateSort={dateSort}
        setDateSort={setDateSort}
        direccionamientoStatus={direccionamientoStatus}
        noDireccionamientoStatus={noDireccionamientoStatus}
        noDireccionamientoNoAnuladoStatus={noDireccionamientoNoAnuladoStatus}
        anulacionStatus={anulacionStatus}
        credentials={credentials}
        openVerModal={openVerModal}
        openNoDireccionamientoModal={openNoDireccionamientoModal}
        openAccionesModal={openAccionesModal}
        handlePrintPrescripcion={handlePrintPrescripcion}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Pag:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(Number(value))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-16 h-8 text-xs bg-white text-foreground border border-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs font-medium min-w-[50px] text-center">
            {page} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={page >= pageCount}
            onClick={() => setPage(Math.min(pageCount, page + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </>}

      {/* Modal de acciones */}
      {selectedForAcciones && (
        <AccionesModal
          prescripcion={selectedForAcciones}
          open={accionesModalOpen}
          onClose={() => {
            setAccionesModalOpen(false)
            setSelectedForAcciones(null)
            setAccionesInitialFocus(null)
            setAccionesFormOpen(false)
          }}
          credentials={credentials}
          onSuccess={handleAccionesSuccess}
          onFormVisibilityChange={setAccionesFormOpen}
          initialFocus={accionesInitialFocus || undefined}
        />
      )}

      {selectedForVer && (
        <DireccionamientoLecturaModal
          prescripcion={selectedForVer}
          open={verModalOpen}
          onClose={async () => {
            if (selectedForVer?.NoPrescripcion) {
              await checkSingleAnulacionStatus(selectedForVer.NoPrescripcion)
            }
            setVerModalOpen(false)
            setSelectedForVer(null)
            setVerFormOpen(false)
          }}
          credentials={credentials}
          onFormVisibilityChange={setVerFormOpen}
          onRequestDireccionar={(presc, params) => openAccionesModalWithFocus(presc, params)}
        />
      )}

      {selectedForNoDireccionamiento && (
        <NoDireccionamientoLecturaModal
          prescripcion={selectedForNoDireccionamiento}
          open={noDireccionamientoModalOpen}
          onClose={() => {
            setNoDireccionamientoModalOpen(false)
            setSelectedForNoDireccionamiento(null)
            setNoDirFormOpen(false)
          }}
          credentials={credentials}
          onFormVisibilityChange={setNoDirFormOpen}
        />
      )}
    </div>
  )
}
