"use client"

// LexIA · Spotlight (⌘K) — paleta de comando acrílica (estilo Raycast/Apple).
// Dupla função: busca de entidades/ações E iniciar conversa com a IA. Input é
// <textarea> auto-crescente. Escolher uma sugestão de IA / "Perguntar" fecha o
// spotlight e abre o chat (via onAskAI). Ações/navegação apenas fecham e roteiam.
// Reusa a busca real (searchAll), as conversas recentes e as sugestões por página.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { crmMoney, crmDate } from "@/components/crm/crm-fmt"
import { searchAll, lexiaConversas } from "@/components/crm/crm-api"
import type { CrmNav, LexiaConversaRow, SearchResults } from "@/components/crm/crm-types"
import { contextChips, contextPlaceholder } from "./Suggestions"
import { AutoTextarea, Sparkle, SparkleChip } from "./LexiaKit"
import { lexGlass } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
const EMPTY: SearchResults = { q: "", clientes: [], casos: [], processos: [], partes: [], contratos: [], tarefas: [], lancamentos: [] }

interface SpItem {
  id: string
  sparkle?: boolean
  icon?: CrmIconName
  tone?: string
  title: string
  sub?: string
  badge?: string
  run: () => void
  _idx?: number
}
interface SpGroup {
  key: string
  label: string
  collapsible?: boolean
  items: SpItem[]
}

export interface LexiaSpotlightProps {
  seed?: string
  page: string
  clienteId?: number
  nav: CrmNav
  onNavigate: (href: string) => void
  onAction: (kind: string) => void
  /** abre o chat já enviando o prompt (sugestão de IA / "Perguntar") */
  onAskAI: (prompt: string) => void
  /** abre o chat carregando uma conversa existente */
  onOpenConversa: (id: number) => void
  onClose: () => void
}

function SpRow({ item, active, onHover, onRun }: { item: SpItem; active: boolean; onHover: () => void; onRun: () => void }) {
  return (
    <div data-idx={item._idx} onMouseEnter={onHover} onClick={onRun} className={"lx-sp-row" + (active ? " is-active" : "")}>
      {active && <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: "0 3px 3px 0", background: "var(--accent-strong)" }} />}
      {item.sparkle ? (
        <SparkleChip size={34} />
      ) : (
        <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-sunken)", color: item.tone || "var(--text-muted)" }}>
          <Icon name={item.icon ?? "circleDot"} size={16} strokeWidth={1.8} />
        </span>
      )}
      <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</span>
        {item.sub && <span style={{ fontSize: 12.5, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>{item.sub}</span>}
      </span>
      {item.badge && <kbd className="crm-kbd" style={{ flexShrink: 0 }}>{item.badge}</kbd>}
      {active && <span style={{ flexShrink: 0, color: "var(--accent)", display: "flex" }}><Icon name="arrowRight" size={14} /></span>}
    </div>
  )
}

