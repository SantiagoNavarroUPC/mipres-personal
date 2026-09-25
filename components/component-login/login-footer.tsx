export function LoginFooter() {
  return (
    <footer className="flex flex-col items-center gap-1.5 text-center text-xs text-muted-foreground/80">
      <div className="flex items-center gap-2 text-[11px]">
        <span>República de Colombia</span>
        <span>•</span>
        <span>MinSalud</span>
        <span>•</span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border/50">
          Oficial
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        © {new Date().getFullYear()} MIPRES. Todos los derechos reservados.
      </p>
    </footer>
  )
}
