"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  baseAlpha: number
}

export function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Respect user motion preference for accessibility
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const isDark = mounted ? resolvedTheme === "dark" : false

    // Particle color configuration matching the theme's teal (#0f766e in light, #0d9488 in dark)
    const particleRGB = isDark ? "45, 212, 191" : "15, 118, 110"
    const secondaryRGB = isDark ? "56, 189, 248" : "13, 148, 136"

    const particleCount = Math.min(Math.floor((width * height) / 28000), 50)
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      const baseAlpha = Math.random() * 0.4 + 0.15
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        size: Math.random() * 2 + 1.2,
        alpha: baseAlpha,
        baseAlpha,
      })
    }

    let mouseX = -1000
    let mouseY = -1000

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const handleMouseLeave = () => {
      mouseX = -1000
      mouseY = -1000
    }

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseleave", handleMouseLeave)

    let isDocumentVisible = !document.hidden
    const handleVisibilityChange = () => {
      isDocumentVisible = !document.hidden
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    const render = () => {
      if (!isDocumentVisible || prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, width, height)

      // Draw and update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        p.x += p.vx
        p.y += p.vy

        // Wrap around boundaries smoothly
        if (p.x < -10) p.x = width + 10
        else if (p.x > width + 10) p.x = -10

        if (p.y < -10) p.y = height + 10
        else if (p.y > height + 10) p.y = -10

        // Mouse interaction: subtle push/glow when cursor is near
        const dxMouse = mouseX - p.x
        const dyMouse = mouseY - p.y
        const distMouse = Math.hypot(dxMouse, dyMouse)
        let extraAlpha = 0
        if (distMouse < 140) {
          extraAlpha = (1 - distMouse / 140) * 0.4
          p.x -= (dxMouse / distMouse) * 0.6
          p.y -= (dyMouse / distMouse) * 0.6
        }

        // Draw particle node
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${particleRGB}, ${Math.min(p.alpha + extraAlpha, 0.9)})`
        ctx.fill()

        // Connect nearby particles with subtle constellation lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.hypot(dx, dy)
          const maxDist = 120

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * (isDark ? 0.22 : 0.16)
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${secondaryRGB}, ${lineAlpha})`
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
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [mounted, resolvedTheme])

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Dynamic ambient luminous orbs with soft blur */}
      <div className="absolute -top-32 -left-28 h-96 w-96 rounded-full bg-primary/20 dark:bg-primary/25 blur-3xl animate-blob-1" />
      <div className="absolute top-1/4 -right-32 h-[26rem] w-[26rem] rounded-full bg-teal-500/15 dark:bg-teal-400/20 blur-3xl animate-blob-2" />
      <div className="absolute -bottom-36 left-1/4 h-[28rem] w-[28rem] rounded-full bg-emerald-500/15 dark:bg-teal-600/20 blur-3xl animate-blob-3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[34rem] w-[34rem] rounded-full bg-primary/10 dark:bg-primary/15 blur-[120px] animate-pulse-subtle" />

      {/* Modern medical/tech dot grid with smooth radial vignette */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,118,110,0.12)_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.12)_1.2px,transparent_1.2px)] bg-[size:32px_32px]"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, #000 40%, transparent 100%)",
        }}
      />

      {/* Floating subtle medical tech crosses */}
      <div className="absolute top-16 left-[15%] hidden md:block text-primary/25 dark:text-primary/35 animate-float-slow">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />
        </svg>
      </div>
      <div className="absolute bottom-24 right-[18%] hidden md:block text-primary/20 dark:text-primary/30 animate-float-reverse">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />
        </svg>
      </div>
      <div className="absolute top-1/3 right-[10%] hidden lg:block text-teal-400/20 dark:text-teal-300/25 animate-float-slow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />
        </svg>
      </div>

      {/* Interactive Constellation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  )
}
