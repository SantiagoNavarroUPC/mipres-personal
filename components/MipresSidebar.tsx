"use client"

import React, { useMemo, useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
  Stethoscope,
  Route,
  Gavel,
  FileX2,
  CalendarClock,
  Truck,
  ClipboardCheck,
  Pill,
  ReceiptText,
  UserCog,
  FileBarChart,
  Settings2,
  ChevronRight,
  Activity,
  Layers,
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

// Icon map linking each module to specialized healthcare and medical symbols
const ICON_MAP: Record<string, React.ElementType> = {
  prescripcion: Stethoscope,
  direccionamiento: Route,
  tutelas: Gavel,
  no_direccionamiento: FileX2,
  programacion: CalendarClock,
  entrega: Truck,
  reporte_entrega: ClipboardCheck,
  suministro: Pill,
  facturacion: ReceiptText,
  usuarios: UserCog,
  informes: FileBarChart,
  configuracion: Settings2,
}

interface CategoryGroup {
  id: string
  title: string
  moduleIds: MipresModule[]
}

const CATEGORIES: CategoryGroup[] = [
  {
    id: "clinica",
    title: "Prescripción",
    moduleIds: ["prescripcion", "tutelas"],
  },
  {
    id: "logistica",
    title: "Direccionamiento y Suministro",
    moduleIds: [
      "direccionamiento",
      "no_direccionamiento",
      "programacion",
      "entrega",
      "reporte_entrega",
      "suministro",
    ],
  },
  {
    id: "gestion",
    title: "Gestión y Reportes",
    moduleIds: ["facturacion", "informes"],
  },
  {
    id: "sistema",
    title: "Administración",
    moduleIds: ["usuarios", "configuracion"],
  },
]

const allMenuItems = MODULOS.map((m) => ({
  id: m.id as MipresModule,
  label: m.label,
  icon: ICON_MAP[m.id] ?? FileText,
  description: m.description,
}))

/**
 * Animated background widget replicating the login background:
 * interactive constellation particles canvas + ambient floating blobs + tech dot grid.
 */
function SidebarFooterBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    let animationFrameId: number
    let width = (canvas.width = container.clientWidth)
    let height = (canvas.height = container.clientHeight)

    const isDark = mounted ? resolvedTheme === "dark" : false
    const particleRGB = isDark ? "45, 212, 191" : "15, 118, 110"
    const secondaryRGB = isDark ? "56, 189, 248" : "13, 148, 136"

    const particleCount = 20
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      size: Math.random() * 1.5 + 1.2,
      alpha: Math.random() * 0.35 + 0.5,
    }))

    let mouseX = -1000
    let mouseY = -1000

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouseX = -1000
      mouseY = -1000
    }

    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseleave", handleMouseLeave)

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width && entry.contentRect.height) {
          width = canvas.width = entry.contentRect.width
          height = canvas.height = entry.contentRect.height
        }
      }
    })
    resizeObserver.observe(container)

    let isVisible = !document.hidden
    const handleVisibility = () => {
      isVisible = !document.hidden
    }
    document.addEventListener("visibilitychange", handleVisibility)

    const render = () => {
      if (!isVisible || prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = width
        else if (p.x > width) p.x = 0

        if (p.y < 0) p.y = height
        else if (p.y > height) p.y = 0

        // Subtle mouse repulsion inside the card
        const dxM = mouseX - p.x
        const dyM = mouseY - p.y
        const distM = Math.hypot(dxM, dyM)
        if (distM < 50) {
          p.x -= (dxM / distM) * 0.5
          p.y -= (dyM / distM) * 0.5
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${particleRGB}, ${p.alpha})`
        ctx.fill()

        // Connecting lines between particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.hypot(dx, dy)
          if (dist < 46) {
            const alpha = (1 - dist / 46) * (isDark ? 0.35 : 0.28)
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${secondaryRGB}, ${alpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
      document.removeEventListener("visibilitychange", handleVisibility)
      resizeObserver.disconnect()
    }
  }, [mounted, resolvedTheme])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      aria-hidden="true"
    >
      {/* Animated ambient gradient blobs matching login */}
      <div className="absolute -top-6 -left-6 size-24 rounded-full bg-primary/20 blur-lg animate-blob-1" />
      <div className="absolute -bottom-6 -right-6 size-24 rounded-full bg-teal-400/25 blur-lg animate-blob-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-20 rounded-full bg-emerald-500/15 blur-xl animate-pulse-subtle" />

      {/* Modern medical/tech dot grid matching login with crisp contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,118,110,0.22)_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.25)_1.2px,transparent_1.2px)] bg-[size:10px_10px] opacity-70" />

      {/* Dynamic particle constellation canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}

export function MipresSidebar({
  activeModule,
  onModuleChange,
  isOpen,
  permisos,
  permisosLoaded,
}: MipresSidebarProps) {
  const visibleMenuItems = useMemo(() => {
    if (!permisosLoaded) return []
    return allMenuItems.filter((item) =>
      permisos.some((p) => p.modulo_id === item.id && p.activo === true)
    )
  }, [permisos, permisosLoaded])

  const renderMenuItem = (item: (typeof allMenuItems)[number]) => {
    const Icon = item.icon
    const isActive = activeModule === item.id

    return (
      <button
        key={item.id}
        onClick={() => onModuleChange(item.id)}
        className={cn(
          "group relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs shadow-sidebar-primary/30 font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
        )}
      >
        <div
          className={cn(
            "flex size-7.5 shrink-0 items-center justify-center rounded-lg transition-colors",
            isActive
              ? "bg-white/20 dark:bg-white/15 text-sidebar-primary-foreground"
              : "bg-sidebar-accent/60 text-sidebar-foreground/75 group-hover:bg-sidebar-primary/15 group-hover:text-sidebar-primary"
          )}
        >
          <Icon className="size-4 shrink-0" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs leading-snug truncate">{item.label}</p>
          <p
            className={cn(
              "text-[10px] leading-tight truncate mt-0.5",
              isActive
                ? "text-sidebar-primary-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {item.description}
          </p>
        </div>

        {isActive ? (
          <ChevronRight className="size-3.5 shrink-0 text-sidebar-primary-foreground/90" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </button>
    )
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-[60px] h-[calc(100vh-60px)] w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-40 flex flex-col shadow-lg md:shadow-none select-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Module Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto scrollbar-hidden">
        {!permisosLoaded ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-sidebar-accent/40 animate-pulse"
              >
                <div className="size-7.5 rounded-lg bg-sidebar-border/60 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 bg-sidebar-border/60 rounded" />
                  <div className="h-2 w-32 bg-sidebar-border/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleMenuItems.length === 0 ? (
          <div className="py-8 px-3 text-center">
            <Layers className="size-7 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs font-medium text-sidebar-foreground">
              Sin módulos disponibles
            </p>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const categoryItems = visibleMenuItems.filter((item) =>
              cat.moduleIds.includes(item.id)
            )
            if (categoryItems.length === 0) return null

            return (
              <div key={cat.id} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2 py-1">
                  {cat.title}
                </p>
                <div className="space-y-1">
                  {categoryItems.map((item) => renderMenuItem(item))}
                </div>
              </div>
            )
          })
        )}
      </nav>

      {/* Footer Status and Author Credit with Login Background Animation */}
      <div className="p-3 border-t border-sidebar-border/80 bg-sidebar/60">
        <div className="relative group overflow-hidden rounded-xl border border-border/80 dark:border-sidebar-border/80 bg-white dark:bg-card p-2.5 shadow-xs transition-all duration-300 hover:border-sidebar-primary/60 hover:shadow-md">
          {/* Animated constellation, floating blobs and dot grid from login background */}
          <SidebarFooterBackground />

          {/* Top gradient highlight bar */}
          <div
            className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sidebar-primary to-transparent opacity-80 z-10"
            aria-hidden="true"
          />

          {/* Content rendered on top of the animated background */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 transition-transform duration-300 group-hover:scale-105 backdrop-blur-xs">
              <Activity className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-800 dark:text-foreground truncate">
                  MIPRES Oficial
                </p>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-muted-foreground truncate">
                Desarrollado por Santiago Navarro
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
