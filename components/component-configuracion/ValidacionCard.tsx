"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, Info, Loader2, Wifi, WifiOff, Eye, EyeOff, Save, PenLine } from "lucide-react"

interface ConnectionResult {
  success: boolean
  message?: string
  error?: string
  tokenAcceso?: string
  data?: unknown
}

interface ValidacionCardProps {
  esIPS: boolean
  generando: boolean
  generarResult: ConnectionResult | null
  tokenAccesoSubsidiado: string | null | undefined
  tokenAccesoContributivo: string | null | undefined
  showTokenAcceso: boolean
  onValidar: () => void
  onShowTokenAccesoToggle: () => void
  guardandoManual: boolean
  onGuardarManual: (tokenAccesoSubsidiado: string, tokenAccesoContributivo: string) => Promise<void>
}

export function ValidacionCard({
  esIPS,
  generando,
  generarResult,
  tokenAccesoSubsidiado,
  tokenAccesoContributivo,
  showTokenAcceso,
  onValidar,
  onShowTokenAccesoToggle,
  guardandoManual,
  onGuardarManual,
}: ValidacionCardProps) {
  const [modoManual, setModoManual] = useState(esIPS)
  const [manualSubsidiado, setManualSubsidiado] = useState(tokenAccesoSubsidiado || "")
  const [manualContributivo, setManualContributivo] = useState(tokenAccesoContributivo || "")
  // IPS no tiene dos regímenes (Subsidiado/Contributivo): un único token
  // válido se guarda igual en ambas columnas de empresa_credenciales.
  const [manualIPS, setManualIPS] = useState(tokenAccesoSubsidiado || tokenAccesoContributivo || "")

  useEffect(() => {
    setManualSubsidiado(tokenAccesoSubsidiado || "")
    if (esIPS) setManualIPS(tokenAccesoSubsidiado || tokenAccesoContributivo || "")
  }, [tokenAccesoSubsidiado, esIPS, tokenAccesoContributivo])

  useEffect(() => {
    setManualContributivo(tokenAccesoContributivo || "")
  }, [tokenAccesoContributivo])

  if (esIPS) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Validación de Credenciales
          </CardTitle>
          <CardDescription>
            Como IPS no hay intercambio contra MIPRES: digite el token ya validado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Digite el token de acceso que ya validó directamente en la página de MIPRES. Se guardará como token de acceso de esta empresa.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="manual-ips">Token de Acceso</Label>
            <Input
              id="manual-ips"
              type={showTokenAcceso ? "text" : "password"}
              value={manualIPS}
              onChange={(e) => setManualIPS(e.target.value)}
              placeholder="Token de acceso ya validado"
              disabled={guardandoManual}
              className="mt-1"
            />
          </div>

          <Button
            className="w-full"
            disabled={guardandoManual || !manualIPS.trim()}
            onClick={() => void onGuardarManual(manualIPS.trim(), manualIPS.trim())}
          >
            {guardandoManual ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {guardandoManual ? "Guardando..." : "Guardar token de acceso"}
          </Button>

          {(tokenAccesoSubsidiado || tokenAccesoContributivo) && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Token de Acceso guardado
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={onShowTokenAccesoToggle}>
                  {showTokenAcceso ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Input
                type={showTokenAcceso ? "text" : "password"}
                value={tokenAccesoSubsidiado || tokenAccesoContributivo || ""}
                readOnly
                className="mt-1 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
              />
              <Badge className="mt-2 bg-green-600">✓ Guardado</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Validación de Credenciales
        </CardTitle>
        <CardDescription>
          Obtenga el token de acceso validándolo contra MIPRES, o ingréselo manualmente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={modoManual ? "outline" : "default"}
            className="flex-1"
            disabled={generando}
            onClick={() => {
              setModoManual(false)
              onValidar()
            }}
          >
            {generando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {generando ? "Validando..." : "Validar por webservice"}
          </Button>
          <Button
            type="button"
            variant={modoManual ? "default" : "outline"}
            className="flex-1"
            onClick={() => setModoManual(true)}
          >
            <PenLine className="h-4 w-4 mr-2" />
            Ingresar manualmente
          </Button>
        </div>

        {!modoManual ? (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Valida las credenciales guardadas: se solicitarán dos tokens de acceso a MIPRES (Subsidiado y Contributivo).
              </AlertDescription>
            </Alert>

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
          </>
        ) : (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Digite el token de acceso si ya lo validó directamente en la página de MIPRES.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="manual-subsidiado">Token de Acceso - Subsidiado</Label>
              <Input
                id="manual-subsidiado"
                type={showTokenAcceso ? "text" : "password"}
                value={manualSubsidiado}
                onChange={(e) => setManualSubsidiado(e.target.value)}
                placeholder="Token de acceso ya validado"
                disabled={guardandoManual}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="manual-contributivo">Token de Acceso - Contributivo</Label>
              <Input
                id="manual-contributivo"
                type={showTokenAcceso ? "text" : "password"}
                value={manualContributivo}
                onChange={(e) => setManualContributivo(e.target.value)}
                placeholder="Token de acceso ya validado"
                disabled={guardandoManual}
                className="mt-1"
              />
            </div>

            <Button
              className="w-full"
              disabled={guardandoManual || (!manualSubsidiado.trim() && !manualContributivo.trim())}
              onClick={() => void onGuardarManual(manualSubsidiado.trim(), manualContributivo.trim())}
            >
              {guardandoManual ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {guardandoManual ? "Guardando..." : "Guardar token de acceso"}
            </Button>
          </>
        )}

        {(tokenAccesoSubsidiado || tokenAccesoContributivo) && (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onShowTokenAccesoToggle}>
              {showTokenAcceso ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showTokenAcceso ? "Ocultar tokens" : "Mostrar tokens"}
            </Button>
          </div>
        )}

        {tokenAccesoSubsidiado && (
          <div>
            <Label className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Token de Acceso - Subsidiado
            </Label>
            <Input
              type={showTokenAcceso ? "text" : "password"}
              value={tokenAccesoSubsidiado}
              readOnly
              className="mt-1 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
            />
            <Badge className="mt-2 bg-green-600">✓ Guardado</Badge>
          </div>
        )}

        {tokenAccesoContributivo && (
          <div>
            <Label className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Token de Acceso - Contributivo
            </Label>
            <Input
              type={showTokenAcceso ? "text" : "password"}
              value={tokenAccesoContributivo}
              readOnly
              className="mt-1 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
            />
            <Badge className="mt-2 bg-blue-600">✓ Guardado</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
