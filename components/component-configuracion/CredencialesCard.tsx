"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, Building2, Eye, EyeOff, Loader2, Save } from "lucide-react"
import { useEmpresaActual } from "@/lib/use-empresa-actual"

interface CredencialesCardProps {
  nit: string
  loading: boolean
  tokenSubsidiado: string | null
  tokenContributivo: string | null
  guardando: boolean
  onGuardar: (tokenSubsidiado: string, tokenContributivo: string) => Promise<void>
}

export function CredencialesCard({
  nit,
  loading,
  tokenSubsidiado,
  tokenContributivo,
  guardando,
  onGuardar,
}: CredencialesCardProps) {
  const { esIPS } = useEmpresaActual()
  const [showToken, setShowToken] = useState(false)
  const [subsidiado, setSubsidiado] = useState(tokenSubsidiado || "")
  const [contributivo, setContributivo] = useState(tokenContributivo || "")

  useEffect(() => {
    setSubsidiado(tokenSubsidiado || "")
  }, [tokenSubsidiado])

  useEffect(() => {
    setContributivo(tokenContributivo || "")
  }, [tokenContributivo])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Credenciales MIPRES
        </CardTitle>
        <CardDescription>
          Claves asignadas por MIPRES a esta empresa. Se guardan cifradas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="nit" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            NIT de la {esIPS ? "IPS" : "EPS"}
          </Label>
          <Input
            id="nit"
            placeholder="Ej: 824001398"
            value={nit}
            className="mt-1 bg-muted"
            readOnly
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cargado automáticamente desde la empresa asignada
          </p>
        </div>

        <div>
          <Label htmlFor="token-subsidiado" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Token Subsidiado
          </Label>
          <div className="relative mt-1">
            <Input
              id="token-subsidiado"
              type={showToken ? "text" : "password"}
              value={subsidiado}
              onChange={(e) => setSubsidiado(e.target.value)}
              placeholder="Token fuente asignado por MIPRES"
              disabled={loading || guardando}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="token-contributivo" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Token Contributivo
          </Label>
          <div className="relative mt-1">
            <Input
              id="token-contributivo"
              type={showToken ? "text" : "password"}
              value={contributivo}
              onChange={(e) => setContributivo(e.target.value)}
              placeholder="Token fuente asignado por MIPRES"
              disabled={loading || guardando}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={loading || guardando || (!subsidiado.trim() && !contributivo.trim())}
          onClick={() => void onGuardar(subsidiado.trim(), contributivo.trim())}
        >
          {guardando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {guardando ? "Guardando..." : "Guardar credenciales"}
        </Button>
      </CardContent>
    </Card>
  )
}
