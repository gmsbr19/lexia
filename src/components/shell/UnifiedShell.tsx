"use client"

// LexIA — unified app shell (new design) for EVERY route. Rendered once by the
// root layout so it persists across navigations: sidebar + topbar with history
// arrows + a route-based tab strip + a per-page actions slot, plus the global AI
// surfaces (LexIA orb/popup, Spotlight ⌘K, Settings). Each route renders its
// content in the content area; there is no per-pane split (route-tabs model).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { apiSend } from "@/lib/client/api"
import { useAnyModalOpen } from "@/lib/client/modal-guard"
import { useBottomInset } from "@/lib/client/bottom-inset"
import { useTheme } from "@/components/theme/ThemeProvider"
import { Icon } from "@/components/crm/crm-icons"
import { crmInitials } from "@/components/crm/crm-fmt"
import { CrmToastHost } from "@/components/crm/crm-kit"
import { useCrmChrome } from "@/components/crm/crm-chrome-store"
import { CrmSettings } from "@/components/crm/overlays/CrmSettings"
import { LexiaChat } from "@/components/lexia/LexiaChat"
import { LexiaSpotlight } from "@/components/lexia/LexiaSpotlight"
import { Orb } from "@/components/lexia/LexiaKit"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { NotificacoesBell } from "./NotificacoesBell"
import { NotificacoesStream } from "./NotificacoesStream"
import { NotificacoesToasts } from "./NotificacoesToasts"
import { CrmAnonimizar } from "@/components/crm/pages/CrmQuickModals"
import { verFinanceiro } from "@/lib/users/types"
import { useModulosStore, processosHabilitado } from "@/lib/modulos/store"
import type { ClienteRow } from "@/lib/finance/types"
import type { CrmDataset, CrmNav, CrmPage, Role } from "@/components/crm/crm-types"
import { useTabs } from "./tabs-store"
import { SIDEBAR, activeNavId, metaForPath } from "./unified-nav"
import { useAreasStore } from "@/lib/areas/store"

function emptyDataset(clientes: ClienteRow[], role: Role, userName: string, userEmail: string): CrmDataset {
  return { clientes, casos: [], contratos: [], socios: [], clienteOptions: [], casoOptions: [], contaOptions: [], role, userName, userEmail }
}

const CHAT_SIDEBAR_W = 412 // keep in sync with the LexiaChat sidebar-mode width
const CHAT_MODE_KEY = "lexia-chat-mode"

