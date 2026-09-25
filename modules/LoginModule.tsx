import { LoginCard } from "@/components/component-login/login-card"
import { LoginBackground } from "@/components/component-login/login-background"

export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10 selection:bg-primary/20 selection:text-primary">
      <LoginBackground />
      <section className="relative z-10 w-full max-w-md">
        <LoginCard />
      </section>
    </main>
  )
}
