"use client"

// LexIA · Chat — card de pergunta de múltipla escolha (handoff, Fase 6 — tool
// perguntar_usuario). Seleção única resolve no clique; seleção múltipla pede
// confirmação (Confirmar/Limpar); "Outro" (se permitido) cai pra texto livre.
// Mesma família visual do ConfirmCard (borda, raio 14, dourado só no ícone —
// nunca preenchendo uma opção não selecionada).
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import type { ChatBlock } from "../types"

type ChoiceBlock = Extract<ChatBlock, { type: "choice" }>

export function ChoiceCard({
  block,
  onResponder,
  busy,
}: {
  block: ChoiceBlock
  onResponder: (acaoId: number, resposta: { selecionadas: string[]; outro?: string }) => void
  busy: boolean
}) {
  const [multiSel, setMultiSel] = useState<Set<string>>(new Set())
  const [outroAberto, setOutroAberto] = useState(false)
  const [outroTexto, setOutroTexto] = useState("")

  const pendente = block.status === "pendente"

  const enviar = (resposta: { selecionadas: string[]; outro?: string }) => {
    if (busy) return
    onResponder(block.acaoId, resposta)
  }

  const clicarOpcao = (opt: string) => {
    if (busy) return
    if (block.multipla) {
      setMultiSel((s) => {
        const n = new Set(s)
        if (n.has(opt)) n.delete(opt)
        else n.add(opt)
        return n
      })
    } else {
      enviar({ selecionadas: [opt] })
    }
  }

  const enviarOutro = () => {
    const t = outroTexto.trim()
    if (!t) return
    enviar({ selecionadas: [], outro: t })
  }

  const respostaLabels = [...(block.resposta?.selecionadas ?? []), ...(block.resposta?.outro ? [block.resposta.outro] : [])]

  return (
    <div style={{ border: "1px solid var(--border-strong)", borderRadius: 14, background: "var(--surface)", padding: 13, margin: "4px 0", alignSelf: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: pendente ? 12 : 0 }}>
        <Icon name="sparkles" size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: pendente ? "var(--text)" : "var(--text-muted)", letterSpacing: "-0.01em" }}>{block.pergunta}</span>
      </div>

      {!pendente ? (
        <div style={{ marginTop: 11, display: "flex", flexDirection: "column", gap: 6 }}>
          {block.status === "expirada" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: "var(--text-subtle)" }}>
              <Icon name="clock" size={15} />
              Expirada
            </div>
          ) : (
            respostaLabels.map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>
                <Icon name="checkCircle" size={15} style={{ color: "var(--ok)", flexShrink: 0 }} />
                {label}
              </div>
            ))
          )}
        </div>
      ) : outroAberto ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            className="input"
            autoFocus
            value={outroTexto}
            onChange={(e) => setOutroTexto(e.target.value)}
            placeholder="Escreva sua resposta…"
            style={{ height: 38, fontSize: 13.5 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") enviarOutro()
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setOutroAberto(false)} style={{ flex: 1, height: 34, fontSize: 12.5 }}>
              Voltar
            </button>
            <button className="btn btn-primary" onClick={enviarOutro} disabled={!outroTexto.trim() || busy} style={{ flex: 1, height: 34, fontSize: 12.5 }}>
              Enviar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {block.opcoes.map((opt) => (
            <div
              key={opt}
              className="cc-optrow"
              role="button"
              tabIndex={busy ? -1 : 0}
              onClick={() => clicarOpcao(opt)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  clicarOpcao(opt)
                }
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 11px",
                borderRadius: 10,
                cursor: busy ? "default" : "pointer",
                border: "1px solid var(--border)",
                background: block.multipla && multiSel.has(opt) ? "var(--accent-soft)" : "transparent",
              }}
            >
              {block.multipla && (
                <span
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 5,
                    flexShrink: 0,
                    marginTop: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1.5px solid ${multiSel.has(opt) ? "var(--accent)" : "var(--border-strong)"}`,
                    background: multiSel.has(opt) ? "var(--accent)" : "transparent",
                  }}
                >
                  {multiSel.has(opt) && <Icon name="check" size={11} strokeWidth={3} style={{ color: "#020D25" }} />}
                </span>
              )}
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{opt}</span>
              {!block.multipla && <Icon name="chevronRight" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0, marginTop: 2 }} />}
            </div>
          ))}
          {block.permitirOutro && (
            <div
              className="cc-optrow"
              role="button"
              tabIndex={busy ? -1 : 0}
              onClick={() => !busy && setOutroAberto(true)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !busy) {
                  e.preventDefault()
                  setOutroAberto(true)
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 10, cursor: busy ? "default" : "pointer", border: "1px dashed var(--border-strong)", color: "var(--text-muted)" }}
            >
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Outro…</span>
            </div>
          )}
          {block.multipla && (
            <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
              <button className="btn btn-ghost" onClick={() => setMultiSel(new Set())} style={{ height: 34, fontSize: 12.5 }}>
                Limpar
              </button>
              <button className="btn btn-primary" disabled={!multiSel.size || busy} onClick={() => enviar({ selecionadas: [...multiSel] })} style={{ flex: 1, height: 34, fontSize: 12.5 }}>
                Confirmar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