// ───────────────────────── sidebar ─────────────────────────
function Sidebar({
  collapsed,
  activeId,
  role,
  processosOk,
  onNav,
  onOpenBar,
  onOpenSettings,
  userName,
  userEmail,
  dark,
  onToggleTheme,
}: {
  collapsed: boolean
  activeId: string
  processosOk: boolean
  role: Role
  onNav: (href: string, newTab: boolean) => void
  onOpenBar: () => void
  onOpenSettings: () => void
  userName: string
  userEmail: string
  dark: boolean
  onToggleTheme: () => void
}) {
  return (
    <aside style={{ width: collapsed ? 64 : 234, background: "var(--bg-soft)", borderRight: "1px solid var(--border)", padding: "14px 12px 16px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, transition: "width .2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px 14px", minHeight: 34 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #C0A147 0%, #9a7f2e 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)", flexShrink: 0 }}>
          <span style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 14, color: "#020D25" }}>L</span>
        </div>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontWeight: 500, fontSize: 16, letterSpacing: "-0.02em", color: "var(--text)" }}>Lex</span>
            <span style={{ fontWeight: 500, fontSize: 16, letterSpacing: "-0.02em", color: "var(--accent)" }}>IA</span>
          </div>
        )}
      </div>

      {!collapsed ? (
        <button onClick={onOpenBar} style={{ position: "relative", marginBottom: 10, width: "100%", height: 34, borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "0 10px 0 32px", color: "var(--text-subtle)", fontSize: 12, fontFamily: "var(--font-sans)", textAlign: "left" }}>
          <span style={{ position: "absolute", left: 10 }}><Icon name="search" size={14} /></span>
          Buscar…
          <span style={{ marginLeft: "auto", fontSize: 11, background: "var(--bg-sunken)", padding: "2px 6px", borderRadius: 6, fontFamily: "var(--font-mono)" }}>⌘K</span>
        </button>
      ) : (
        <button onClick={onOpenBar} title="Buscar" style={{ marginBottom: 8, width: 40, height: 36, margin: "0 auto 8px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="search" size={15} />
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {SIDEBAR.filter((n) => !(n.socioPlus && !verFinanceiro(role)) && !(n.id === "processos" && !processosOk)).map((n) => {
          const active = activeId === n.id
          return (
            <button
              key={n.id}
              onClick={(e) => onNav(n.href, e.metaKey || e.ctrlKey)}
              title={collapsed ? n.label : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                padding: collapsed ? "9px" : "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? "var(--accent-soft)" : "transparent", color: active ? "var(--accent)" : "var(--text-muted)",
                fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em", fontFamily: "var(--font-sans)",
                justifyContent: collapsed ? "center" : "flex-start", transition: "background .12s, color .12s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--surface-hover)" }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent" }}
            >
              <Icon name={n.icon} size={17} strokeWidth={active ? 2 : 1.75} />
              {!collapsed && <span style={{ flex: 1 }}>{n.label}</span>}
              {!collapsed && n.badge != null && (
                <span style={{ fontSize: 11, fontWeight: 500, background: active ? "var(--accent-soft)" : "var(--bg-sunken)", color: active ? "var(--accent)" : "var(--text-muted)", padding: "1px 7px", borderRadius: 999, fontVariantNumeric: "tabular-nums" }}>{n.badge}</span>
              )}
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: "auto" }}>
        <button
          onClick={onOpenSettings}
          title={collapsed ? "Configurações" : undefined}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: collapsed ? "9px" : "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "var(--text-muted)", fontSize: 14, fontWeight: 500, fontFamily: "var(--font-sans)", justifyContent: collapsed ? "center" : "flex-start" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
        >
          <Icon name="settings" size={17} />
          {!collapsed && <span>Configurações</span>}
        </button>
        <SidebarUser name={userName} email={userEmail} role={role} collapsed={collapsed} dark={dark} onToggleTheme={onToggleTheme} />
      </div>
    </aside>
  )
}

// ───────────────────────── topbar ─────────────────────────
function IconBtn({ icon, title, onClick, disabled, dot }: { icon: string; title: string; onClick?: () => void; disabled?: boolean; dot?: boolean }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: "var(--text-muted)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "var(--surface-hover)" }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
    >
      <Icon name={icon} size={16} />
      {dot && <span style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--brand-gold)" }} />}
    </button>
  )
}

// ───────────────────────── sidebar user card (→ upward dropdown) ─────────────────────────
function SidebarUser({ name, email, role, dark, collapsed, onToggleTheme }: { name: string; email: string; role: Role; collapsed: boolean; dark: boolean; onToggleTheme: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const initials = crmInitials(name || email || "?")
  const roleLabel = role === "admin" ? "Administrador" : role === "socio" ? "Sócio" : "Equipe"
  const avatar = (
    <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "#020D25", color: "#C0A147", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>
      {initials}
    </div>
  )
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={collapsed ? name || email : undefined}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: collapsed ? 7 : "8px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", justifyContent: collapsed ? "center" : "flex-start", marginTop: 6 }}
      >
        {avatar}
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || "Usuário"}</div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{roleLabel}</div>
          </div>
        )}
        {!collapsed && <Icon name="chevronDown" size={14} style={{ color: "var(--text-subtle)", transform: "rotate(180deg)" }} />}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1190 }} />
          <div className={`card ${lexGlassStrong}`} style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 8, zIndex: 1191, width: 232, padding: 6, ...glassElevation("0 12px 28px rgba(2,13,37,0.16)") }}>
            <div style={{ padding: "8px 10px 10px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || "Usuário"}</div>
              {email && <div style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>}
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "2px 6px 6px" }} />
            <div style={{ padding: "2px 10px 6px", fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tema</div>
            <div style={{ display: "flex", gap: 6, padding: "0 6px 6px" }}>
              <button
                onClick={() => { if (dark) onToggleTheme() }}
                style={{ flex: 1, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 500, fontFamily: "var(--font-sans)", border: `1px solid ${!dark ? "var(--accent)" : "var(--border-strong)"}`, background: !dark ? "var(--accent-soft)" : "var(--surface)", color: !dark ? "var(--accent)" : "var(--text-muted)" }}
              >
                <Icon name="sun" size={14} />Claro
              </button>
              <button
                onClick={() => { if (!dark) onToggleTheme() }}
                style={{ flex: 1, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 500, fontFamily: "var(--font-sans)", border: `1px solid ${dark ? "var(--accent)" : "var(--border-strong)"}`, background: dark ? "var(--accent-soft)" : "var(--surface)", color: dark ? "var(--accent)" : "var(--text-muted)" }}
              >
                <Icon name="moon" size={14} />Escuro
              </button>
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "2px 6px 4px" }} />
            <button onClick={() => signOut({ redirect: false }).then(() => router.push("/login"))} className="fx-menu-item" style={{ color: "var(--fin-neg,#C0492F)" }}>
              <Icon name="logout" size={15} />Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function UnifiedShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const { dark, toggleDark } = useTheme()
  const { spotlight, spotlightSeed, chat, chatAsk, settings, openSpotlight, toggleSpotlight, closeSpotlight, openChat, askChat, openConversa, closeChat, openSettings, close } =
    useCrmChrome()
  const anyModalOpen = useAnyModalOpen()
  const bottomInset = useBottomInset()
  const { tabs, activeId, hydrated, hydrate, markPendingNew, reconcile, setActive, close: closeTab } = useTabs()

  const [collapsed, setCollapsed] = useState(false)
  const [me, setMe] = useState<{ nome: string; email: string; role: Role } | null>(null)
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [anon, setAnon] = useState(false)
  const [overdue, setOverdue] = useState<{ count: number; totalCents: number } | null>(null)
  // LexIA chat layout (flutuante / barra lateral / tela cheia), persisted.
  const [chatMode, setChatMode] = useState<"float" | "sidebar" | "full">("float")
  useEffect(() => {
    try {
      const v = localStorage.getItem(CHAT_MODE_KEY)
      if (v === "float" || v === "sidebar" || v === "full") setChatMode(v)
    } catch {
      /* ignore */
    }
  }, [])
  const changeChatMode = useCallback((m: "float" | "sidebar" | "full") => {
    setChatMode(m)
    try {
      localStorage.setItem(CHAT_MODE_KEY, m)
    } catch {
      /* ignore */
    }
  }, [])

  // Páginas públicas sem shell (login + página de ativação do convite).
  const isLogin = pathname === "/login" || pathname.startsWith("/definir-senha")

  useEffect(() => {
    if (isLogin) return
    let alive = true
    apiSend<{ nome: string; email: string; role: Role }>("/api/users/me", "GET")
      .then((u) => { if (alive) setMe(u) })
      .catch(() => {})
    return () => { alive = false }
  }, [isLogin])

  useEffect(() => { hydrate() }, [hydrate])

  const loadAreas = useAreasStore((s) => s.load)
  useEffect(() => { if (!isLogin) void loadAreas() }, [isLogin, loadAreas])

  const modulos = useModulosStore((s) => s.modulos)
  const loadModulos = useModulosStore((s) => s.load)
  useEffect(() => { if (!isLogin) void loadModulos() }, [isLogin, loadModulos])
  const processosOk = processosHabilitado(modulos)

  // ⌘K toggles the Spotlight (the command palette)
  useEffect(() => {
    if (isLogin) return
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        toggleSpotlight()
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [isLogin, toggleSpotlight])

  // proactive overdue snapshot for the bar's pulsing hint (sócio+; best-effort)
  useEffect(() => {
    if (isLogin || !me || me.role === "staff") return
    let alive = true
    apiSend<{ count: number; totalCents: number }>("/api/financeiro/alertas", "GET")
      .then((r) => { if (alive) setOverdue(r) })
      .catch(() => {})
    return () => { alive = false }
  }, [isLogin, me])

  // reconcile the active tab with the current route (reuse vs new tab)
  useEffect(() => {
    if (isLogin || !hydrated) return
    const meta = metaForPath(pathname)
    reconcile(pathname, meta.label, meta.icon)
  }, [pathname, hydrated, isLogin, reconcile])

  const openAnon = useCallback(() => {
    if (clientes.length === 0) apiSend<ClienteRow[]>("/api/clientes", "GET").then(setClientes).catch(() => {})
    setAnon(true)
  }, [clientes.length])

  const role: Role = me?.role ?? "staff"
  const nav: CrmNav = useMemo(
    () => ({
      navPage: (page: CrmPage) => router.push(`/${page}`),
      openCliente: (id: number) => router.push(`/clientes/${id}`),
      openClienteTab: (id: number) => router.push(`/clientes/${id}`),
      openCaso: (id: number) => router.push(`/processos?view=processos&caso=${id}`),
      openContrato: (id: number) => router.push(`/contratos?contrato=${id}`),
      openProcesso: (id: number) => router.push(`/processos/${id}`),
    }),
    [router],
  )
  const action = (kind: string) => {
    if (kind === "novo-cliente") router.push("/clientes?new=cliente")
    else if (kind === "nova-tarefa") router.push("/tarefas")
    else if (kind === "novo-lancamento") router.push("/financeiro")
    else if (kind === "novo-evento") router.push("/agenda")
  }

  if (isLogin) return <>{children}</>

  const onNav = (href: string, newTab: boolean) => {
    if (newTab) markPendingNew() // ⌘/Ctrl+click → open in a new tab
    router.push(href)
  }
  const onCloseTab = (id: string) => {
    const next = closeTab(id)
    if (next) router.push(next) // the active tab was closed → go to its neighbor
  }

  const page = pathname.split("/")[1] || "inicio"
  const clienteMatch = pathname.match(/^\/clientes\/(\d+)/)
  const clienteId = clienteMatch ? Number(clienteMatch[1]) : undefined
  const dataset = emptyDataset(clientes, role, me?.nome ?? "", me?.email ?? "")
  const visibleTabs = hydrated ? tabs : []

  // The launcher orb is hidden on routes whose AI surface lives elsewhere (the
  // editor side panel, the full /lexia page), whenever the chat/spotlight is open
  // (they replace it), and whenever any modal is open (it floats above modals).
  const routePillHidden =
    pathname.startsWith("/documents/doc") || pathname.startsWith("/lexia")
  const orbHidden = chat || spotlight || routePillHidden || anyModalOpen

  // When the LexIA chat is in sidebar mode (open), reflow the page content so it
  // stays clickable beside the non-modal chat sidebar.
  const reflowRight = chat && chatMode === "sidebar" ? CHAT_SIDEBAR_W : 0
  const greetingName = (me?.nome ?? "").split(" ")[0] || "você"
  const dockBottom = bottomInset > 0 ? bottomInset + 16 : 24

  return (
    <div className="crm-scope" style={{ height: "100dvh", display: "flex", overflow: "hidden", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)", letterSpacing: "-0.01em" }}>
      <CrmToastHost>
        {/* tempo real: assina o SSE → store/sino + popup acrílico (canto sup. direito) */}
        {me?.email && <NotificacoesStream />}
        <NotificacoesToasts />
        <Sidebar
          collapsed={collapsed}
          activeId={activeNavId(pathname)}
          role={role}
          processosOk={processosOk}
          onNav={onNav}
          onOpenBar={() => openSpotlight()}
          onOpenSettings={openSettings}
          userName={me?.nome ?? ""}
          userEmail={me?.email ?? ""}
          dark={dark}
          onToggleTheme={toggleDark}
        />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* topbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", minHeight: 56, borderBottom: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0 }}>
            <IconBtn icon="sidebar" title="Recolher menu" onClick={() => setCollapsed((c) => !c)} />
            <IconBtn icon="chevronLeft" title="Voltar" onClick={() => window.history.back()} />
            <IconBtn icon="chevronRight" title="Avançar" onClick={() => window.history.forward()} />

            {/* route tab strip */}
            <div className="crm-tabscroll" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 4, overflowX: "auto", overflowY: "hidden", paddingLeft: 4 }}>
              {visibleTabs.map((t) => {
                const active = t.id === activeId
                return (
                  <div
                    key={t.id}
                    className={"crm-tab" + (active ? " active" : "")}
                    title={t.label}
                    onMouseDown={(e) => { if (e.button === 0) { setActive(t.id); router.push(t.href) } }}
                    onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onCloseTab(t.id) } }}
                  >
                    <Icon name={t.icon} size={14} strokeWidth={active ? 2 : 1.75} style={{ flexShrink: 0, color: active ? "var(--accent)" : "inherit" }} />
                    <span className="crm-tab-label">{t.label}</span>
                    <span className="crm-tab-x" role="button" aria-label="Fechar aba" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onCloseTab(t.id) }}>
                      <Icon name="x" size={12} />
                    </span>
                  </div>
                )
              })}
            </div>

            <NotificacoesBell />
          </div>

          {/* content — reflows left when the LexIA chat is in sidebar mode */}
          <div style={{ flex: 1, overflow: "auto", minHeight: 0, background: "var(--bg)", paddingRight: reflowRight, transition: "padding .2s ease" }}>{children}</div>
        </main>

        {/* LexIA · orbe lançador — abre/minimiza o chat (canto inf. direito) */}
        {!orbHidden && (
          <button
            onClick={openChat}
            aria-label="Abrir LexIA"
            className="crm-scope"
            style={{
              position: "fixed", bottom: dockBottom, right: 24, zIndex: 1305,
              width: 58, height: 58, padding: 0, border: "none", background: "transparent", cursor: "pointer", borderRadius: "50%",
              transition: "transform .2s cubic-bezier(.34,1.3,.5,1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.06)" }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none" }}
          >
            <Orb size={58} glow />
            {overdue && overdue.count > 0 && (
              <span title={`${overdue.count} honorários vencidos`} style={{ position: "absolute", top: 2, right: 2, zIndex: 4, width: 14, height: 14, borderRadius: "50%", background: "var(--fin-neg,#C0492F)", border: "2.5px solid var(--bg)" }} />
            )}
          </button>
        )}

        {/* LexIA · chat IA (sempre montado p/ preservar a conversa; null quando fechado) */}
        <LexiaChat
          open={chat}
          greetingName={greetingName}
          page={page}
          clienteId={clienteId}
          nav={nav}
          onNavigate={(href) => router.push(href)}
          mode={chatMode}
          onModeChange={changeChatMode}
          askText={chatAsk.text}
          askConversaId={chatAsk.conversaId}
          askSeq={chatAsk.seq}
          bottomInset={bottomInset}
          onMinimize={closeChat}
        />

        {/* LexIA · Spotlight (⌘K) — paleta de comando + iniciar conversa */}
        {spotlight && (
          <LexiaSpotlight
            seed={spotlightSeed}
            page={page}
            clienteId={clienteId}
            nav={nav}
            onNavigate={(href) => router.push(href)}
            onAction={action}
            onAskAI={(prompt) => askChat(prompt)}
            onOpenConversa={(id) => openConversa(id)}
            onClose={closeSpotlight}
          />
        )}

        {/* global overlays */}
        {settings && (
          <CrmSettings role={role} realRole={role} dark={dark} onToggleTheme={toggleDark} userName={me?.nome ?? ""} userEmail={me?.email ?? ""} onClose={() => close("settings")} onAnonimizar={openAnon} dataset={dataset} />
        )}
        {anon && <CrmAnonimizar dataset={dataset} onClose={() => setAnon(false)} onRefresh={() => router.refresh()} />}
      </CrmToastHost>
    </div>
  )
}
