"use client"

// Route-level error boundary — renders inside the root layout (theme available).
// Shows the actual error message + stack (collapsed, copyable) so whoever is
// running the app — admin/dev, not necessarily an end client — can diagnose
// without needing shell/log access. Next.js already redacts server-render
// errors down to a generic message + digest in production, so this never
// leaks more than the runtime itself already exposes to the client.
import { useEffect, useState } from "react"
import Link from "next/link"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Log to the browser console too — the server already logged the real error.
    console.error(error)
  }, [error])

  const detalhes = [
    error.digest ? `Código: ${error.digest}` : null,
    `Mensagem: ${error.message || "(sem mensagem)"}`,
    error.stack ? `\nStack:\n${error.stack}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(detalhes)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponível — o texto já está visível para selecionar manualmente */
    }
  }

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
      <p style={{ margin: 0, maxWidth: 480, fontSize: 14, color: tokens.color.textMuted, lineHeight: 1.55 }}>
        Ocorreu um erro inesperado ao carregar esta página. Tente novamente — se persistir, avise o suporte
        {error.digest ? ` informando o código ${error.digest}` : ""}.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button className={btn({ variant: "gold" })} onClick={reset}>
          Tentar novamente
        </button>
        <Link className={btn({ variant: "secondary" })} href="/">
          Ir para o Início
        </Link>
      </div>

      <details style={{ marginTop: 18, maxWidth: 640, width: "100%", textAlign: "left" }}>
        <summary style={{ cursor: "pointer", fontSize: 12.5, color: tokens.color.textSubtle, userSelect: "none" }}>
          Detalhes técnicos
        </summary>
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${tokens.color.border}`,
            background: tokens.color.bgSoft,
          }}
        >
          <pre
            style={{
              margin: 0,
              maxHeight: 260,
              overflow: "auto",
              fontSize: 11.5,
              lineHeight: 1.5,
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              color: tokens.color.textMuted,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {detalhes}
          </pre>
          <button
            className={btn({ variant: "secondary" })}
            onClick={copiar}
            style={{ marginTop: 8, height: 30, fontSize: 12, padding: "0 12px" }}
          >
            {copied ? "Copiado!" : "Copiar detalhes"}
          </button>
        </div>
      </details>
    </div>
  )
}
