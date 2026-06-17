"use client"

// LexIA · the single AI surface of the app — a unified command bar that replaces
// the "LexIA" sidebar item and the Documents hero. One acrylic surface fuses
// search + actions + natural language → conversation. Two variants:
//   • "dock"     — global frosted ORB anchored bottom-right (closed) that morphs
//                  into a right-anchored acrylic panel (open), per the "Clientes,
//                  Casos & Agenda" design. Non-modal (no backdrop). The header
//                  pin still SNAPS it into a reflowing right sidebar. Mounted once
//                  by the shell; ⌘K / orb click opens it.
//   • "embedded" — the same panel rendered inline (e.g. the Documents page),
//                  the design's "Embutido" state.
// Command view is bespoke (faceted list); chat view reuses the real streaming
// kit (useLexiaStream + LexiaThread) so it is the production agent, not a mock.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { crmMoney, crmDate } from "@/components/crm/crm-fmt"
import { searchAll, lexiaConversa, lexiaConversas } from "@/components/crm/crm-api"
import type { CrmNav, LexiaConversaRow, SearchResults } from "@/components/crm/crm-types"
import { useLexiaStream } from "./useLexiaStream"
import { LexiaThread } from "./LexiaThread"
import type { DocPatchSuggestion, DocumentoContexto } from "./types"
import { contextChips, contextPlaceholder } from "./Suggestions"
import { AnexoChips, PaperclipButton } from "./AnexoChips"
import { arquivosDoClipboard, lerArquivos, type ClientAnexo } from "./anexos"
import { toast } from "@/lib/client/toast"
import { apiSend } from "@/lib/client/api"

const GOLD_SEND = "var(--brand-gold)"
const EMPTY_RESULTS: SearchResults = { q: "", clientes: [], casos: [], processos: [], partes: [], contratos: [], tarefas: [], lancamentos: [] }

// Icon tints code MEANING only: gold = generation/AI, neutral = common action,
// semantic for alerts/money. No decorative blue/violet (design rule).
const TONES: Record<string, string> = {
  gold: "var(--accent)",
  blue: "var(--text-muted)",
  pos: "var(--fin-pos,#1F8A4C)",
  neg: "var(--fin-neg,#C0492F)",
  violet: "var(--text-muted)",
}
const toneTint = (c?: string) => (c ? `color-mix(in srgb, ${c} 12%, transparent)` : undefined)
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

interface BarItem {
  id: string
  ai?: boolean
  icon?: CrmIconName
  tone?: string
  title: string
  sub?: string
  tag?: string
  run: () => void
  /** Keep the dock open after running (e.g. switch to history/chat view). */
  keepOpen?: boolean
  idx?: number
}
interface BarGroup {
  key: string
  label: string
  items: BarItem[]
}
interface BarHandlers {
  nav: CrmNav
  navigate: (href: string) => void
  action: (kind: string) => void
  ask: (text: string) => void
}

// natural-language → up to 2 action shortcuts; entity resolution is left to the
// real agent (the "Perguntar à LexIA" row) and to the live search results below.
function detectActions(q: string, h: BarHandlers): BarItem[] {
  const m = norm(q)
  const out: BarItem[] = []
  const has = (...ws: string[]) => ws.some((w) => m.includes(w))
  // Common actions are neutral; gold stays reserved for AI/generation rows.
  if (has("cobrar", "receber", "vencid", "devend", "honorário", "honorario", "inadimpl", "pagamento"))
    out.push({ id: "d-cob", icon: "wallet", title: "Honorários vencidos", sub: "Abrir lançamentos em atraso", run: () => h.navigate("/financeiro?tab=lancamentos&dir=in&stat=vencido") })
  if (has("tarefa", "lembr", "todo", "fazer", "follow"))
    out.push({ id: "d-tar", icon: "listChecks", title: "Criar tarefa", sub: q.trim() || "Nova tarefa", run: () => h.action("nova-tarefa") })
  if (has("cadastr") || (has("cliente") && has("novo", "nova")))
    out.push({ id: "d-cli", icon: "user", title: "Cadastrar novo cliente", sub: "Abrir formulário", run: () => h.action("novo-cliente") })
  if (has("agendar", "audiência", "audiencia", "reunião", "reuniao", "prazo", "evento", "compromisso"))
    out.push({ id: "d-age", icon: "calendar", title: "Abrir agenda", sub: "Marcar compromisso", run: () => h.navigate("/agenda") })
  if (has("minutar", "redigir", "contrato", "procuração", "procuracao", "parecer", "petição", "peticao", "documento", "minuta", "cláusula", "clausula"))
    out.push({ id: "d-doc", icon: "fileText", title: "Criar documento", sub: "Abrir gerador de documentos", run: () => h.navigate("/documents") })
  if (has("lançamento", "lancamento", "despesa", "receita") && out.length === 0)
    out.push({ id: "d-lan", icon: "banknote", title: "Novo lançamento", sub: "Honorário ou despesa", run: () => h.action("novo-lancamento") })
  return out.slice(0, 2)
}

