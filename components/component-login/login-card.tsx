"use client"

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { LoginForm } from "./login-form"
import { LoginFooter } from "./login-footer"
import { LoginHeader } from "./login-header"

export function LoginCard() {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <Card className="w-full shadow-lg border-border/60 overflow-hidden">
        <CardHeader className="pb-2">
          <LoginHeader />
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <LoginFooter />
    </div>
  )
}
