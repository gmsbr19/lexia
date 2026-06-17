"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { btn } from "@/styles/components.css"
import { formatBRL } from "@/lib/finance/money"
import type { AcertoSocios } from "@/lib/finance/types"
import * as c from "./contas.css"

const POS = "var(--fin-pos,#2E9E5B)"

function Linha({ k, v }: { k: string; v: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
      <span>{k}</span>
      <span style={{ fontFamily: "var(--font-mono)" }}>{formatBRL(v)}</span>
    </div>
  )
}

export function AcertoSociosPanel({ acerto }: { acerto: AcertoSocios }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function registrar() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/financeiro/acerto-socios", { method: "POST" })
      const data = await res.json().catch(() => ({}) as Record<string, unknown>)
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? "Falha ao registrar acerto")
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={c.panel}>
      <div className={c.panelHeader}>
        <div>
          <div className={c.panelTitle}>Acerto entre sócios</div>
          <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>
            Honorários pelo rateio dos casos + despesas 50/50, comparados ao que cada conta de sócio recebeu/pagou (descontadas as transferências).
          </div>
        </div>
      </div>

      {error && <div className={c.errorBar}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        {acerto.socios.map((s) => (
          <div key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>{s.nome}</div>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 3 }}>Honorários</div>
            <Linha k="Direito" v={s.direitoCents} />
            <Linha k="Recebido" v={s.recebidoCents} />
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", margin: "8px 0 3px" }}>Despesas (50%)</div>
            <Linha k="Cota" v={s.cotaSaidaCents} />
            <Linha k="Pagou" v={s.pagoSaidaCents} />
          </div>
        ))}
      </div>

      {acerto.quitado ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "rgba(46,158,91,0.1)", borderRadius: 10, fontSize: 13, fontWeight: 500, color: POS }}>
          Tudo acertado entre os sócios ✓
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", background: "var(--accent-soft)", borderRadius: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
              {acerto.devedorNome} deve {formatBRL(acerto.valorCents)} a {acerto.credorNome}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Desbalanço bruto {formatBRL(acerto.brutoCents)}
              {acerto.transferidoCents > 0 ? ` · já acertado ${formatBRL(acerto.transferidoCents)}` : ""}
            </div>
          </div>
          <button type="button" className={btn({ variant: "gold" })} style={{ height: 34 }} disabled={busy} onClick={registrar}>
            {busy ? "Registrando…" : "Registrar acerto"}
          </button>
        </div>
      )}
    </div>
  )
}
