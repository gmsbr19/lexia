"use client"

import { memo, useEffect, useRef, useState } from "react"
import { AlertTriangle, ArrowRight, Braces, Check, Edit3, FileCheck, Sparkles, X, Zap } from "lucide-react"
import { apiSend } from "@/lib/client/api"
import type { CampoDetectado } from "@/lib/documents/model/campos"
import type { DocOp } from "@/lib/documents/model/ops"
import { tokens } from "@/styles/tokens.css"
import { typingDot } from "./doc-chat.css"

// ── tiny LexIA orb (gold gradient, self-contained) ──────────────────────────────
function LexOrb({ size = 26 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(120% 120% at 30% 25%, #F1DDA6 0%, #C0A147 45%, #9A7F2E 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
      }}
    >
      <Sparkles size={Math.round(size * 0.5)} color="#020D25" strokeWidth={2} />
    </span>
  )
}

type Msg =
  | { role: "user"; text: string }
  | { role: "ai"; kind: "thinking" }
  | { role: "ai"; kind: "error"; text: string }
  | { role: "ai"; kind: "text"; text: string }
  | { role: "ai"; kind: "detect"; sugs: CampoDetectado[] }
  | { role: "ai"; kind: "ops"; text: string; ops: DocOp[] }

function opLabel(op: DocOp): string {
  if (op.tipo === "preencher_campo") return `Preencher “${op.name}” com “${op.valor ?? ""}”.`
  if (op.tipo === "substituir_texto") return `Trocar “${op.de}” por “${op.para ?? ""}”.`
  return `Inserir parágrafo: “${op.texto ?? ""}”.`
}
const OP_LABEL: Record<DocOp["tipo"], string> = {
  preencher_campo: "Preencher campo",
  substituir_texto: "Substituir texto",
  inserir_paragrafo: "Inserir parágrafo",
}

const QUICK = [
  { id: "detect", icon: Braces, label: "Detectar campos no documento" },
  { id: "fill", icon: Sparkles, label: "Preencher e revisar os campos" },
  { id: "review", icon: FileCheck, label: "Revisar cláusulas e linguagem" },
]

// The document text / fields / values are read LAZILY via getContext() at send time
// (they're only needed for the API calls, never in render), so a keystroke in the
// editor doesn't change any prop here → the memoized chat doesn't re-render while typing.
export interface DocChatContext {
  texto: string
  campos: { name: string; label: string }[]
  valores: Record<string, string>
}

