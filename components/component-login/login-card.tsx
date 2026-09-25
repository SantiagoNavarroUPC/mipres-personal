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
    <div className="relative flex flex-col items-center gap-6 w-full max-w-md mx-auto animate-in fade-in-50 zoom-in-95 duration-500">
      {/* Outer ambient glow */}
      <div
        className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-primary/25 via-teal-500/10 to-transparent blur-xl opacity-70 pointer-events-none -z-10"
        aria-hidden="true"
      />

      <Card className="relative w-full border border-border/80 dark:border-border/60 bg-card/85 dark:bg-card/75 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(15,118,110,0.15)] dark:shadow-[0_25px_65px_-15px_rgba(0,0,0,0.7)] rounded-2xl overflow-hidden">
        {/* Subtle top edge gradient bar */}
        <div
          className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-90"
          aria-hidden="true"
        />

        <CardHeader className="pb-3 pt-6 px-6 sm:px-8">
          <LoginHeader />
        </CardHeader>
        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
          <LoginForm />
        </CardContent>
      </Card>

      <LoginFooter />
    </div>
  )
}
