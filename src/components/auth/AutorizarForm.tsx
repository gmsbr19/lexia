"use client"

// Botões da tela de consentimento OAuth. O servidor é que emite o código (a
// página só repassa os parâmetros que validou); aqui a gente apenas chama a
// rota e segue o redirect que ela devolve.
//
// "Cancelar" volta ao aplicativo com `error=access_denied`, como o OAuth manda —
// é isso que faz o claude.ai mostrar "autorização recusada" em vez de ficar
// esperando para sempre.
import { useState } from "react"
import { btn } from "@/styles/components.css"
import * as css from "./login.css"

export interface PedidoAutorizacao {
  client_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: "S256"
  state?: string
  scope?: string
  resource?: string
}

export function AutorizarForm({
  pedido,
  nomeApp,
  cancelarUrl,
}: {
  pedido: PedidoAutorizacao
  nomeApp: string
  cancelarUrl: string
}) {
  const [erro, setErro] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function autorizar() {
    if (busy) return
    setErro(null)
    setBusy(true)
    try {
      const res = await fetch("/api/oauth/autorizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: { redirect?: string }; error?: string }
      if (!res.ok || !data.result?.redirect) {
        setErro(data.error ?? "Não foi possível concluir a autorização.")
        setBusy(false)
        return
      }
      window.location.href = data.result.redirect
    } catch {
      setErro("Sem conexão — tente novamente.")
      setBusy(false)
    }
  }

  return (
    <>
      {erro ? <div className={css.errorBox}>{erro}</div> : null}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button type="button" className={btn({ variant: "primary" })} onClick={autorizar} disabled={busy} style={{ flex: 1 }}>
          {busy ? "Autorizando…" : `Autorizar ${nomeApp}`}
        </button>
        <a className={btn({ variant: "ghost" })} href={cancelarUrl} aria-disabled={busy}>
          Cancelar
        </a>
      </div>
    </>
  )
}
