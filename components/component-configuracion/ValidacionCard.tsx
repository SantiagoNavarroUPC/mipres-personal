"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, Info, Loader2, Wifi, WifiOff, Eye, EyeOff } from "lucide-react"

interface ConnectionResult {
  success: boolean
  message?: string
  error?: string
  tokenAcceso?: string
  data?: unknown
}

interface ValidacionCardProps {
  generando: boolean
  generarResult: ConnectionResult | null
  tokenAccesoSubsidiado: string | undefined
  tokenAccesoContributivo: string | undefined
  showTokenAcceso: boolean
  onValidar: () => void
  onShowTokenAccesoToggle: () => void
}

export function ValidacionCard({
  generando,
  generarResult,
  tokenAccesoSubsidiado,
  tokenAccesoContributivo,
  showTokenAcceso,
  onValidar,
  onShowTokenAccesoToggle,
}: ValidacionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Validación de Credenciales
        </CardTitle>
        <CardDescription>
          Valide sus credenciales y obtenga el token de acceso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Valide sus credenciales: se solicitarán dos tokens de acceso a MIPRES (Subsidiado y Contributivo).
          </AlertDescription>
        </Alert>

        <Button
          onClick={onValidar}
          className="w-full"
          disabled={generando}
        >
          {generando ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4 mr-2" />
          )}
          {generando ? "Revalidando..." : "Revalidar token"}
        </Button>

        {generarResult && (
          <div className={`p-3 rounded-lg ${generarResult.success ? "bg-primary/10 border border-primary/20" : "bg-destructive/10 border border-destructive/20"}`}>
            <div className="flex items-center gap-2">
              {generarResult.success ? (
                <Wifi className="h-4 w-4 text-primary" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              <div className="flex-1">
                <span className={`text-sm font-medium ${generarResult.success ? "text-primary" : "text-destructive"}`}>
                  {generarResult.success ? generarResult.message : generarResult.error}
                </span>
              </div>
            </div>
          </div>
        )}

        {tokenAccesoSubsidiado && (
          <div>
            <Label className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Token de Acceso - Subsidiado
            </Label>
            <div className="relative mt-1">
              <Input
                type={showTokenAcceso ? "text" : "password"}
                value={tokenAccesoSubsidiado}
                readOnly
                className="pr-10 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={onShowTokenAccesoToggle}
              >
                {showTokenAcceso ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Badge className="mt-2 bg-green-600">✓ Validado</Badge>
          </div>
        )}

        {tokenAccesoContributivo && (
          <div>
            <Label className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Token de Acceso - Contributivo
            </Label>
            <div className="relative mt-1">
              <Input
                type={showTokenAcceso ? "text" : "password"}
                value={tokenAccesoContributivo}
                readOnly
                className="pr-10 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={onShowTokenAccesoToggle}
              >
                {showTokenAcceso ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Badge className="mt-2 bg-blue-600">✓ Validado</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
