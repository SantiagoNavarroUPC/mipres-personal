"use client"

import React from "react"

import {
  FileText,
  ArrowRight,
  Package,
  ClipboardCheck,
  FileBarChart,
  XCircle,
  ClipboardList,
  Settings,
  ChevronRight,
  ArrowLeft,
  Users,
  Receipt,
  CalendarClock,
  Truck
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { MipresModule } from "@/app/mipres/page"
import type { Permiso } from "@/models/permisos.model"
import { MODULOS } from "@/models/permisos.model"

interface MipresSidebarProps {
  activeModule: MipresModule
  onModuleChange: (module: MipresModule) => void
  isOpen: boolean
  permisos: Permiso[]
  permisosLoaded: boolean
}

// Build menu items from MODULOS and an icon map to avoid duplication
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

const allMenuItems = MODULOS.map((m) => ({
  id: m.id as MipresModule,
  label: m.label,
  icon: ICON_MAP[m.id] ?? FileText,
  description: m.description,
}))

export function MipresSidebar({ activeModule, onModuleChange, isOpen, permisos, permisosLoaded }: MipresSidebarProps) {
  const visibleMenuItems = !permisosLoaded ? [] : allMenuItems.filter((item) => {
    const hasPermission = permisos.some(
      (p) => p.modulo_id === item.id && p.activo === true
    )

    return hasPermission
  })
  return (
    <aside
      className={cn(
        "fixed left-0 top-[60px] h-[calc(100vh-60px)] w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-40",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="h-full flex flex-col">
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hidden">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
          Módulos
        </p>
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeModule === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onModuleChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                <p className={cn(
                  "text-xs truncate",
                  isActive ? "text-sidebar-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {item.description}
                </p>
              </div>
              {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
            </button>
          )
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="bg-accent/50 rounded-lg p-3">
            <p className="text-xs font-medium text-accent-foreground">HERRAMIENTA MIPRES</p>
            <p className="text-xs text-muted-foreground mt-1">
              Desarrollado por Santiago Navarro
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
