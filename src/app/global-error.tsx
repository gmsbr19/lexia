"use client"

// Last-resort boundary: replaces the ROOT layout when even it fails, so it must
// render its own <html>/<body> and cannot rely on the theme CSS having loaded —
// colors are the literal brand values (navy #020D25 / gold #C0A147). Shows the
// actual error message + stack (collapsed, copyable) — see error.tsx for why.
import { useState } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [copied, setCopied] = useState(false)

  const detalhes = [
    error?.digest ? `Código: ${error.digest}` : null,
    `Mensagem: ${error?.message || "(sem mensagem)"}`,
    error?.stack ? `\nStack:\n${error.stack}` : null,
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
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          textAlign: "center",
          background: "#FAFAF7",
          color: "#020D25",
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 42, lineHeight: 1 }}>⚠️</div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em" }}>Algo deu errado</h1>
        <p style={{ margin: 0, maxWidth: 480, fontSize: 14, color: "rgba(2, 13, 37, 0.62)", lineHeight: 1.55 }}>
          Ocorreu um erro inesperado. Tente novamente — se persistir, avise o suporte
          {error?.digest ? ` informando o código ${error.digest}` : ""}.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 6,
            height: 38,
            padding: "0 18px",
            borderRadius: 8,
            border: "none",
            background: "#C0A147",
            color: "#020D25",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>

        <details style={{ marginTop: 18, maxWidth: 640, width: "100%", textAlign: "left" }}>
          <summary style={{ cursor: "pointer", fontSize: 12.5, color: "rgba(2, 13, 37, 0.5)", userSelect: "none" }}>
            Detalhes técnicos
          </summary>
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(2, 13, 37, 0.12)",
              background: "rgba(2, 13, 37, 0.03)",
            }}
          >
            <pre
              style={{
                margin: 0,
                maxHeight: 260,
                overflow: "auto",
                fontSize: 11.5,
                lineHeight: 1.5,
                fontFamily: "ui-monospace, monospace",
                color: "rgba(2, 13, 37, 0.72)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {detalhes}
            </pre>
            <button
              onClick={copiar}
              style={{
                marginTop: 8,
                height: 30,
                padding: "0 12px",
                borderRadius: 6,
                border: "1px solid rgba(2, 13, 37, 0.16)",
                background: "transparent",
                color: "#020D25",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {copied ? "Copiado!" : "Copiar detalhes"}
            </button>
          </div>
        </details>
      </body>
    </html>
  )
}
