"use client"

// LexIA · Chat IA — janela acrílica flutuante com 3 modos (flutuante / barra
// lateral / tela cheia). Cabeçalho com seletor de chat + menu de layout +
// minimizar "−"; tela de boas-vindas; thread real (useLexiaStream); composer rico
// (chips de contexto, "+", configurações, seletor de modelo, enviar). Sempre
// montado pela shell (o hook preserva a conversa ao minimizar); renderiza null
// quando fechado. Ligado às preferências reais (persona/instruções/modo/modelo).
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { crmDate } from "@/components/crm/crm-fmt"
import { getLexiaPrefs, setLexiaPrefs, lexiaConversa, lexiaConversas } from "@/components/crm/crm-api"
import type { CrmNav, LexiaConversaRow } from "@/components/crm/crm-types"
import { apiSend } from "@/lib/client/api"
import { toast } from "@/lib/client/toast"
import {
  DEFAULT_INSTRUCOES,
  type LexiaAgentMode,
  type LexiaInstrucoes,
  type LexiaModelo,
  type LexiaPersona,
  type LexiaPrefs,
} from "@/lib/lexia/preferencias-core"
import { useLexiaStream } from "./useLexiaStream"
import { LexiaThread } from "./LexiaThread"
import { contextChips } from "./Suggestions"
import { AnexoChips } from "./AnexoChips"
import { arquivosDoClipboard, lerArquivos, type ClientAnexo } from "./anexos"
import { Orb, SparkleChip, AutoTextarea, MenuPanel } from "./LexiaKit"
import { lexGlass } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { LexiaSettingsMenu, LexiaPersonalizeModal } from "./LexiaSettings"
import type { DocPatchPayload } from "./DocPatchCard"
import type { DocSelecao, DocumentoContexto } from "./types"

// Sugestões de boas-vindas no modo embutido (editor de documentos).
const DOC_SUGGESTIONS = ["Detecte os campos deste documento", "Revise as cláusulas e a linguagem", "Deixe o texto mais formal e claro"]

const GOLD = "var(--brand-gold)"
const TOPBAR_H = 56

const MODELS: { id: LexiaModelo; name: string; desc: string }[] = [
  { id: "auto", name: "Automático", desc: "A LexIA escolhe o melhor modelo" },
  { id: "rapido", name: "Rápido", desc: "Respostas ágeis para tarefas simples" },
  { id: "avancado", name: "Avançado", desc: "Raciocínio jurídico aprofundado (Opus, mais créditos)" },
]

const PAGE_CTX: Record<string, { icon: CrmIconName; label: string }> = {
  financeiro: { icon: "wallet", label: "Financeiro" },
  clientes: { icon: "users", label: "Clientes" },
  casos: { icon: "briefcase", label: "Casos" },
  processos: { icon: "briefcase", label: "Processos" },
  contratos: { icon: "receipt", label: "Contratos" },
  agenda: { icon: "calendar", label: "Agenda" },
  tarefas: { icon: "listChecks", label: "Tarefas" },
  comercial: { icon: "pieChart", label: "Comercial" },
  documents: { icon: "fileText", label: "Documentos" },
}

interface Ctx { icon: CrmIconName; label: string }

