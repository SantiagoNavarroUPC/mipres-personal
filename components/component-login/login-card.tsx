"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"
import { LoginFooter } from "./login-footer"
import { LoginHeader } from "./login-header"

export function LoginCard() {
  const [mode, setMode] = useState<"login" | "register">("login")

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <Card className="w-full shadow-lg border-border/60 overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out will-change-transform"
          style={{
            width: "200%",
            transform: mode === "login" ? "translateX(0)" : "translateX(-50%)",
          }}
        >
          {/* Panel: Iniciar sesión */}
          <div className="w-1/2 min-w-0">
            <CardHeader className="pb-2">
              <LoginHeader mode="login" />
            </CardHeader>
            <CardContent>
              <LoginForm onCreateAccount={() => setMode("register")} />
            </CardContent>
          </div>

          {/* Panel: Crear usuario */}
          <div className="w-1/2 min-w-0">
            <CardHeader className="pb-2">
              <LoginHeader mode="register" />
            </CardHeader>
            <CardContent>
              <RegisterForm
                onBack={() => setMode("login")}
                onSuccess={() => setMode("login")}
              />
            </CardContent>
          </div>
        </div>
      </Card>
      <LoginFooter />
    </div>
  )
}