function searchItems(r: SearchResults, h: BarHandlers): BarItem[] {
  const items: BarItem[] = []
  r.clientes.slice(0, 4).forEach((c) =>
    items.push({ id: `cli-${c.id}`, icon: c.tipo === "pj" ? "building" : "user", title: c.nome, sub: `${c.tipo.toUpperCase()} · ${c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "cliente"} · ${c.numCasos} caso${c.numCasos === 1 ? "" : "s"}`, run: () => h.nav.openCliente(c.id) }),
  )
  r.casos.slice(0, 3).forEach((k) =>
    items.push({ id: `cas-${k.id}`, icon: "briefcase", title: k.titulo, sub: [k.cliente, k.numeroProcesso, k.status].filter(Boolean).join(" · ") || "caso", run: () => h.nav.openCaso(k.id) }),
  )
  r.contratos.slice(0, 3).forEach((c) =>
    items.push({ id: `con-${c.id}`, icon: "receipt", title: c.descricao, sub: `${c.cliente ? `${c.cliente} · ` : ""}${crmMoney(c.valorCents)}`, run: () => h.nav.openContrato(c.id) }),
  )
  r.tarefas.slice(0, 3).forEach((t) =>
    items.push({ id: `tar-${t.id}`, icon: "listChecks", title: t.titulo, sub: `P${t.prio}${t.prazo ? ` · ${crmDate(t.prazo)}` : ""}`, run: () => h.navigate("/tarefas") }),
  )
  r.lancamentos.slice(0, 3).forEach((l) =>
    items.push({ id: `lan-${l.id}`, icon: "banknote", title: l.desc, sub: `${l.venc ? `venc. ${crmDate(l.venc)} · ` : ""}${l.pago ? "Pago" : "Em aberto"}`, run: () => h.navigate("/financeiro?tab=lancamentos") }),
  )
  return items
}

// ── animated brand mark (conic gold orb + sparkles) ──
function LexiaMark({ size = 30, radius = 10, icon = 15 }: { size?: number; radius?: number; icon?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}>
      <div className="lex-orb-grad" style={{ position: "absolute", inset: -size * 0.5, borderRadius: "50%" }} />
      <div style={{ position: "absolute", inset: 1.5, borderRadius: radius - 1.5, background: "rgba(2,13,37,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5E9C6" }}>
        <Icon name="sparkles" size={icon} strokeWidth={2} />
      </div>
    </div>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "10px 12px 4px" }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{children}</span>
    </div>
  )
}

function Row({ item, active, onHover, onRun }: { item: BarItem; active: boolean; onHover: () => void; onRun: () => void }) {
  const c = item.tone ? TONES[item.tone] : undefined
  return (
    <div
      data-idx={item.idx}
      onMouseEnter={onHover}
      onClick={onRun}
      className={active ? "lex-row active" : "lex-row"}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "9px 12px",
        borderRadius: 10, cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: item.ai ? "transparent" : c ? toneTint(c) : active ? "var(--surface)" : "var(--bg-sunken)",
          color: c || (active ? "var(--accent)" : "var(--text-muted)"),
        }}
      >
        {item.ai ? <LexiaMark size={32} radius={8} icon={15} /> : <Icon name={item.icon ?? "circleDot"} size={16} strokeWidth={1.85} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
        {item.sub && <div style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.sub}</div>}
      </div>
      {item.tag && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", background: "var(--bg-sunken)", padding: "2px 7px", borderRadius: 6, flexShrink: 0, letterSpacing: "0.02em" }}>{item.tag}</span>}
      {active && <kbd className="crm-kbd" style={{ flexShrink: 0 }}>↵</kbd>}
    </div>
  )
}

