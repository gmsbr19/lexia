"use client"

// Route-level error boundary — renders inside the root layout (theme available).
// Never shows stack traces; recovery via reset() or going back to Início.
import { useEffect } from "react"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to the browser console only — the server already logged the real error.
    console.error(error)
  }, [error])

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
      <div style={{ fontSize: 42, lineHeight: 1 }}>⚠️</div>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.02em" }}>
        Algo deu errado
      </h1>
      <p style={{ margin: 0, maxWidth: 420, fontSize: 14, color: tokens.color.textMuted, lineHeight: 1.55 }}>
        Ocorreu um erro inesperado ao carregar esta página. Tente novamente — se persistir, avise o suporte
        {error.digest ? ` informando o código ${error.digest}` : ""}.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button className={btn({ variant: "gold" })} onClick={reset}>
          Tentar novamente
        </button>
        <a className={btn({ variant: "secondary" })} href="/">
          Ir para o Início
        </a>
      </div>
    </div>
  )
}