function DocLexiaChatImpl({
  getContext,
  opus,
  setOpus,
  onApplyCampos,
  onApplyOps,
  onClose,
}: {
  getContext: () => DocChatContext
  opus: boolean
  setOpus: (v: boolean) => void
  onApplyCampos: (campos: CampoDetectado[]) => void
  onApplyOps: (ops: DocOp[]) => void
  onClose: () => void
}) {
  const [thread, setThread] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [applied, setApplied] = useState<Record<string, boolean>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const empty = thread.length === 0

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [thread])

  const runDetect = async () => {
    if (busy) return
    setBusy(true)
    setThread((p) => [...p, { role: "user", text: "Detectar campos no documento" }, { role: "ai", kind: "thinking" }])
    try {
      const r = await apiSend<{ campos: CampoDetectado[] }>("/api/documentos/detectar-campos", "POST", { texto: getContext().texto, opus })
      setThread((p) => {
        const base = p.filter((m) => !(m.role === "ai" && m.kind === "thinking"))
        if (!r.campos.length) return [...base, { role: "ai", kind: "text", text: "Não encontrei novos trechos para transformar em campo." }]
        return [...base, { role: "ai", kind: "detect", sugs: r.campos }]
      })
    } catch (e) {
      setThread((p) => [...p.filter((m) => !(m.role === "ai" && m.kind === "thinking")), { role: "ai", kind: "error", text: e instanceof Error ? e.message : "Falha ao detectar campos." }])
    } finally {
      setBusy(false)
    }
  }

  const send = async (txt?: string) => {
    const t = (txt ?? input).trim()
    if (!t || busy) return
    if (/detect|campo/i.test(t)) {
      setInput("")
      void runDetect()
      return
    }
    setInput("")
    setThread((p) => [...p, { role: "user", text: t }, { role: "ai", kind: "thinking" }])
    setBusy(true)
    try {
      const ctx = getContext()
      const r = await apiSend<{ ops: DocOp[] }>("/api/documentos/editar-ia", "POST", {
        instrucao: t,
        texto: ctx.texto,
        campos: ctx.campos,
        valores: ctx.valores,
        opus,
      })
      setThread((p) => {
        const base = p.filter((m) => !(m.role === "ai" && m.kind === "thinking"))
        if (!r.ops.length) return [...base, { role: "ai", kind: "text", text: "A LexIA não propôs alterações." }]
        return [...base, { role: "ai", kind: "ops", text: "Preparei as alterações abaixo. Revise e aplique as que fizerem sentido:", ops: r.ops }]
      })
    } catch (e) {
      setThread((p) => [...p.filter((m) => !(m.role === "ai" && m.kind === "thinking")), { role: "ai", kind: "error", text: e instanceof Error ? e.message : "Falha ao editar com a LexIA." }])
    } finally {
      setBusy(false)
    }
  }

  const applySug = (c: CampoDetectado, key: string) => {
    if (applied[key]) return
    onApplyCampos([c])
    setApplied((a) => ({ ...a, [key]: true }))
  }
  const applyAllSugs = (sugs: CampoDetectado[], base: string) => {
    onApplyCampos(sugs)
    setApplied((a) => {
      const n = { ...a }
      sugs.forEach((_, i) => (n[`${base}-${i}`] = true))
      return n
    })
  }
  const applyOp = (op: DocOp, key: string) => {
    if (applied[key]) return
    onApplyOps([op])
    setApplied((a) => ({ ...a, [key]: true }))
  }

  const quick = (id: string) => {
    if (id === "detect") void runDetect()
    else if (id === "fill") void send("Preencha e padronize os campos do documento com base no conteúdo")
    else void send("Revise as cláusulas e a linguagem deste documento e sugira melhorias")
  }

  const canSend = input.trim().length > 0 && !busy

  return (
    <aside
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        bottom: 16,
        width: 388,
        zIndex: 50,
        borderRadius: 16,
        background: "var(--lex-acrylic-strong)",
        backdropFilter: "var(--lex-blur)",
        WebkitBackdropFilter: "var(--lex-blur)",
        border: "1px solid var(--lex-acrylic-border)",
        boxShadow: "0 28px 80px rgba(2,13,37,0.5), 0 6px 22px rgba(2,13,37,0.3)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px 11px 14px", borderBottom: `1px solid ${tokens.color.border}`, flexShrink: 0 }}>
        <LexOrb size={26} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.01em" }}>LexIA</div>
          <div style={{ fontSize: 11, color: tokens.color.textSubtle, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: tokens.color.ok }} />
            Editando este documento
          </div>
        </div>
        <button
          onClick={() => {
            setThread([])
            setInput("")
            setApplied({})
          }}
          title="Novo chat"
          style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: tokens.color.textMuted, cursor: "pointer", display: "grid", placeItems: "center" }}
        >
          <Edit3 size={16} />
        </button>
        <button onClick={onClose} title="Fechar" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: tokens.color.textMuted, cursor: "pointer", display: "grid", placeItems: "center" }}>
          <X size={17} />
        </button>
      </div>

      {/* thread / welcome */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
        {empty ? (
          <div>
            <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 14px" }}>
              <LexOrb size={44} />
            </div>
            <h2 style={{ margin: 0, textAlign: "center", fontSize: 18, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.02em" }}>Vamos editar este documento</h2>
            <p style={{ margin: "7px 0 18px", textAlign: "center", fontSize: 12.5, color: tokens.color.textMuted, lineHeight: 1.5 }}>
              Detecto campos, preencho valores e ajusto cláusulas — tudo direto no papel.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {QUICK.map((q) => {
                const Ic = q.icon
                return (
                  <button
                    key={q.id}
                    onClick={() => quick(q.id)}
                    disabled={busy}
                    style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", padding: "11px 12px", borderRadius: 11, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface, cursor: "pointer", fontFamily: tokens.font.sans }}
                  >
                    <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", background: tokens.color.accentSoft, color: tokens.color.accent }}>
                      <Ic size={15} />
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: tokens.color.text, letterSpacing: "-0.01em" }}>{q.label}</span>
                    <ArrowRight size={14} color="var(--text-subtle)" />
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {thread.map((m, i) => (
              <ChatMsg
                key={i}
                m={m}
                idx={i}
                applied={applied}
                onApplySug={applySug}
                onApplyAll={applyAllSugs}
                onApplyOp={applyOp}
              />
            ))}
          </div>
        )}
      </div>

      {/* composer */}
      <div style={{ flexShrink: 0, padding: "10px 12px 12px" }}>
        <div style={{ border: `1px solid ${tokens.color.border}`, borderRadius: 14, background: tokens.color.surface, padding: "8px 10px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder="Ex.: troque o foro para Campinas; preencha o contratante como João Silva"
            style={{ width: "100%", border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: tokens.font.sans, fontSize: 13, lineHeight: 1.5, color: tokens.color.text, minHeight: 38, maxHeight: 120 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <button
              onClick={() => void runDetect()}
              disabled={busy}
              title="Detectar campos"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 9px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontFamily: tokens.font.sans, fontSize: 12, fontWeight: 500, color: tokens.color.accent }}
            >
              <Braces size={15} /> Detectar campos
            </button>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setOpus(!opus)}
                title="Modelo Opus — usa mais créditos"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 30,
                  padding: "0 9px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: tokens.font.sans,
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${opus ? tokens.color.borderGold : tokens.color.border}`,
                  background: opus ? tokens.color.accentSoft : "transparent",
                  color: opus ? tokens.color.accent : tokens.color.textMuted,
                }}
              >
                <Zap size={13} /> Opus
              </button>
              <button
                onClick={() => void send()}
                disabled={!canSend}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: "none",
                  display: "grid",
                  placeItems: "center",
                  background: canSend ? tokens.brand.gold : tokens.color.bgSunken,
                  color: canSend ? "#020D25" : tokens.color.textSubtle,
                  cursor: canSend ? "pointer" : "default",
                }}
              >
                <ArrowRight size={16} strokeWidth={2.2} style={{ transform: "rotate(-90deg)" }} />
              </button>
            </div>
          </div>
        </div>
        {opus && <div style={{ fontSize: 11, color: tokens.color.textSubtle, textAlign: "center", marginTop: 7 }}>Opus ligado · respostas mais fortes, consomem mais créditos</div>}
      </div>
    </aside>
  )
}

// Memoized so a keystroke in the editor (which re-renders the page) doesn't re-render
// the chat. With getContext()/callbacks kept stable by the page, NONE of these props
// change while typing body text, so the chat skips re-render entirely.
export const DocLexiaChat = memo(DocLexiaChatImpl)

// ── one thread message ──────────────────────────────────────────────────────────
function ChatMsg({
  m,
  idx,
  applied,
  onApplySug,
  onApplyAll,
  onApplyOp,
}: {
  m: Msg
  idx: number
  applied: Record<string, boolean>
  onApplySug: (c: CampoDetectado, key: string) => void
  onApplyAll: (sugs: CampoDetectado[], base: string) => void
  onApplyOp: (op: DocOp, key: string) => void
}) {
  if (m.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ maxWidth: "86%", padding: "9px 13px", borderRadius: 14, borderTopRightRadius: 5, background: tokens.brand.navy, color: "#F5F1E4", fontSize: 13.5, lineHeight: 1.5, letterSpacing: "-0.01em", border: `1px solid ${tokens.color.border}` }}>
          {m.text}
        </div>
      </div>
    )
  }

  const wrap = (children: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <LexOrb size={26} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9, paddingTop: 1 }}>{children}</div>
    </div>
  )

  if (m.kind === "thinking") {
    return wrap(
      <div style={{ display: "flex", gap: 4, padding: "10px 13px", borderRadius: 13, background: tokens.color.bgSunken, width: "fit-content" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={typingDot} style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </div>,
    )
  }
  if (m.kind === "error") {
    return wrap(
      <div style={{ display: "flex", gap: 9, padding: "10px 12px", borderRadius: 12, background: tokens.color.critSoft }}>
        <AlertTriangle size={16} style={{ color: "var(--crit)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: tokens.color.text, lineHeight: 1.5 }}>{m.text}</div>
      </div>,
    )
  }
  if (m.kind === "text") {
    return wrap(<div style={{ fontSize: 13.5, color: tokens.color.text, lineHeight: 1.55 }}>{m.text}</div>)
  }
  if (m.kind === "detect") {
    const base = `d${idx}`
    const allApplied = m.sugs.every((_, i) => applied[`${base}-${i}`])
    return wrap(
      <>
        <div style={{ fontSize: 13.5, color: tokens.color.text, lineHeight: 1.55 }}>
          Encontrei <strong>{m.sugs.length}</strong> {m.sugs.length === 1 ? "trecho" : "trechos"} que pode{m.sugs.length === 1 ? "" : "m"} virar campo:
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {m.sugs.map((s, i) => {
            const key = `${base}-${i}`
            const on = !!applied[key]
            return (
              <div key={key} style={{ borderRadius: 12, border: `1px solid ${on ? tokens.color.okSoft : tokens.color.border}`, background: tokens.color.surface, overflow: "hidden", opacity: on ? 0.62 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px" }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: on ? tokens.color.okSoft : tokens.color.accentSoft, color: on ? tokens.color.ok : tokens.color.accent }}>
                    {on ? <Check size={13} /> : <Braces size={13} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.01em" }}>{s.label || s.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: tokens.color.textSubtle, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.exactText}</span>
                  </span>
                  {on ? (
                    <span style={{ fontSize: 11.5, color: tokens.color.ok, fontWeight: 500, flexShrink: 0 }}>Aplicado</span>
                  ) : (
                    <button onClick={() => onApplySug(s, key)} style={chipBtn}>Aplicar</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {!allApplied && (
          <button onClick={() => onApplyAll(m.sugs, base)} style={{ ...chipBtn, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} /> Aplicar todos
          </button>
        )}
      </>,
    )
  }
  // ops
  const base = `o${idx}`
  return wrap(
    <>
      <div style={{ fontSize: 13.5, color: tokens.color.text, lineHeight: 1.55 }}>{m.text}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {m.ops.map((op, i) => {
          const key = `${base}-${i}`
          const on = !!applied[key]
          return (
            <div key={key} style={{ borderRadius: 12, border: `1px solid ${on ? tokens.color.okSoft : tokens.color.border}`, background: tokens.color.surface, overflow: "hidden", opacity: on ? 0.62 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px" }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: on ? tokens.color.okSoft : tokens.color.accentSoft, color: on ? tokens.color.ok : tokens.color.accent }}>
                  {on ? <Check size={13} /> : <Edit3 size={13} />}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 500, color: tokens.color.textSubtle, textTransform: "uppercase", letterSpacing: "0.06em" }}>{OP_LABEL[op.tipo]}</span>
                {on ? <span style={{ fontSize: 11.5, color: tokens.color.ok, fontWeight: 500, flexShrink: 0 }}>Aplicado</span> : <button onClick={() => onApplyOp(op, key)} style={chipBtn}>Aplicar</button>}
              </div>
              <div style={{ padding: "0 11px 10px", fontSize: 12.5, color: tokens.color.text, lineHeight: 1.5, letterSpacing: "-0.01em" }}>{opLabel(op)}</div>
            </div>
          )
        })}
      </div>
    </>,
  )
}

const chipBtn: React.CSSProperties = {
  height: 28,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${tokens.color.borderStrong}`,
  background: "transparent",
  color: tokens.color.text,
  fontSize: 12,
  fontWeight: 500,
  fontFamily: tokens.font.sans,
  cursor: "pointer",
  flexShrink: 0,
}