export interface LexiaBarProps {
  variant?: "dock" | "embedded"
  // dock control
  open?: boolean
  onOpenChange?: (open: boolean) => void
  seed?: string
  overdue?: { count: number; totalCents: number } | null
  onExpand?: (conversaId: number | null) => void
  // Dock placement of the expanded panel (dock variant only):
  //   "center" — the floating overlay over a dim backdrop (modal focus).
  //   "right"  — pinned as a right sidebar, NO backdrop, so the page stays
  //              clickable while chatting (Notion-style). The shell reflows the
  //              page content to make room. Toggled by the header pin button.
  dock?: "center" | "right"
  onDockChange?: (dock: "center" | "right") => void
  // Height (px) of a fixed bottom bar on the current page (e.g. the financeiro
  // totals footer). The bottom-center pill floats this much higher so it rests
  // ABOVE that bar instead of covering it. 0 when the page has no bottom bar.
  bottomInset?: number
  // hide the floating dock pill (e.g. on the document editor, where the AI
  // surface is the docked side panel — the global input "morphs away")
  pillHidden?: boolean
  // context + handlers
  page: string
  clienteId?: number
  nav: CrmNav
  onNavigate: (href: string) => void
  onAction: (kind: string) => void
  // embedded extras
  examples?: string[]
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  // focus mode (document editor): show ONLY the contextual suggestions + chat —
  // hide Ações rápidas / Ir para / global search / detected actions.
  minimal?: boolean
  // document-editor only: edit the OPEN document through the chat.
  //   onDocAccept — apply AI-proposed edits to the live editor preview.
  //   sendContext — a getter returning the open document snapshot (read fresh at
  //                 send time, so it never goes stale) sent with each turn.
  onDocAccept?: (sugestoes: DocPatchSuggestion[]) => void
  sendContext?: () => DocumentoContexto | undefined
}

