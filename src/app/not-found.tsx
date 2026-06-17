import Link from "next/link"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 24,
        textAlign: "center",
        background: tokens.color.bg,
      }}
    >
      <div style={{ fontSize: 38, fontWeight: 500, color: tokens.brand.gold, letterSpacing: "-0.03em" }}>404</div>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.02em" }}>
        Página não encontrada
      </h1>
      <p style={{ margin: 0, maxWidth: 420, fontSize: 14, color: tokens.color.textMuted, lineHeight: 1.55 }}>
        O endereço pode ter mudado ou nunca existiu. Volte ao Início para continuar.
      </p>
      <Link className={btn({ variant: "gold" })} href="/" style={{ marginTop: 6 }}>
        Ir para o Início
      </Link>
    </div>
  )
}