export interface LexiaChatProps {
  open: boolean
  greetingName: string
  page: string
  clienteId?: number
  nav?: CrmNav
  onNavigate?: (href: string) => void
  mode: "float" | "sidebar" | "full"
  onModeChange: (m: "float" | "sidebar" | "full") => void
  /** texto/conversa a abrir; quando askSeq muda e está aberto, dispara o efeito */
  askText?: string | null
  askConversaId?: number | null
  askSeq: number
  /** altura de uma barra inferior fixa na página — o chat flutuante sobe acima dela */
  bottomInset?: number
  onMinimize: () => void
  /**
   * Modo EMBUTIDO no editor de documentos: mesma superfície (composer/thread/
   * configurações/anexos), porém focada no documento aberto — cabeçalho simplificado,
   * sempre flutuante, sugestões de doc, chip de seleção e fiação de edição (docContext
   * → enviado por turno; onDocAccept → aplica as ops no editor vivo).
   */
  embedded?: boolean
  /** Getter LAZY do contexto do doc (texto/campos/valores/seleção), lido no envio. */
  docContext?: () => DocumentoContexto | null
  /** Aplica as edições propostas (ops/campos) no editor. */
  onDocAccept?: (payload: DocPatchPayload) => void
  /** Seleção atual no editor → vira o chip "Trecho selecionado" no composer. */
  selection?: DocSelecao | null
  onClearSelection?: () => void
}

