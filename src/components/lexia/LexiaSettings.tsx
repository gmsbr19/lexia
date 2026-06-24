"use client"

// LexIA · Configurações & Personalização — menu de ajustes do composer (modo
// agente/pergunta/planejamento + acesso à web + modo automático + fontes) e modal
// de personalização (personas + documento de instruções editável). Ligados às
// preferências persistidas (User.lexiaPrefs).
import { useState } from "react"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { Sparkle, MenuPanel } from "./LexiaKit"
import type { LexiaAgentMode, LexiaInstrucoes, LexiaPersona } from "@/lib/lexia/preferencias-core"

const AGENT_MODES: { id: LexiaAgentMode; label: string; desc: string }[] = [
  { id: "agente", label: "Agente", desc: "Busca, edita e executa ações no escritório." },
  { id: "pergunta", label: "Pergunta", desc: "Apenas responde e consulta — não altera dados." },
  { id: "plano", label: "Planejamento", desc: "Monta um plano e executa após sua aprovação." },
]

const PERSONAS: { id: LexiaPersona; icon: CrmIconName; name: string; desc: string }[] = [
  { id: "custom", icon: "user", name: "Crie do seu jeito", desc: "Defina seu próprio estilo" },
  { id: "senior", icon: "scale", name: "Advogado sênior", desc: "Técnico e formal" },
  { id: "cordial", icon: "sun", name: "Cordial", desc: "Caloroso e próximo" },
  { id: "analista", icon: "pieChart", name: "Analista", desc: "Estruturado e baseado em dados" },
]

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={"lx-toggle" + (on ? " on" : "")}>
      <i />
    </span>
  )
}

/* ── Menu de configurações (popover acima do botão de ajustes do composer) ── */
export function LexiaSettingsMenu({
  agentMode,
  setAgentMode,
  webAccess,
  setWebAccess,
  autoMode,
  setAutoMode,
  onPersonalize,
  onClose,
}: {
  agentMode: LexiaAgentMode
  setAgentMode: (m: LexiaAgentMode) => void
  webAccess: boolean
  setWebAccess: (v: boolean) => void
  autoMode: boolean
  setAutoMode: (v: boolean) => void
  onPersonalize: () => void
  onClose: () => void
}) {
  const active = AGENT_MODES.find((m) => m.id === agentMode) ?? AGENT_MODES[0]
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", padding: "9px 8px", border: "none", background: "transparent", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-sans)", color: "var(--text-muted)" }
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
      <MenuPanel style={{ position: "absolute", bottom: 40, left: 0, width: 312, zIndex: 2, padding: 8, transformOrigin: "bottom left" }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "6px 8px 4px" }}>Modo da LexIA</div>
        <div className="lx-seg" style={{ margin: "2px 6px 6px" }}>
          {AGENT_MODES.map((m) => (
            <button key={m.id} className={"lx-seg-btn" + (m.id === agentMode ? " on" : "")} onClick={() => setAgentMode(m.id)}>{m.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-subtle)", lineHeight: 1.45, padding: "0 8px 6px" }}>{active.desc}</div>

        <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />

        <button className="fx-menu-item" style={rowStyle} onClick={() => setWebAccess(!webAccess)}>
          <Icon name="globe" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>Acesso à web</span>
            <span style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 1 }}>Consultar leis e jurisprudência online</span>
          </span>
          <Toggle on={webAccess} />
        </button>
        <button className="fx-menu-item" style={rowStyle} onClick={() => setAutoMode(!autoMode)}>
          <Icon name="zap" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>Modo automático</span>
            <span style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 1 }}>{autoMode ? "Implementa as alterações sem confirmar" : "Pede sua confirmação antes de alterar"}</span>
          </span>
          <Toggle on={autoMode} />
        </button>
        <div style={{ ...rowStyle, cursor: "default" }}>
          <Icon name="link2" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>Fontes da LexIA</span>
            <span style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 1 }}>Clientes · Processos · Jurisprudência</span>
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>3</span>
          <Icon name="chevronRight" size={15} style={{ color: "var(--text-subtle)" }} />
        </div>

        <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />

        <button className="fx-menu-item" style={rowStyle} onClick={onPersonalize}>
          <Sparkle size={16} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--accent)" }}>Personalizar a LexIA</span>
          </span>
          <Icon name="chevronRight" size={15} style={{ color: "var(--text-subtle)" }} />
        </button>
      </MenuPanel>
    </>
  )
}

