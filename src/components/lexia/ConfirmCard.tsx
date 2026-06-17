"use client"

// Confirmation card for a proposed mutation. Shows the PT-BR summary and a
// compact payload preview; Confirmar/Recusar resolve the action and continue the
// conversation. Buttons disappear once the action is resolved.
import { Icon } from "@/components/crm/crm-icons"
import type { ChatBlock } from "./types"

type ConfirmBlock = Extract<ChatBlock, { type: "confirm" }>

const HIDE_KEYS = new Set(["requestId"])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
// Esconde campos "de banco" (ids) do fallback — o advogado não deve ver "#42".
const isIdKey = (k: string) => /id$/i.test(k)
const fmtData = (s: string): string => {
  const [y, m, d] = s.split("-")
  return `${d}/${m}/${y}`
}

function fmtValor(key: string, v: unknown): string {
  if (v == null || v === "") return "—"
  if (/cents$/i.test(key) && typeof v === "number") {
    return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }
  if (typeof v === "string" && ISO_DATE.test(v)) return fmtData(v)
  if (typeof v === "boolean") return v ? "sim" : "não"
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" && ISO_DATE.test(x) ? fmtData(x) : String(x))).join(", ")
  return String(v)
}

// Fallback quando a ferramenta não forneceu `detalhes` legíveis: mostra o payload
// sem os campos de id e com datas em pt-BR.
function previewRows(payload: unknown): [string, string][] {
  if (!payload || typeof payload !== "object") return []
  return Object.entries(payload as Record<string, unknown>)
    .filter(([k, v]) => !HIDE_KEYS.has(k) && !isIdKey(k) && v != null && v !== "")
    .slice(0, 8)
    .map(([k, v]) => [k, fmtValor(k, v)])
}

export function ConfirmCard({
  block,
  onDecide,
  busy,
}: {
  block: ConfirmBlock
  onDecide: (acaoId: number, decisao: "confirmar" | "recusar") => void
  busy: boolean
}) {
  const pendente = block.status === "pendente"
  // Preferir os detalhes legíveis (nomes resolvidos, datas/$ pt-BR) que a
  // ferramenta montou; só cair no payload cru (limpo) quando não houver.
  const rows: [string, string][] =
    block.detalhes && block.detalhes.length > 0
      ? block.detalhes.map((d) => [d.label, d.valor] as [string, string])
      : previewRows(block.payload)
  const statusLabel =
    block.status === "confirmada" ? "Confirmada" : block.status === "recusada" ? "Recusada" : block.status === "expirada" ? "Expirada" : ""

  return (
    <div
      style={{
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        background: "var(--surface)",
        padding: 13,
        margin: "4px 0",
        alignSelf: "stretch",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: rows.length ? 9 : 0 }}>
        <span style={{ color: "var(--accent)", display: "inline-flex" }}>
          <Icon name="sparkles" size={15} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{block.resumo}</span>
      </div>

      {rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 12px", fontSize: 12, marginBottom: pendente ? 12 : 0 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <span style={{ color: "var(--text-subtle)" }}>{k}</span>
              <span style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {pendente ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => onDecide(block.acaoId, "confirmar")}
            disabled={busy}
            className="btn"
            style={{
              flex: 1,
              height: 34,
              borderRadius: 8,
              border: "none",
              background: "var(--brand-gold)",
              color: "#020D25",
              fontWeight: 500,
              fontSize: 14,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Confirmar
          </button>
          <button
            onClick={() => onDecide(block.acaoId, "recusar")}
            disabled={busy}
            className="btn btn-secondary"
            style={{ flex: 1, height: 34, borderRadius: 8, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
          >
            Recusar
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 8 }}>{statusLabel}</div>
      )}
    </div>
  )
}