export function LexiaChat({ open, greetingName, page, clienteId, nav, onNavigate, mode, onModeChange, askText, askConversaId, askSeq, bottomInset = 0, onMinimize, embedded = false, docContext, onDocAccept, selection, onClearSelection }: LexiaChatProps) {
  // "Olhando" = chat aberto; ref p/ o callback de conclusão ler o estado fresco.
  const watchingRef = useRef(open)
  watchingRef.current = open
  const { messages, streaming, conversaId, send, decide, reset, hydrate } = useLexiaStream(null, {
    // Conclusão em segundo plano (bar fechada): avisa via notificação "ia". NÃO avisa
    // se o turno deixou uma confirmação OU edições de documento a aplicar (`docPatch`)
    // — não é "concluído" enquanto o usuário ainda precisa agir.
    onComplete: ({ conversaId: cid, prompt, pendente, docPatch }) => {
      if (pendente || docPatch || watchingRef.current) return
      const resumo = prompt.length > 120 ? `${prompt.slice(0, 117)}…` : prompt
      void apiSend("/api/lexia/notificar-conclusao", "POST", { conversaId: cid, resumo }).catch(() => {})
    },
  })
  const [input, setInput] = useState("")
  const [anexos, setAnexos] = useState<ClientAnexo[]>([])
  const [contexts, setContexts] = useState<Ctx[]>([])
  const [chatTitle, setChatTitle] = useState("Novo chat de IA")
  const [conversas, setConversas] = useState<LexiaConversaRow[]>([])
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)

  // menus
  const [chatMenu, setChatMenu] = useState(false)
  const [layoutMenu, setLayoutMenu] = useState(false)
  const [ctxMenu, setCtxMenu] = useState(false)
  const [modelMenu, setModelMenu] = useState(false)
  const [settingsMenu, setSettingsMenu] = useState(false)
  const [personalizeOpen, setPersonalizeOpen] = useState(false)

  // preferências (carregadas uma vez; persistidas ao mudar)
  const [persona, setPersona] = useState<LexiaPersona>("senior")
  const [instrucoes, setInstrucoes] = useState<LexiaInstrucoes>(DEFAULT_INSTRUCOES)
  const [agentMode, setAgentMode] = useState<LexiaAgentMode>("agente")
  const [webAccess, setWebAccess] = useState(true)
  const [autoMode, setAutoMode] = useState(false)
  const [modelo, setModelo] = useState<LexiaModelo>("auto")
  // Até as prefs do servidor chegarem, NÃO enviamos modelo/modo/auto (o estado
  // ainda é o default) — assim a rota cai no `?? prefs` persistido em vez de
  // sobrescrevê-lo com defaults numa 1ª mensagem disparada cedo (ex.: spotlight).
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // No modo embutido o painel é SEMPRE flutuante (não há barra lateral/tela cheia
  // — elas cobririam o documento que está sendo editado).
  const isFull = !embedded && mode === "full"
  const isSidebar = !embedded && mode === "sidebar"
  const empty = messages.length === 0

  // carrega prefs + conversas ao montar
  useEffect(() => {
    getLexiaPrefs()
      .then((p) => {
        setPersona(p.persona)
        setInstrucoes(p.instrucoes)
        setAgentMode(p.agentMode)
        setWebAccess(p.webAccess)
        setAutoMode(p.autoMode)
        setModelo(p.modelo)
        setPrefsLoaded(true)
      })
      .catch(() => {})
  }, [])
  const carregarConversas = useCallback(() => { lexiaConversas().then(setConversas).catch(() => {}) }, [])

  // chip de contexto inicial = página atual
  useEffect(() => {
    const c = PAGE_CTX[page]
    setContexts(c ? [c] : [])
  }, [page])

  // persiste (fire-and-forget) — usado pelos toggles/seletor (valor novo explícito).
  // Tocar num ajuste torna o valor vivo autoritativo (prefsLoaded).
  const persist = useCallback((patch: Partial<LexiaPrefs>) => {
    setPrefsLoaded(true)
    void setLexiaPrefs({ persona, instrucoes, agentMode, webAccess, autoMode, modelo, ...patch }).catch(() => {})
  }, [persona, instrucoes, agentMode, webAccess, autoMode, modelo])

  const enviar = useCallback(
    (text: string) => {
      const t = text.trim()
      const ax = anexos
      if (!t && ax.length === 0) return
      setInput("")
      setAnexos([])
      // Antes das prefs carregarem, omite as seleções (deixa a rota usar o banco).
      // No editor, anexa SEMPRE o contexto do documento aberto (lido lazy no envio).
      const base = prefsLoaded ? { modelo, agentMode, autoMode } : {}
      const opts = embedded ? { ...base, documento: docContext?.() ?? undefined } : base
      send(t, page, ax.length ? ax : undefined, opts)
    },
    [anexos, send, page, prefsLoaded, modelo, agentMode, autoMode, embedded, docContext],
  )

  // dispara prompt/abertura de conversa quando a shell pede (askSeq muda)
  useEffect(() => {
    if (askSeq === 0 || !open) return
    if (askConversaId) {
      lexiaConversa(askConversaId)
        .then((det) => { hydrate(det.id, det.mensagens); setChatTitle(det.titulo || "Conversa") })
        .catch(() => {})
    } else if (askText) {
      enviar(askText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askSeq])

  // recarrega a lista do dropdown quando há atividade
  useEffect(() => { if (open) carregarConversas() }, [open, carregarConversas])
  useEffect(() => { if (conversaId) carregarConversas() }, [conversaId, messages.length, carregarConversas])

  const novoChat = useCallback(() => {
    reset()
    setInput("")
    setAnexos([])
    setChatTitle("Novo chat de IA")
    setChatMenu(false)
  }, [reset])
  const abrirConversa = useCallback(
    async (r: LexiaConversaRow) => {
      setChatMenu(false)
      try {
        const det = await lexiaConversa(r.id)
        hydrate(det.id, det.mensagens)
        setChatTitle(r.titulo || "Conversa")
      } catch {
        /* ignore */
      }
    },
    [hydrate],
  )

  // anexos: + menu / colar / arrastar
  const adicionarAnexos = useCallback(
    async (files: FileList | File[]) => {
      const { anexos: novos, erros } = await lerArquivos(files, anexos)
      if (novos.length) setAnexos((prev) => [...prev, ...novos])
      erros.forEach((e) => toast(e, { kind: "error" }))
    },
    [anexos],
  )
  useEffect(() => {
    if (!open) return
    const onPaste = (e: ClipboardEvent) => {
      const files = arquivosDoClipboard(e.clipboardData)
      if (!files.length) return
      e.preventDefault()
      void adicionarAnexos(files)
    }
    document.addEventListener("paste", onPaste)
    return () => document.removeEventListener("paste", onPaste)
  }, [open, adicionarAnexos])

  const temArquivos = (e: React.DragEvent) => Array.from(e.dataTransfer.types || []).includes("Files")
  const dragSurface = {
    onDragEnter: (e: React.DragEvent) => { if (!temArquivos(e)) return; e.preventDefault(); dragDepth.current += 1; setDragOver(true) },
    onDragOver: (e: React.DragEvent) => { if (temArquivos(e)) e.preventDefault() },
    onDragLeave: (e: React.DragEvent) => { if (!temArquivos(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false) },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); dragDepth.current = 0; setDragOver(false); if (e.dataTransfer.files?.length) void adicionarAnexos(e.dataTransfer.files) },
  }

  if (!open) return null

  const PAD = 12
  // Embutido (editor de documentos) = painel DOCADO sólido que preenche a coluna
  // (sem flutuar/sobrepor o editor); os demais modos seguem flutuantes/acrílicos
  // (shared glass class — see glass.css.ts — so isFull/embedded opt out entirely).
  const glassClass = embedded || isFull ? "" : lexGlass
  const shell: CSSProperties = embedded
    ? { position: "relative", width: "100%", height: "100%", background: "var(--bg)" }
    : isFull
      ? { position: "fixed", inset: 0, zIndex: 1310, borderRadius: 0, background: "var(--bg)" }
      : isSidebar
        // painel docado à direita: só a borda esquerda separa (flush nas outras 3
        // bordas), então zera o `border` do glass antes de reaplicar só a esquerda.
        ? { position: "fixed", top: TOPBAR_H, right: 0, bottom: 0, width: 412, zIndex: 1200, border: "none", borderLeft: "1px solid var(--lex-acrylic-border)" }
        : {
            position: "fixed", bottom: bottomInset > 0 ? bottomInset + 16 : 24, right: 24, width: 452,
            height: `min(672px, calc(100dvh - ${bottomInset + 120}px))`, zIndex: 1305, borderRadius: 18,
            ...glassElevation("0 32px 90px rgba(2,13,37,0.5), 0 8px 24px rgba(2,13,37,0.3)"),
          }

  const modelName = MODELS.find((m) => m.id === modelo)?.name ?? "Automático"
  const sugestoes = embedded ? DOC_SUGGESTIONS : contextChips(page, clienteId != null).slice(0, 3)

  const headInnerStyle: CSSProperties = { maxWidth: isFull ? 860 : "none", margin: isFull ? "0 auto" : 0, width: isFull ? "100%" : "auto" }
  // --lx-pad = 12 no composer/cabeçalho; corpo = lx-pad + 13 (borda+padding do
  // composer) p/ o texto das mensagens alinhar com o texto do composer (design §6).
  const bodyPadX = PAD + 13

  return (
    <>
      <div
        className={"crm-scope " + (embedded ? "" : mode === "float" ? "crm-lexia-in" : "lex-back") + (glassClass ? " " + glassClass : "")}
        {...dragSurface}
        style={{
          ...shell,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* cabeçalho */}
        {embedded ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `12px ${PAD}px`, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <Orb size={26} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>LexIA</div>
              <div style={{ fontSize: 11, color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ok, #2F9E68)" }} />
                Editando este documento
              </div>
            </div>
            <button onClick={novoChat} title="Novo chat" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="edit" size={16} /></button>
          </div>
        ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: `14px ${PAD}px 14px ${PAD + 3}px`, borderBottom: "1px solid var(--border)", flexShrink: 0, ...headInnerStyle }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setChatMenu((s) => !s); carregarConversas() }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 8px 0 10px", borderRadius: 8, border: "none", background: chatMenu ? "var(--surface-hover)" : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text)" }}
            >
              <span style={{ fontWeight: 500, maxWidth: isFull ? "none" : 230, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chatTitle}</span>
              <Icon name="chevronDown" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
            </button>
            {chatMenu && (
              <>
                <div onClick={() => setChatMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
                <MenuPanel style={{ position: "absolute", top: 38, left: 0, width: 296, zIndex: 2, transformOrigin: "top left" }}>
                  <button className="fx-menu-item" onClick={novoChat}>
                    <Icon name="edit" size={16} style={{ color: "var(--text-muted)" }} />
                    <span style={{ fontWeight: 500 }}>Novo chat de IA</span>
                  </button>
                  <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />
                  <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "6px 10px 4px" }}>Mais antigas</div>
                  {conversas.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: "var(--text-subtle)", padding: "6px 10px 8px" }}>Nenhuma ainda.</div>
                  ) : (
                    conversas.slice(0, 7).map((r) => (
                      <button key={r.id} className="fx-menu-item" style={{ display: "block", padding: "8px 10px" }} onClick={() => abrirConversa(r)}>
                        <span style={{ display: "block", fontSize: 13.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titulo || "Conversa sem título"}</span>
                        <span style={{ display: "block", fontSize: 11.5, color: "var(--text-subtle)", marginTop: 1 }}>{crmDate(r.atualizadaEm)}</span>
                      </button>
                    ))
                  )}
                </MenuPanel>
              </>
            )}
          </div>
          <div style={{ marginLeft: "auto", marginRight: -4, display: "flex", alignItems: "center", gap: 2, position: "relative" }}>
            <button onClick={novoChat} title="Novo chat" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="edit" size={16} /></button>
            <button onClick={() => setLayoutMenu((s) => !s)} title="Layout" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8, background: layoutMenu ? "var(--surface-hover)" : undefined, color: layoutMenu ? "var(--text)" : "var(--text-muted)" }}><Icon name="sidebar" size={16} /></button>
            <button onClick={onMinimize} title="Minimizar" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8, fontSize: 18, lineHeight: 1, fontWeight: 500 }}>−</button>
            {layoutMenu && (
              <>
                <div onClick={() => setLayoutMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
                <MenuPanel style={{ position: "absolute", top: 38, right: 0, width: 200, zIndex: 2 }}>
                  {([{ v: "sidebar", ic: "sidebar", l: "Barra lateral" }, { v: "float", ic: "layoutGrid", l: "Flutuante" }, { v: "full", ic: "externalLink", l: "Tela cheia" }] as const).map((o) => (
                    <button key={o.v} className="fx-menu-item" style={{ justifyContent: "space-between" }} onClick={() => { onModeChange(o.v); setLayoutMenu(false) }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name={o.ic} size={16} style={{ color: "var(--text-muted)" }} />{o.l}</span>
                      {mode === o.v && <Icon name="check" size={15} strokeWidth={2.4} style={{ color: "var(--accent)" }} />}
                    </button>
                  ))}
                </MenuPanel>
              </>
            )}
          </div>
        </div>
        )}

        {/* corpo */}
        {empty ? (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: isFull ? "center" : "flex-start", padding: `28px ${bodyPadX}px 10px` }}>
            <div style={{ width: "100%", maxWidth: isFull ? 600 : "100%", margin: isFull ? "0 auto" : 0, textAlign: isFull ? "center" : "left" }}>
              <div style={{ display: "flex", justifyContent: isFull ? "center" : "flex-start", marginBottom: 18 }}>
                <Orb size={isFull ? 60 : 48} glow />
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.025em", color: "var(--text)", lineHeight: 1.15 }}>{embedded ? "Vamos editar este documento" : `Como posso ajudar, ${greetingName}?`}</h2>
              {embedded ? (
                <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>Detecto campos, preencho com dados reais e ajusto cláusulas — direto no papel. Selecione um trecho para editar só ele.</p>
              ) : (
                isFull && <p style={{ margin: "10px 0 0", fontSize: 15, color: "var(--text-muted)", lineHeight: 1.5 }}>Conectada aos seus clientes, casos, contratos e financeiro.</p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 24, marginInline: -12 }}>
                {sugestoes.map((s) => (
                  <button key={s} onClick={() => enviar(s)} className="lx-sugg" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "11px 12px", border: "none", background: "transparent", borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>
                    <SparkleChip size={30} />
                    <span style={{ flex: 1 }}>{s}</span>
                    <Icon name="arrowRight" size={15} style={{ color: "var(--text-subtle)" }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <div style={{ width: "100%", maxWidth: isFull ? 720 : "100%", margin: isFull ? "0 auto" : 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <LexiaThread messages={messages} streaming={streaming} onDecide={decide} onDocAccept={onDocAccept} autoApplyDoc={embedded && autoMode && agentMode !== "plano"} padding={`24px ${bodyPadX}px 8px`} />
            </div>
          </div>
        )}

        {/* composer */}
        <div style={{ flexShrink: 0, padding: `10px ${PAD}px ${PAD}px`, maxWidth: isFull ? 720 : "100%", margin: isFull ? "0 auto" : 0, width: isFull ? "100%" : "auto" }}>
          <div className="lx-composer">
            {anexos.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <AnexoChips anexos={anexos} onRemove={(i) => setAnexos((prev) => prev.filter((_, j) => j !== i))} />
              </div>
            )}
            {embedded ? (
              selection ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", height: 26, padding: "0 5px 0 9px", borderRadius: 7, background: "var(--accent-soft)", border: "1px solid var(--border-gold, var(--accent))", fontSize: 12, fontWeight: 500, color: "var(--accent)" }}>
                    <Icon name="wand" size={13} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 230 }}>Trecho: “{selection.texto.slice(0, 40)}{selection.texto.length > 40 ? "…" : ""}”</span>
                    <button onClick={() => onClearSelection?.()} title="Remover seleção" className="btn btn-ghost" style={{ width: 18, height: 18, padding: 0, borderRadius: 5, color: "var(--accent)" }}><Icon name="x" size={12} /></button>
                  </span>
                </div>
              ) : null
            ) : (
              contexts.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 }}>
                  {contexts.map((c) => (
                    <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 5px 0 9px", borderRadius: 7, background: "var(--bg-sunken)", border: "1px solid var(--border)", fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
                      <Icon name={c.icon} size={13} style={{ color: "var(--accent)" }} /> {c.label}
                      <button onClick={() => setContexts((p) => p.filter((x) => x.label !== c.label))} title="Remover" className="btn btn-ghost" style={{ width: 18, height: 18, padding: 0, borderRadius: 5, color: "var(--text-subtle)" }}><Icon name="x" size={12} /></button>
                    </span>
                  ))}
                </div>
              )
            )}
            <AutoTextarea
              value={input}
              onChange={setInput}
              onSubmit={() => enviar(input)}
              placeholder={embedded ? "Edite o documento, preencha campos, revise cláusulas…" : "Peça qualquer coisa à LexIA…"}
              maxHeight={150}
              style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text)", lineHeight: 1.5, padding: 2, letterSpacing: "-0.01em", display: "block" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              {/* + (adicionar contexto) */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setCtxMenu((s) => !s)} title="Adicionar contexto" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8, background: ctxMenu ? "var(--surface-hover)" : undefined, color: ctxMenu ? "var(--text)" : "var(--text-muted)" }}><Icon name="plus" size={17} /></button>
                {ctxMenu && (
                  <>
                    <div onClick={() => setCtxMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
                    <MenuPanel style={{ position: "absolute", bottom: 40, left: 0, width: 278, zIndex: 2, transformOrigin: "bottom left" }}>
                      <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "6px 10px 4px" }}>Adicionar contexto</div>
                      <button className="fx-menu-item" onClick={() => { setCtxMenu(false); fileRef.current?.click() }}>
                        <Icon name="paperclip" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                        <span>Adicionar imagens, PDFs ou arquivos</span>
                      </button>
                      {!embedded && (
                        <button className="fx-menu-item" onClick={() => { const c = PAGE_CTX[page]; if (c) setContexts((p) => (p.some((x) => x.label === c.label) ? p : [...p, c])); setCtxMenu(false) }}>
                          <Icon name="at" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                          <span>Mencione páginas ou pessoas</span>
                        </button>
                      )}
                    </MenuPanel>
                  </>
                )}
              </div>
              {/* configurações */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setSettingsMenu((s) => !s)} title="Configurações" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8, background: settingsMenu ? "var(--surface-hover)" : undefined, color: settingsMenu || agentMode !== "agente" ? "var(--text)" : "var(--text-muted)" }}><Icon name="sliders" size={16} /></button>
                {settingsMenu && (
                  <LexiaSettingsMenu
                    agentMode={agentMode}
                    setAgentMode={(m) => { setAgentMode(m); persist({ agentMode: m }) }}
                    webAccess={webAccess}
                    setWebAccess={(v) => { setWebAccess(v); persist({ webAccess: v }) }}
                    autoMode={autoMode}
                    setAutoMode={(v) => { setAutoMode(v); persist({ autoMode: v }) }}
                    onClose={() => setSettingsMenu(false)}
                    onPersonalize={() => { setSettingsMenu(false); setPersonalizeOpen(true) }}
                  />
                )}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
                <button onClick={() => setModelMenu((s) => !s)} style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 9px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500, color: "var(--text-muted)" }}>
                  {modelName}<Icon name="chevronDown" size={13} style={{ color: "var(--text-subtle)" }} />
                </button>
                <button onClick={() => enviar(input)} disabled={!input.trim() && anexos.length === 0} title="Enviar" style={{ width: 32, height: 32, borderRadius: 9, border: "none", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: input.trim() || anexos.length ? GOLD : "var(--bg-sunken)", color: input.trim() || anexos.length ? "#020D25" : "var(--text-subtle)", cursor: input.trim() || anexos.length ? "pointer" : "default" }}>
                  <Icon name="arrowRight" size={16} strokeWidth={2.2} style={{ transform: "rotate(-90deg)" }} />
                </button>
                {modelMenu && (
                  <>
                    <div onClick={() => setModelMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
                    <MenuPanel style={{ position: "absolute", bottom: 42, right: 0, width: 250, zIndex: 2 }}>
                      {MODELS.map((mo) => (
                        <button key={mo.id} className="fx-menu-item" style={{ alignItems: "flex-start", flexDirection: "column", gap: 2 }} onClick={() => { setModelo(mo.id); persist({ modelo: mo.id }); setModelMenu(false) }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                            <span style={{ fontWeight: 500 }}>{mo.name}</span>
                            {modelo === mo.id && <Icon name="check" size={14} strokeWidth={2.4} style={{ color: "var(--accent)", marginLeft: "auto" }} />}
                          </span>
                          <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{mo.desc}</span>
                        </button>
                      ))}
                    </MenuPanel>
                  </>
                )}
              </div>
            </div>
          </div>
          {isFull && <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-subtle)", marginTop: 10 }}>A LexIA pode cometer erros. Confira informações importantes.</div>}
        </div>

        {dragOver && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none", background: "var(--accent-soft)", border: "2px dashed var(--accent)", borderRadius: isFull ? 0 : 16, color: "var(--accent)" }}>
            <Icon name="paperclip" size={22} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Solte os arquivos aqui</span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.length) void adicionarAnexos(e.target.files); e.target.value = "" }} />

      {personalizeOpen && (
        <LexiaPersonalizeModal
          persona={persona}
          setPersona={setPersona}
          instrucoes={instrucoes}
          setInstrucoes={setInstrucoes}
          onClose={() => setPersonalizeOpen(false)}
          onSave={() => { persist({ persona, instrucoes }); setPersonalizeOpen(false); toast("Preferências salvas") }}
        />
      )}
    </>
  )
}
