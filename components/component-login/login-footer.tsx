import { IPS_DUSAKAWI } from "@/lib/config/organizacion"

export function LoginFooter() {
  return (
    <footer className="text-center text-xs text-muted-foreground">
      <p>Asociación de Cabildos Indígenas del Cesar y La Guajira</p>
      <p className="mt-1">
        {"© "}{new Date().getFullYear()} {IPS_DUSAKAWI.nombreIPS} — Todos los derechos reservados
      </p>
    </footer>
  )
}
