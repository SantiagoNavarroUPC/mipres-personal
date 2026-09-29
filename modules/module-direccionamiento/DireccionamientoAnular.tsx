"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Ban, Loader2 } from "lucide-react"

interface DireccionamientoAnularProps {
  idDireccionamiento: string
  loading: boolean
  onIdChange: (id: string) => void
  onAnular: () => void
}

export function DireccionamientoAnular({
  idDireccionamiento,
  loading,
  onIdChange,
  onAnular,
}: DireccionamientoAnularProps) {
  return (
    <Card className="relative overflow-hidden rounded-xl border border-border/80 dark:border-border/60 bg-card/85 dark:bg-card/75 backdrop-blur-xl shadow-xs">
      <CardHeader>
        <CardTitle className="leading-none font-semibold flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-destructive/10 text-destructive border border-destructive/20">
            <Ban className="size-3.5" />
          </span>
          Anular Direccionamiento
        </CardTitle>
        <CardDescription>Metodo para anular un direccionamiento</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
          <div className="flex-1 group flex flex-col gap-1.5">
            <Label htmlFor="idDir" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Ban className="size-3 text-muted-foreground group-focus-within:text-destructive transition-colors" />
              ID Direccionamiento
            </Label>
            <Input
              id="idDir"
              placeholder="123456"
              value={idDireccionamiento}
              onChange={(e) => onIdChange(e.target.value)}
              className="h-9 bg-card/60 backdrop-blur-xs border-border/80 hover:border-border focus-visible:bg-card focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/20 transition-all text-sm rounded-xl font-mono placeholder:font-sans"
              disabled={loading}
            />
          </div>
          <Button
            variant="destructive"
            onClick={onAnular}
            disabled={loading}
            className="relative overflow-hidden group h-9 w-full sm:w-auto font-semibold text-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm shadow-destructive/20 hover:shadow-destructive/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-xl"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            {loading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Ban className="size-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
            )}
            <span>{loading ? "Anulando..." : "Anular"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
