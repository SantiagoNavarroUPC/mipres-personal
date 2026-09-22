"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, Building2, Eye, EyeOff } from "lucide-react"

interface CredencialesCardProps {
  nit: string
  TOKEN_SUBSIDIADO: string | undefined
  TOKEN_CONTRIBUTIVO: string | undefined
  showToken: boolean
  onShowTokenToggle: () => void
}

export function CredencialesCard({
  nit,
  TOKEN_SUBSIDIADO,
  TOKEN_CONTRIBUTIVO,
  showToken,
  onShowTokenToggle,
}: CredencialesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Credenciales MIPRES
        </CardTitle>
        <CardDescription>
          Credenciales cargadas automáticamente desde configuración
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="nit" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            NIT de la EPS/IPS
          </Label>
          <Input
            id="nit"
            placeholder="Ej: 824001398"
            value={nit}
            className="mt-1 bg-muted"
            readOnly
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cargado automáticamente desde configuración
          </p>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Token Subsidiado
          </Label>
          <div className="relative mt-1">
            <Input
              type={showToken ? "text" : "password"}
              value={TOKEN_SUBSIDIADO || ""}
              className="pr-10 bg-muted"
              readOnly
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={onShowTokenToggle}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cargado automáticamente desde configuración
          </p>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Token Contributivo
          </Label>
          <div className="relative mt-1">
            <Input
              type={showToken ? "text" : "password"}
              value={TOKEN_CONTRIBUTIVO || ""}
              className="pr-10 bg-muted"
              readOnly
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={onShowTokenToggle}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cargado automáticamente desde configuración
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