export function LexiaSpotlight({ seed = "", page, clienteId, nav, onNavigate, onAction, onAskAI, onOpenConversa, onClose }: LexiaSpotlightProps) {
  const [q, setQ] = useState(seed)
  const [sel, setSel] = useState(0)
  const [recentsOpen, setRecentsOpen] = useState(false)
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [conversas, setConversas] = useState<LexiaConversaRow[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const nq = norm(q.trim())

  useEffect(() => {
    lexiaConversas().then(setConversas).catch(() => {})
  }, [])

  // busca ao vivo (q ≥ 2)
  useEffect(() => {
    if (q.trim().length < 2) { setResults(EMPTY); return }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await searchAll(q.trim())
        if (!cancelled) setResults(r)
      } catch {
        if (!cancelled) setResults(EMPTY)
      }
    }, 160)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])

  const close = onClose
  const runAI = useCallback((prompt: string) => { onAskAI(prompt); close() }, [onAskAI, close])

  const groups = useMemo<SpGroup[]>(() => {
    const g: SpGroup[] = []
    if (!nq) {
      g.push({
        key: "ia",
        label: "Sugestões da LexIA",
        items: contextChips(page, clienteId != null).map((s, i) => ({ id: `ia-${i}`, sparkle: true, title: s, run: () => runAI(s) })),
      })
      g.push({
        key: "rec",
        label: "__recents",
        collapsible: true,
        items: recentsOpen
          ? [
              ...conversas.slice(0, 5).map((c) => ({
                id: `rec-${c.id}`,
                icon: "history" as CrmIconName,
                title: c.titulo || "Conversa sem título",
                sub: crmDate(c.atualizadaEm),
                run: () => { onOpenConversa(c.id); close() },
              })),
              { id: "rec-all", icon: "clock" as CrmIconName, title: "Ver histórico completo", run: () => { onNavigate("/lexia"); close() } },
            ]
          : [],
      })
      g.push({
        key: "act",
        label: "Ações rápidas",
        items: [
          { id: "novo-cliente", icon: "user", title: "Novo cliente", sub: "Cadastrar PF ou PJ", run: () => { onAction("novo-cliente"); close() } },
          { id: "nova-tarefa", icon: "listChecks", title: "Nova tarefa", sub: "Criar tarefa", run: () => { onAction("nova-tarefa"); close() } },
          { id: "novo-lancamento", icon: "banknote", title: "Novo lançamento", sub: "Honorário ou despesa", run: () => { onAction("novo-lancamento"); close() } },
          { id: "novo-evento", icon: "calendar", title: "Novo evento", sub: "Audiência, prazo ou reunião", run: () => { onAction("novo-evento"); close() } },
        ],
      })
      g.push({
        key: "go",
        label: "Ir para",
        items: [
          { id: "g-ini", icon: "home", title: "Início", run: () => { onNavigate("/"); close() } },
          { id: "g-cli", icon: "users", title: "Contatos", run: () => { nav.navPage("clientes"); close() } },
          { id: "g-cas", icon: "briefcase", title: "Casos", run: () => { nav.navPage("casos"); close() } },
          { id: "g-con", icon: "receipt", title: "Contratos", run: () => { nav.navPage("contratos"); close() } },
          { id: "g-fin", icon: "wallet", title: "Financeiro", run: () => { onNavigate("/financeiro"); close() } },
        ],
      })
      return g
    }
    // com texto: perguntar à LexIA + resultados de busca por tipo
    g.push({
      key: "ask",
      label: "Perguntar à LexIA",
      items: [{ id: "ask", sparkle: true, title: `“${q.trim()}”`, sub: "Iniciar conversa com a LexIA", badge: "Enter", run: () => runAI(q.trim()) }],
    })
    const clientes = results.clientes.slice(0, 4).map((c) => ({
      id: `cli-${c.id}`,
      icon: (c.tipo === "pj" ? "building" : "user") as CrmIconName,
      title: c.nome,
      sub: `${c.tipo.toUpperCase()} · ${c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "cliente"} · ${c.numCasos} caso${c.numCasos === 1 ? "" : "s"}`,
      run: () => { nav.openCliente(c.id); close() },
    }))
    const casos = results.casos.slice(0, 3).map((k) => ({
      id: `cas-${k.id}`,
      icon: "briefcase" as CrmIconName,
      title: k.titulo,
      sub: [k.cliente, k.numeroProcesso, k.status].filter(Boolean).join(" · ") || "caso",
      run: () => { nav.openCaso(k.id); close() },
    }))
    const contratos = results.contratos.slice(0, 3).map((c) => ({
      id: `con-${c.id}`,
      icon: "receipt" as CrmIconName,
      title: c.descricao,
      sub: `${c.cliente ? `${c.cliente} · ` : ""}${crmMoney(c.valorCents)}`,
      run: () => { nav.openContrato(c.id); close() },
    }))
    const tarefas = results.tarefas.slice(0, 3).map((t) => ({
      id: `tar-${t.id}`,
      icon: "listChecks" as CrmIconName,
      title: t.titulo,
      sub: `P${t.prio}${t.prazo ? ` · ${crmDate(t.prazo)}` : ""}`,
      run: () => { onNavigate("/tarefas"); close() },
    }))
    if (clientes.length) g.push({ key: "k-cli", label: "Contatos", items: clientes })
    if (casos.length) g.push({ key: "k-cas", label: "Casos", items: casos })
    if (contratos.length) g.push({ key: "k-con", label: "Contratos", items: contratos })
    if (tarefas.length) g.push({ key: "k-tar", label: "Tarefas", items: tarefas })
    return g
  }, [nq, q, page, clienteId, recentsOpen, conversas, results, runAI, onAction, onNavigate, onOpenConversa, nav, close])

  // índice plano p/ navegação por teclado
  let i = -1
  groups.forEach((grp) => grp.items.forEach((it) => { it._idx = ++i }))
  const flat = useMemo(() => groups.flatMap((grp) => grp.items), [groups])

  useEffect(() => { setSel(0) }, [nq, recentsOpen])
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [sel])

  const onKeyDownExtra = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { e.preventDefault(); close() }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const it = flat[sel] || flat[0]
      if (it) it.run()
      else if (q.trim()) runAI(q.trim())
    }
  }

  return (
    <div
      className="crm-scope lex-back"
      onMouseDown={close}
      style={{ position: "fixed", inset: 0, zIndex: 1400, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "11vh", background: "var(--overlay)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
    >
      <div
        className={`crm-pop-in ${lexGlass}`}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 640, maxWidth: "92%", maxHeight: "72vh", display: "flex", flexDirection: "column",
          borderRadius: 18,
          transformOrigin: "center top",
          ...glassElevation("0 40px 100px rgba(2,13,37,0.5), 0 10px 30px rgba(2,13,37,0.34)"),
        }}
      >
        {/* input */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 13, padding: "16px 16px 14px 18px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ marginTop: 3, flexShrink: 0 }}><Sparkle size={20} /></span>
          <AutoTextarea
            value={q}
            onChange={setQ}
            autoFocus
            maxHeight={120}
            placeholder={contextPlaceholder(page, clienteId != null)}
            onKeyDownExtra={onKeyDownExtra}
            onSubmit={() => { const it = flat[sel] || flat[0]; if (it) it.run(); else if (q.trim()) runAI(q.trim()) }}
            style={{ flex: 1, border: "none", outline: "none", resize: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 17, lineHeight: 1.45, color: "var(--text)", letterSpacing: "-0.01em", padding: "1px 0" }}
          />
          <kbd className="crm-kbd" style={{ marginTop: 4, flexShrink: 0 }}>esc</kbd>
        </div>

        {/* lista */}
        <div ref={listRef} style={{ overflowY: "auto", padding: "8px 8px 10px" }}>
          {flat.length === 0 && (
            <div style={{ padding: "30px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Nenhum resultado para “{q.trim()}”</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 5 }}>Pressione Enter para perguntar à LexIA.</div>
            </div>
          )}
          {groups.map((grp) => {
            if (grp.collapsible) {
              return (
                <div key={grp.key}>
                  <button
                    onClick={() => setRecentsOpen((s) => !s)}
                    aria-expanded={recentsOpen}
                    style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-subtle)", padding: "12px 12px 5px" }}
                  >
                    <span>Conversas recentes</span>
                    <Icon name="chevronDown" size={13} style={{ transform: recentsOpen ? "none" : "rotate(-90deg)", transition: "transform .16s", color: "var(--text-subtle)" }} />
                  </button>
                  {recentsOpen && grp.items.map((it) => (
                    <SpRow key={it.id} item={it} active={it._idx === sel} onHover={() => setSel(it._idx ?? 0)} onRun={it.run} />
                  ))}
                </div>
              )
            }
            return (
              <div key={grp.key} style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-subtle)", padding: "10px 12px 5px" }}>{grp.label}</div>
                {grp.items.map((it) => (
                  <SpRow key={it.id} item={it} active={it._idx === sel} onHover={() => setSel(it._idx ?? 0)} onRun={it.run} />
                ))}
              </div>
            )
          })}
        </div>

        {/* rodapé */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "9px 16px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-subtle)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><kbd className="crm-kbd">↑</kbd><kbd className="crm-kbd">↓</kbd> navegar</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><kbd className="crm-kbd">↵</kbd> selecionar</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><kbd className="crm-kbd">esc</kbd> fechar</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontWeight: 500 }}><Sparkle size={13} /> LexIA</span>
        </div>
      </div>
    </div>
  )
}
