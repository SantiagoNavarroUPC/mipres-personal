"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, CheckCircle, Key, Building2, ShieldCheck } from "lucide-react"
import type { MipresCredentials } from "@/models/credentials.model"

interface EstadoCardProps {
  credentials: MipresCredentials
}

export function EstadoCard({ credentials }: EstadoCardProps) {
  const tieneTokens = credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo
  const tieneTokensDuales = credentials.tokenAccesoSubsidiado && credentials.tokenAccesoContributivo
  const isConfigured = credentials.nit && credentials.tokenSubsidiado && credentials.tokenContributivo && (credentials.tokenAccesoSubsidiado || credentials.tokenAccesoContributivo)

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Estado de Configuración
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">NIT</p>
              <p className="text-xs text-muted-foreground">
                {credentials.nit || "No configurado"}
              </p>
            </div>
            {credentials.nit && <Badge className="bg-green-600">OK</Badge>}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Token Subsidiado</p>
              <p className="text-xs text-muted-foreground">
                {credentials.tokenAccesoSubsidiado ? "Generado" : "No configurado"}
              </p>
            </div>
            {credentials.tokenAccesoSubsidiado && <Badge className="bg-green-600">OK</Badge>}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Token Contributivo</p>
              <p className="text-xs text-muted-foreground">
                {credentials.tokenAccesoContributivo ? "Generado" : "No configurado"}
              </p>
            </div>
            {credentials.tokenAccesoContributivo && <Badge className="bg-green-600">OK</Badge>}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Token de Acceso Principal</p>
              <p className="text-xs text-muted-foreground">
                {credentials.tokenAcceso ? "Activo" : "No configurado"}
              </p>
            </div>
            {credentials.tokenAcceso && <Badge className="bg-blue-600">OK</Badge>}
          </div>
        </div>

        {tieneTokensDuales && (
          <Alert className="border-green-600 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✓ Configuración con tokens duales activa. Todas las consultas usarán ambos régimens (Subsidiado + Contributivo).
            </AlertDescription>
          </Alert>
        )}

        {isConfigured && !tieneTokensDuales && (
          <Alert className="border-blue-600 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              ✓ Configuración con token único activa. Las consultas usarán el token principal.
            </AlertDescription>
          </Alert>
        )}

        {!isConfigured && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              ❌ Configuración incompleta. Por favor:
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs">
                <li>Ingrese el NIT</li>
                <li>Haga clic en "Revalidar token"</li>
                <li>Espere a que se generen los tokens (Subsidiado y Contributivo)</li>
                <li>Luego podrá usar todos los módulos</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
