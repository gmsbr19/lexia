"use client"

// Confirmation card for a proposed mutation (handoff "MutationCard", Fase 3).
// Shows the PT-BR summary and a 2-column field grid (CcGrid/CcField); edits
// show a before→after diff (old value struck through → new). Confirmar/Recusar
// resolve the action; once resolved, shows a status line instead of the buttons.
import { Icon } from "@/components/crm/crm-icons"
import { CC_TONE, CcField, CcGrid, type CcTone } from "./cc/CcKit"
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

interface Row {
  label: string
  valor: string
  valorAntigo?: string
}

// Fallback quando a ferramenta não forneceu `detalhes` legíveis: mostra o payload
// sem os campos de id e com datas em pt-BR.
function previewRows(payload: unknown): Row[] {
  if (!payload || typeof payload !== "object") return []
  return Object.entries(payload as Record<string, unknown>)
    .filter(([k, v]) => !HIDE_KEYS.has(k) && !isIdKey(k) && v != null && v !== "")
    .slice(0, 8)
    .map(([k, v]) => ({ label: k, valor: fmtValor(k, v) }))
}

const STATUS_META: Record<"confirmada" | "recusada" | "expirada", { icon: string; label: string; tone: CcTone }> = {
  confirmada: { icon: "checkCircle", label: "Confirmada", tone: "ok" },
  recusada: { icon: "x", label: "Recusada", tone: "crit" },
  expirada: { icon: "clock", label: "Expirada", tone: "neutral" },
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
  // Preferir os detalhes legíveis (nomes resolvidos, datas/$ pt-BR, e o diff
  // antes→depois quando a ferramenta o montou) que só cai no payload cru
  // quando não houver.
  const rows: Row[] =
    block.detalhes && block.detalhes.length > 0
      ? block.detalhes.map((d) => ({ label: d.label, valor: d.valor, valorAntigo: d.valorAntigo }))
      : previewRows(block.payload)
  const status = block.status !== "pendente" ? STATUS_META[block.status] : null

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
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: rows.length ? 12 : 0 }}>
        <Icon name="sparkles" size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{block.resumo}</span>
      </div>

      {rows.length > 0 && (
        <div style={{ paddingBottom: pendente ? 13 : 0, marginBottom: pendente ? 13 : 0, borderBottom: pendente ? "1px solid var(--border)" : "none" }}>
          <CcGrid>
            {rows.map((r) => (
              <CcField key={r.label} label={r.label}>
                {r.valorAntigo != null ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-subtle)", textDecoration: "line-through" }}>{r.valorAntigo}</span>
                    <Icon name="arrowRight" size={11} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
                    <span style={{ color: "var(--text)" }}>{r.valor}</span>
                  </span>
                ) : (
                  r.valor
                )}
              </CcField>
            ))}
          </CcGrid>
        </div>
      )}

      {pendente ? (
        <div style={{ display: "flex", gap: 8 }}>
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
        status && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: CC_TONE[status.tone].fg }}>
            <Icon name={status.icon} size={16} strokeWidth={2.2} />
            {status.label}
          </div>
        )
      )}
    </div>
  )
}
