import { LoginCard } from "@/components/component-login/login-card";


export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-b from-white via-slate-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 dark:hidden">
        <div className="absolute -top-20 -left-24 h-72 w-72 rounded-full bg-white/90 blur-2xl" />
        <div className="absolute top-1/3 -right-28 h-80 w-80 rounded-full bg-white/70 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-slate-100/80 blur-2xl" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.82)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.82)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <section className="relative z-10 w-full max-w-md">
        <LoginCard />
      </section>
    </main>
  )
}