export function LexiaBar({
  variant = "dock",
  open = false,
  onOpenChange,
  seed = "",
  overdue = null,
  onExpand,
  dock = "center",
  onDockChange,
  bottomInset = 0,
  pillHidden = false,
  page,
  clienteId,
  nav,
  onNavigate,
  onAction,
  examples,
  placeholder,
  minHeight,
  maxHeight,
  minimal = false,
  onDocAccept,
  sendContext,
}: LexiaBarProps) {
  const embedded = variant === "embedded"
  const [q, setQ] = useState("")
  const [sel, setSel] = useState(0)
  const [view, setView] = useState<"command" | "chat" | "history">("command")
  const [render, setRender] = useState(embedded)
  const [show, setShow] = useState(embedded)
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [conversas, setConversas] = useState<LexiaConversaRow[]>([])
  const [anexos, setAnexos] = useState<ClientAnexo[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const dragDepth = useRef(0) // conta enter/leave aninhados p/ o overlay não piscar

  // "Olhando a LexIA" = painel aberto ou variante embutida. Ref p/ o callback de
  // conclusão ler o estado fresco no momento em que o turno termina.
  const watchingRef = useRef(embedded || open)
  watchingRef.current = embedded || open

  const { messages, streaming, conversaId, send, decide, stop, reset, hydrate } = useLexiaStream(null, {
    onComplete: ({ conversaId: cid, prompt, pendente }) => {
      // Conclusão em segundo plano: só avisa quando o turno terminou de fato
      // (sem pausa p/ confirmação) E o usuário NÃO estava olhando (barra fechada).
      if (pendente || watchingRef.current) return
      const resumo = prompt.length > 120 ? `${prompt.slice(0, 117)}…` : prompt
      void apiSend("/api/lexia/notificar-conclusao", "POST", { conversaId: cid, resumo }).catch(() => {})
    },
  })
  // Live message count read inside effects without re-subscribing them — lets us
  // decide whether reopening should restore the persisted chat view.
  const msgCountRef = useRef(0)
  msgCountRef.current = messages.length

  const adicionarAnexos = useCallback(
    async (files: FileList | File[]) => {
      const { anexos: novos, erros } = await lerArquivos(files, anexos)
      if (novos.length) {
        setAnexos((prev) => [...prev, ...novos])
        setView("chat")
      }
      erros.forEach((e) => toast(e, { kind: "error" }))
    },
    [anexos],
  )

  const ask = useCallback(
    (text: string, anexosArg?: ClientAnexo[]) => {
      const t = text.trim()
      const ax = anexosArg ?? []
      if (!t && ax.length === 0) return
      setView("chat")
      setQ("")
      send(t, page, ax.length ? ax : undefined, sendContext?.())
    },
    [page, send, sendContext],
  )
  // Envio a partir do input do chat: leva texto + anexos escolhidos e limpa.
  const enviarChat = useCallback(() => {
    const ax = anexos
    setAnexos([])
    ask(q, ax)
  }, [anexos, q, ask])
  // Return to the command/search surface WITHOUT discarding the conversation —
  // the thread persists, so asking again (or reopening) resumes it. The explicit
  // "Nova conversa" button is the only thing that clears the thread.
  const backToCommand = useCallback(() => {
    setView("command")
    setQ("")
  }, [])
  // New chat: discard the current conversation and return to a fresh command view.
  const novaConversa = useCallback(() => {
    reset()
    setAnexos([])
    setQ("")
    setSel(0)
    setView("command")
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [reset])

  // ── conversation history (dock "popup") ──
  const carregarConversas = useCallback(() => {
    lexiaConversas()
      .then(setConversas)
      .catch(() => {})
  }, [])
  const abrirHistorico = useCallback(() => {
    setQ("")
    setView("history")
    carregarConversas()
  }, [carregarConversas])
  const abrirConversa = useCallback(
    async (id: number) => {
      try {
        const det = await lexiaConversa(id)
        hydrate(det.id, det.mensagens)
        setQ("")
        setView("chat")
      } catch {
        /* ignore */
      }
    },
    [hydrate],
  )

  const h = useMemo<BarHandlers>(() => ({ nav, navigate: onNavigate, action: onAction, ask }), [nav, onNavigate, onAction, ask])

  // dock mount + Apple-style expand/collapse driven by `open`
  useEffect(() => {
    if (embedded) return
    if (open) {
      setRender(true)
      carregarConversas()
      const raf = requestAnimationFrame(() => setShow(true))
      const ft = setTimeout(() => inputRef.current?.focus(), 40)
      // A search seed (⌘K) lands on the command surface; otherwise, if there is a
      // persisted conversation, reopen straight into it.
      if (seed) { setView("command"); setQ(seed) }
      else setView(msgCountRef.current > 0 ? "chat" : "command")
      return () => { cancelAnimationFrame(raf); clearTimeout(ft) }
    }
    setShow(false)
    // Closing PERSISTS the conversation (messages / conversaId / view all stay) so
    // reopening resumes where the user left off — only the transient search draft
    // is cleared. "Nova conversa" is the explicit reset.
    const t = setTimeout(() => { setRender(false); setQ(""); setSel(0) }, 440)
    return () => clearTimeout(t)
  }, [open, embedded, seed, carregarConversas])

  // Ctrl/Cmd+V cola arquivos direto no painel (qualquer view, sem precisar focar
  // o input) enquanto o popup está aberto / embedded. Só intercepta pastes COM
  // arquivos — colar texto passa direto para o input normalmente.
  useEffect(() => {
    if (!(open || embedded)) return
    const onPaste = (e: ClipboardEvent) => {
      const files = arquivosDoClipboard(e.clipboardData)
      if (!files.length) return
      e.preventDefault()
      void adicionarAnexos(files)
    }
    document.addEventListener("paste", onPaste)
    return () => document.removeEventListener("paste", onPaste)
  }, [open, embedded, adicionarAnexos])

  // debounced live search (command view, q ≥ 2)
  useEffect(() => {
    if (view !== "command" || q.trim().length < 2) { setResults(EMPTY_RESULTS); return }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await searchAll(q.trim())
        if (!cancelled) setResults(r)
      } catch {
        if (!cancelled) setResults(EMPTY_RESULTS)
      }
    }, 160)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q, view])

  // command groups
  const groups = useMemo<BarGroup[]>(() => {
    if (view !== "command") return []
    const gs: BarGroup[] = []
    const qt = q.trim()
    if (qt.length < 2) {
      if (examples?.length) gs.push({ key: "ex", label: "Exemplos", items: examples.map((ex, i) => ({ id: `ex-${i}`, icon: "sparkles", title: ex, run: () => setQ(ex) })) })
      const sug: BarItem[] = []
      if (overdue && overdue.count > 0)
        sug.push({ id: "ov", icon: "alertTriangle", tone: "neg", title: `${overdue.count} honorário${overdue.count === 1 ? "" : "s"} vencido${overdue.count === 1 ? "" : "s"} · ${crmMoney(overdue.totalCents)}`, sub: "Pedir à LexIA um plano de cobrança", tag: "Atenção", run: () => ask("Quem está devendo? Faça um plano de cobrança.") })
      contextChips(page, clienteId != null).forEach((c, i) => sug.push({ id: `sg-${i}`, ai: true, title: c, run: () => ask(c) }))
      gs.push({ key: "sug", label: "Sugestões da LexIA", items: sug })
      if (!embedded && conversas.length > 0) {
        gs.push({
          key: "hist",
          label: "Conversas recentes",
          items: [
            ...conversas.slice(0, 3).map((c) => ({
              id: `h-${c.id}`,
              icon: "history" as CrmIconName,
              title: c.titulo || "Conversa sem título",
              sub: crmDate(c.atualizadaEm),
              keepOpen: true,
              run: () => abrirConversa(c.id),
            })),
            { id: "hist-all", icon: "clock" as CrmIconName, title: "Ver histórico completo", keepOpen: true, run: abrirHistorico },
          ],
        })
      }
      if (!minimal) {
        gs.push({
          key: "acoes", label: "Ações rápidas", items: [
            { id: "a-cli", icon: "user", title: "Novo cliente", sub: "Cadastrar PF ou PJ", run: () => onAction("novo-cliente") },
            { id: "a-tar", icon: "listChecks", title: "Nova tarefa", sub: "Criar tarefa", run: () => onAction("nova-tarefa") },
            { id: "a-lan", icon: "banknote", title: "Novo lançamento", sub: "Honorário ou despesa", run: () => onAction("novo-lancamento") },
            { id: "a-eve", icon: "calendar", title: "Novo evento", sub: "Audiência, prazo ou reunião", run: () => onAction("novo-evento") },
          ],
        })
        gs.push({
          key: "ir", label: "Ir para", items: [
            { id: "i-ini", icon: "home", title: "Início", run: () => onNavigate("/") },
            { id: "i-cli", icon: "users", title: "Clientes", run: () => nav.navPage("clientes") },
            { id: "i-cas", icon: "briefcase", title: "Casos", run: () => nav.navPage("casos") },
            { id: "i-con", icon: "receipt", title: "Contratos", run: () => nav.navPage("contratos") },
            { id: "i-fin", icon: "wallet", title: "Financeiro", run: () => onNavigate("/financeiro") },
            { id: "i-age", icon: "calendar", title: "Agenda", run: () => nav.navPage("agenda") },
            { id: "i-doc", icon: "fileText", title: "Documentos", run: () => onNavigate("/documents") },
            { id: "i-tar", icon: "listChecks", title: "Tarefas", run: () => onNavigate("/tarefas") },
          ],
        })
      }
      return gs
    }
    const ai: BarItem[] = [{ id: "ask", ai: true, title: "Perguntar à LexIA", sub: `“${qt}”`, tag: "IA", run: () => ask(qt) }]
    if (!minimal) detectActions(qt, h).forEach((a) => ai.push(a))
    gs.push({ key: "lexia", label: "LexIA", items: ai })
    if (!minimal) {
      const res = searchItems(results, h)
      if (res.length) gs.push({ key: "res", label: "Resultados", items: res })
    }
    return gs
  }, [view, q, overdue, page, clienteId, examples, results, h, ask, onAction, onNavigate, nav, embedded, minimal, conversas, abrirConversa, abrirHistorico])

  // flat index for keyboard nav
  let i = -1
  groups.forEach((g) => g.items.forEach((it) => { it.idx = ++i }))
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  useEffect(() => { setSel(0) }, [q, view])
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [sel])

  const runItem = useCallback(
    (it: BarItem) => {
      if (it.ai || it.keepOpen) { it.run(); return } // ai/history rows stay in the bar
      it.run()
      if (!embedded) onOpenChange?.(false)
    },
    [embedded, onOpenChange],
  )

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      if (view === "chat") backToCommand()
      else if (view === "history") { setView("command"); setQ("") }
      else if (!embedded) onOpenChange?.(false)
      else e.currentTarget.blur()
      return
    }
    if (view === "chat") {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarChat() }
      return
    }
    if (view === "history") return // typing just filters the list
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === "Enter") {
      e.preventDefault()
      if ((e.metaKey || e.ctrlKey) && q.trim()) { ask(q); return }
      const it = flat[sel]
      if (it) runItem(it)
      else if (q.trim()) ask(q)
    }
  }

  // No gold aurora/glow (design rule): the acrylic surface carries elevation via
  // subtle shadow + 16% border. Only the animated orb mark carries the gold.
  // The surface is composed from three pieces so the dock can pin the input to
  // the BOTTOM (the pill simply stretches open) while embedded keeps it on top.

  // Drag-drop em TODO o painel: arrastar arquivos para qualquer parte do popup
  // (ou do embedded) anexa. Conta enter/leave aninhados p/ o overlay não piscar
  // ao passar sobre filhos; só reage quando o arrasto traz arquivos.
  const dropAtivo = embedded || open
  const temArquivos = (e: React.DragEvent) => Array.from(e.dataTransfer.types || []).includes("Files")
  const dragSurface = dropAtivo
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!temArquivos(e)) return
          e.preventDefault()
          dragDepth.current += 1
          setDragOver(true)
        },
        onDragOver: (e: React.DragEvent) => {
          if (temArquivos(e)) e.preventDefault() // habilita o drop
        },
        onDragLeave: (e: React.DragEvent) => {
          if (!temArquivos(e)) return
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragOver(false)
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          dragDepth.current = 0
          setDragOver(false)
          if (e.dataTransfer.files?.length) void adicionarAnexos(e.dataTransfer.files)
        },
      }
    : {}
  const dropOverlay = dragOver ? (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        pointerEvents: "none",
        background: "var(--accent-soft)",
        border: "2px dashed var(--accent)",
        borderRadius: embedded ? 14 : 16,
        color: "var(--accent)",
      }}
    >
      <Icon name="paperclip" size={22} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>Solte os arquivos aqui</span>
    </div>
  ) : null

  // command line — the input row at the bottom of the panel. In the dock the
  // CLOSED state is the floating orb (below), so this row only ever renders
  // inside the open panel. Drag-drop is handled at the WHOLE-panel level
  // (dragSurface); here live only the clip + paste affordances.
  const inputRow = (atBottom: boolean) => (
    <div
      style={{
        position: "relative", display: "flex", flexDirection: "column", gap: 8,
        padding: embedded ? "12px 16px" : "10px 14px",
        flexShrink: 0,
        borderTop: atBottom ? "1px solid var(--border)" : undefined,
        borderBottom: embedded && !atBottom ? "1px solid var(--border)" : undefined,
      }}
    >
      {view === "chat" && anexos.length > 0 && (
        <AnexoChips anexos={anexos} onRemove={(i) => setAnexos((prev) => prev.filter((_, j) => j !== i))} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: embedded ? undefined : 52 }}>
        {view !== "command" && (
          <button onClick={view === "chat" ? backToCommand : () => { setView("command"); setQ("") }} title="Voltar aos comandos" className="btn btn-ghost" style={{ width: 34, height: 34, padding: 0, borderRadius: 10, flexShrink: 0 }}>
            <Icon name="chevronLeft" size={18} />
          </button>
        )}
        {view === "chat" && <PaperclipButton onPick={(f) => void adicionarAnexos(f)} disabled={streaming} />}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder={view === "chat" ? "Responder à LexIA…" : view === "history" ? "Buscar nas conversas…" : placeholder ?? contextPlaceholder(page, clienteId != null)}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: embedded ? 16 : 15, color: "var(--text)", letterSpacing: "-0.01em", minWidth: 0 }}
        />
        {view === "chat" && streaming && (
          <button onClick={stop} title="Parar" className="btn btn-ghost" style={{ width: 34, height: 34, padding: 0, borderRadius: 10, flexShrink: 0 }}>
            <Icon name="x" size={16} />
          </button>
        )}
        {view === "chat" && !streaming && (q.trim() || anexos.length > 0) && (
          <button onClick={enviarChat} title="Enviar" style={{ width: 34, height: 34, borderRadius: 10, border: "none", flexShrink: 0, cursor: "pointer", background: GOLD_SEND, color: "#020D25", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="send" size={15} />
          </button>
        )}
        {embedded && view === "chat" && onExpand && conversaId != null && (
          <button onClick={() => onExpand(conversaId)} title="Abrir conversa completa" className="btn btn-ghost" style={{ width: 34, height: 34, padding: 0, borderRadius: 10, flexShrink: 0 }}>
            <Icon name="externalLink" size={15} />
          </button>
        )}
      </div>
    </div>
  )

  // history view list (filtered live by the input)
  const histFiltradas = q.trim() ? conversas.filter((c) => norm(c.titulo || "Conversa sem título").includes(norm(q))) : conversas
  const historyEl = (
    <div className="lex-back" style={{ position: "relative", flex: 1, overflowY: "auto", padding: "6px 8px 10px", minHeight: 0 }}>
      {conversas.length === 0 ? (
        <div style={{ padding: "34px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Nenhuma conversa ainda</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>Suas conversas com a LexIA aparecerão aqui.</div>
        </div>
      ) : (
        <>
          <GroupLabel>Histórico de conversas</GroupLabel>
          {histFiltradas.map((c) => (
            <div
              key={c.id}
              onClick={() => abrirConversa(c.id)}
              className="lex-row"
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 10, cursor: "pointer" }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-sunken)", color: "var(--text-muted)" }}>
                <Icon name="history" size={16} strokeWidth={1.85} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.titulo || "Conversa sem título"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                  {crmDate(c.atualizadaEm)} · {c.numMensagens} mensage{c.numMensagens === 1 ? "m" : "ns"}
                </div>
              </div>
            </div>
          ))}
          {histFiltradas.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "var(--text-subtle)" }}>Nenhuma conversa para “{q.trim()}”.</div>
          )}
        </>
      )}
    </div>
  )

  const bodyEl =
    view === "chat" ? (
      <LexiaThread messages={messages} streaming={streaming} onDecide={decide} onDocAccept={onDocAccept} padding="16px 14px" />
    ) : view === "history" ? (
      historyEl
    ) : (
      <div ref={listRef} className="lex-back" style={{ position: "relative", flex: 1, overflowY: "auto", padding: "6px 8px 10px", minHeight: 0 }}>
        {flat.length === 0 ? (
          <div style={{ padding: "34px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Nada encontrado para “{q.trim()}”</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>
              Pressione <kbd className="crm-kbd">↵</kbd> para perguntar à LexIA.
            </div>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key} style={{ marginBottom: 4 }}>
              <GroupLabel>{g.label}</GroupLabel>
              {g.items.map((it) => (
                <Row key={it.id} item={it} active={it.idx === sel} onHover={() => setSel(it.idx ?? 0)} onRun={() => runItem(it)} />
              ))}
            </div>
          ))
        )}
      </div>
    )

  // dock header (visible only when expanded): brand + the /lexia full-page shortcut.
  const dockHeader = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 10px 11px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
        LexIA
      </span>
      <span style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {view === "chat" ? "conversa" : view === "history" ? "histórico" : "busca, ações e IA"}
      </span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <button
          onClick={view === "history" ? () => { setView("command"); setQ("") } : abrirHistorico}
          title="Histórico de conversas"
          className="btn btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, color: view === "history" ? "var(--accent)" : "var(--text-muted)" }}
        >
          <Icon name="history" size={14} /> Histórico
        </button>
        <button
          onClick={novaConversa}
          title="Nova conversa"
          className="btn btn-ghost"
          style={{ width: 30, height: 30, padding: 0, borderRadius: 8, color: "var(--text-muted)" }}
        >
          <Icon name="edit" size={15} />
        </button>
        {onDockChange && (
          <button
            onClick={() => onDockChange(dock === "right" ? "center" : "right")}
            title={dock === "right" ? "Desafixar (voltar ao centro)" : "Prender à direita (a página fica acessível)"}
            className="btn btn-ghost"
            style={{ width: 30, height: 30, padding: 0, borderRadius: 8, color: dock === "right" ? "var(--accent)" : "var(--text-muted)", background: dock === "right" ? "var(--accent-soft)" : undefined }}
          >
            <Icon name="sidebar" size={15} />
          </button>
        )}
        {onExpand && (
          <button
            onClick={() => onExpand(view === "chat" ? conversaId : null)}
            title="Abrir a LexIA em tela cheia"
            className="btn btn-ghost"
            style={{ width: 30, height: 30, padding: 0, borderRadius: 8, color: "var(--text-muted)" }}
          >
            <Icon name="externalLink" size={15} />
          </button>
        )}
        <button onClick={() => onOpenChange?.(false)} title="Fechar (esc)" className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}>
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div
        {...dragSurface}
        style={{
          position: "relative", width: "100%", display: "flex", flexDirection: "column",
          minHeight: minHeight ?? 320, maxHeight: maxHeight ?? 560,
          background: "var(--lex-acrylic)", backdropFilter: "var(--lex-blur)", WebkitBackdropFilter: "var(--lex-blur)",
          border: "1px solid var(--lex-acrylic-border)", borderRadius: 14, overflow: "hidden",
          boxShadow: "0 18px 50px rgba(2,13,37,0.12), inset 0 1px 0 rgba(255,255,255,0.16)",
        }}
      >
        {bodyEl}
        {inputRow(true)}
        {dropOverlay}
      </div>
    )
  }

  const sidebar = dock === "right"
  // Rest 16px above a fixed bottom bar when the page reports one, else 24px.
  const dockBottom = bottomInset > 0 ? bottomInset + 16 : 24
  const TOPBAR_H = 56 // shell topbar height — the panel/sidebar start below it
  // The floating panel is shown for the default (center) dock; the pinned
  // right-snap renders the reflowing sidebar instead.
  const showPanel = render && !sidebar

  // Soft aurora behind the panel content — the design's signature glow that the
  // popup grows into (kept subtle: low-alpha gold + navy blobs, gentle drift).
  const auroraEl = (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", borderRadius: 16, zIndex: 0 }}>
      <div className="lex-blob lex-blob-a" style={{ position: "absolute", width: "115%", height: "80%", left: "-28%", top: "-26%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,161,71,0.16), transparent 72%)", filter: "blur(46px)" }} />
      <div className="lex-blob lex-blob-b" style={{ position: "absolute", width: "110%", height: "80%", right: "-30%", bottom: "-30%", borderRadius: "50%", background: "radial-gradient(circle, rgba(74,110,180,0.13), transparent 74%)", filter: "blur(48px)" }} />
    </div>
  )

  return (
    <>
      {/* LAUNCHER ORB (closed) — a frosted gold orb anchored bottom-right. It fades
          + scales out as the panel grows from its corner, and back in on close.
          Hidden on editor / /lexia (pillHidden). */}
      {!pillHidden && (
        <button
          onClick={() => onOpenChange?.(true)}
          aria-label="Abrir LexIA"
          className="crm-scope lex-aura-edge"
          style={{
            position: "fixed", bottom: dockBottom, right: 24, zIndex: 1305,
            opacity: show ? 0 : 1, pointerEvents: show ? "none" : "auto",
            transform: `scale(${show ? 0.55 : 1})`,
            transition: "opacity .26s ease, transform .42s cubic-bezier(.34,1.3,.5,1)",
            width: 58, height: 58, padding: 0, cursor: "pointer", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
            background: "var(--lex-acrylic-pill)", backdropFilter: "blur(34px) saturate(1.7)", WebkitBackdropFilter: "blur(34px) saturate(1.7)",
            border: "1px solid var(--lex-acrylic-border)",
            // the rotating gold light is the .lex-aura-edge ::before (crm-theme.css)
            boxShadow: "0 12px 28px rgba(2,13,37,0.34), 0 2px 6px rgba(2,13,37,0.22), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
          onMouseEnter={(e) => { if (!show) e.currentTarget.style.transform = "scale(1.08)" }}
          onMouseLeave={(e) => { if (!show) e.currentTarget.style.transform = "scale(1)" }}
        >
          <span aria-hidden="true" className="lex-icon-glow" style={{ position: "absolute", inset: "20%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,161,71,0.85), rgba(192,161,71,0) 70%)", filter: "blur(5px)", pointerEvents: "none" }} />
          <Icon name="sparkles" size={26} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          {overdue && overdue.count > 0 && (
            <span title={`${overdue.count} honorários vencidos`} style={{ position: "absolute", top: 1, right: 1, zIndex: 2, width: 14, height: 14, borderRadius: "50%", background: "var(--fin-neg,#C0492F)", border: "2.5px solid var(--bg)" }} />
          )}
        </button>
      )}

      {/* FLOATING PANEL (open, default/center dock) — right-anchored; grows out of
          the orb (transform-origin bottom-right: scale + slide + fade). Non-modal:
          NO dim backdrop, so the page stays usable behind it (design rule). */}
      {showPanel && (
        <div
          className="crm-scope"
          {...dragSurface}
          style={{
            position: "fixed", top: TOPBAR_H + 8, right: 16, bottom: dockBottom,
            width: "min(420px, calc(100% - 32px))", zIndex: 1305,
            display: "flex", flexDirection: "column", overflow: "hidden",
            transformOrigin: "100% 100%",
            transform: show ? "none" : "translateY(18px) scale(0.96)",
            opacity: show ? 1 : 0,
            transition: "transform .42s cubic-bezier(.34,1.26,.5,1), opacity .26s ease",
            background: "var(--lex-acrylic)", backdropFilter: "var(--lex-blur)", WebkitBackdropFilter: "var(--lex-blur)",
            border: "1px solid var(--lex-acrylic-border)", borderRadius: 16,
            boxShadow: "0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24), inset 0 1px 0 rgba(255,255,255,0.16)",
          }}
        >
          {auroraEl}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {dockHeader}
            {bodyEl}
            {inputRow(true)}
          </div>
          {dropOverlay}
        </div>
      )}

      {/* RIGHT-SNAP SIDEBAR (pinned) — kept: pinned to the right below the topbar,
          non-modal. The shell reflows the page content to make room. */}
      {sidebar && show && (
        <div
          className="crm-scope lex-rightdock-in"
          {...dragSurface}
          style={{
            position: "fixed", top: TOPBAR_H, right: 0, bottom: 0, width: 408, zIndex: 1200,
            display: "flex", flexDirection: "column", overflow: "hidden",
            background: "var(--lex-acrylic-strong)", backdropFilter: "var(--lex-blur)", WebkitBackdropFilter: "var(--lex-blur)",
            borderLeft: "1px solid var(--lex-acrylic-border)",
            boxShadow: "var(--lex-glass-shadow), -14px 0 40px rgba(2,13,37,0.16)",
          }}
        >
          {dockHeader}
          {bodyEl}
          {inputRow(true)}
          {dropOverlay}
        </div>
      )}
    </>
  )
}