/* ── Modal de personalização (acrílico, centralizado) ── */
export function LexiaPersonalizeModal({
  persona,
  setPersona,
  instrucoes,
  setInstrucoes,
  onClose,
  onSave,
}: {
  persona: LexiaPersona
  setPersona: (p: LexiaPersona) => void
  instrucoes: LexiaInstrucoes
  setInstrucoes: (updater: (s: LexiaInstrucoes) => LexiaInstrucoes) => void
  onClose: () => void
  onSave: () => void
}) {
  const [tab, setTab] = useState<"persona" | "instrucoes">("persona")
  const setField = (k: "identidade" | "interacao", v: string) => setInstrucoes((s) => ({ ...s, [k]: v }))
  const setMem = (i: number, v: string) => setInstrucoes((s) => ({ ...s, memorias: s.memorias.map((m, j) => (j === i ? v : m)) }))
  const addMem = () => setInstrucoes((s) => ({ ...s, memorias: [...s.memorias, ""] }))
  const delMem = (i: number) => setInstrucoes((s) => ({ ...s, memorias: s.memorias.filter((_, j) => j !== i) }))

  const taStyle: React.CSSProperties = { width: "100%", resize: "vertical", minHeight: 76, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 12px", fontFamily: "var(--font-sans)", fontSize: 13.5, lineHeight: 1.55, color: "var(--text)", outline: "none" }

  return (
    <div
      className="crm-scope lex-back"
      onMouseDown={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1450, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, background: "var(--overlay)" }}
    >
      <div
        className="crm-pop-in"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 580, maxWidth: "100%", maxHeight: "86%", display: "flex", flexDirection: "column", overflow: "hidden",
          borderRadius: 18, border: "1px solid var(--lex-acrylic-border)",
          background: "var(--lex-acrylic-strong)", backdropFilter: "var(--lex-blur)", WebkitBackdropFilter: "var(--lex-blur)",
          boxShadow: "0 40px 100px rgba(2,13,37,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        {/* cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 16px 18px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.015em" }}>Personalizar a LexIA</div>
            <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 2 }}>Defina o estilo e as instruções da assistente do escritório</div>
          </div>
          <button onClick={onClose} title="Fechar" className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: 8 }}><Icon name="x" size={17} /></button>
        </div>

        {/* abas */}
        <div style={{ display: "flex", gap: 4, padding: "10px 20px 0", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <button className={"lx-modal-tab" + (tab === "persona" ? " on" : "")} onClick={() => setTab("persona")}>Estilo</button>
          <button className={"lx-modal-tab" + (tab === "instrucoes" ? " on" : "")} onClick={() => setTab("instrucoes")}>Instruções</button>
        </div>

        {/* corpo */}
        <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
          {tab === "persona" ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {PERSONAS.map((p) => (
                  <button key={p.id} className={"lx-persona" + (p.id === persona ? " on" : "")} onClick={() => setPersona(p.id)}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-sunken)", color: "var(--accent)", marginBottom: 4 }}><Icon name={p.icon} size={17} /></span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{p.desc}</span>
                    {p.id === persona && (
                      <span style={{ position: "absolute", top: 12, right: 12, width: 20, height: 20, borderRadius: "50%", background: "var(--brand-gold)", color: "#020D25", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={13} strokeWidth={2.6} /></span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                <Icon name="alertCircle" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0, marginTop: 1 }} />
                <span>O estilo afeta o tom das respostas. Para regras detalhadas, edite as <button onClick={() => setTab("instrucoes")} style={{ border: "none", background: "transparent", color: "var(--accent)", font: "inherit", cursor: "pointer", padding: 0, textDecoration: "underline" }}>instruções</button>.</span>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <section>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.015em" }}>Identidade do agente</div>
                <div style={{ fontSize: 12.5, color: "var(--text-subtle)", margin: "3px 0 9px", lineHeight: 1.45 }}>Define quem é a LexIA e como se comporta no escritório.</div>
                <textarea style={taStyle} value={instrucoes.identidade} onChange={(e) => setField("identidade", e.target.value)} rows={4} />
              </section>
              <section>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.015em" }}>Interação de chat</div>
                <div style={{ fontSize: 12.5, color: "var(--text-subtle)", margin: "3px 0 9px", lineHeight: 1.45 }}>O estilo de comunicação usado nas respostas.</div>
                <textarea style={taStyle} value={instrucoes.interacao} onChange={(e) => setField("interacao", e.target.value)} rows={4} />
              </section>
              <section>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.015em" }}>Memórias</div>
                <div style={{ fontSize: 12.5, color: "var(--text-subtle)", margin: "3px 0 9px", lineHeight: 1.45 }}>Preferências registradas conforme surgem na conversa.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {instrucoes.memorias.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-subtle)", flexShrink: 0 }} />
                      <input
                        value={m}
                        placeholder="adicione uma preferência…"
                        onChange={(e) => setMem(i, e.target.value)}
                        style={{ flex: 1, minWidth: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text)", outline: "none" }}
                      />
                      <button onClick={() => delMem(i)} title="Remover" className="btn btn-ghost" style={{ width: 26, height: 26, padding: 0, borderRadius: 6, color: "var(--text-subtle)" }}><Icon name="x" size={12} /></button>
                    </div>
                  ))}
                  <button onClick={addMem} style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 4, border: "none", background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "4px 2px" }}><Icon name="plus" size={14} /> Adicionar preferência</button>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* rodapé */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onSave}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
