"use client"

// Last-resort boundary: replaces the ROOT layout when even it fails, so it must
// render its own <html>/<body> and cannot rely on the theme CSS having loaded —
// colors are the literal brand values (navy #020D25 / gold #C0A147).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
        <p style={{ margin: 0, maxWidth: 420, fontSize: 14, color: "rgba(2, 13, 37, 0.62)", lineHeight: 1.55 }}>
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
      </body>
    </html>
  )
}
