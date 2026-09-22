"use client"

import { useState } from "react"
import { Users, ShieldAlert, BadgeInfo } from "lucide-react"
import type { MipresCredentials } from "@/models/credentials.model"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RolesTab, UsuariosTab } from "@/modules/module-usuarios"

interface UsuariosModuleProps {
  credentials: MipresCredentials
}

export function UsuariosModule({ credentials }: UsuariosModuleProps) {
  const [activeTab, setActiveTab] = useState("usuarios")
  const isAdmin = credentials?.rolMipres === 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administra los usuarios del sistema</p>
        </div>
      </div>

      {!isAdmin ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Acceso denegado. Solo los administradores pueden gestionar usuarios. Tu rol actual es: <strong>{credentials?.rol_nombre || "Usuario"}</strong>
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-muted h-auto gap-1">
            <TabsTrigger
              value="usuarios"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4 mr-2" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BadgeInfo className="h-4 w-4 mr-2" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="vacio-1" disabled className="opacity-0 pointer-events-none" aria-hidden="true" />
            <TabsTrigger value="vacio-2" disabled className="opacity-0 pointer-events-none" aria-hidden="true" />
          </TabsList>

          <TabsContent value="usuarios">
            <UsuariosTab credentials={credentials} />
          </TabsContent>

          <TabsContent value="roles">
            <RolesTab credentials={credentials} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}