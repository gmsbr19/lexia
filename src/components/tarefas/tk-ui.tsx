"use client"

// Tarefas — primitivas de interface (escala dos demais módulos). Popovers e
// menus são renderizados em PORTAL com position:fixed a partir do gatilho e
// VIRAM PARA CIMA quando não cabem abaixo — nunca são cortados por áreas com
// rolagem. Sem textos de ajuda: tooltips só nomeiam botões de ícone.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { pendentes, rotuloPrazo, vencida, type Selo } from "@/lib/tarefas/regras"
import type { TaskRow } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { useTk } from "./tk-context"
import { ELEVACAO_JANELA, ELEVACAO_MENU, TK_JANELA, TK_MENU } from "./tk-glass"

export function TkDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }}
    />
  )
}

/** "● Alfa · Protocolo 02 · 1º RI Taubaté" — uma linha; só o grupo trunca. */
export function TkProjTag({
  projetoId,
  grupo,
  strong,
  size = 12,
}: {
  projetoId: number | null
  grupo?: string | null
  strong?: boolean
  size?: number
}) {
  const { projeto } = useTk()
  const p = projeto(projetoId)
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, fontSize: size, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
      <TkDot color={p ? p.cor : "var(--text-subtle)"} />
      <span style={{ fontWeight: 500, color: strong ? "var(--text)" : "var(--text-muted)", flexShrink: 0 }}>
        {p ? p.nomeCurto : "Sem projeto"}
      </span>
      {grupo && (
        <span title={grupo} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
          · {grupo}
        </span>
      )}
    </span>
  )
}

export function TkIconBtn({
  icon,
  title,
  onClick,
  size = 16,
  active,
  style,
  btnRef,
}: {
  icon: TfIconName
  title: string
  onClick?: (e: React.MouseEvent) => void
  size?: number
  active?: boolean
  style?: CSSProperties
  btnRef?: RefObject<HTMLButtonElement | null>
}) {
  return (
    <button
      ref={btnRef}
      type="button"
      className="tk-iconbtn"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{ color: active ? "var(--accent)" : undefined, ...style }}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

/**
 * Popover ancorado a um elemento: portal + fixed, inverte para cima se não couber,
 * fecha ao clicar fora / Esc (Esc fecha só o popover, não a janela por trás).
 */
export function TkPop({
  open,
  onClose,
  anchor,
  children,
  align = "left",
  width = 220,
  up,
  alto,
}: {
  open: boolean
  onClose: () => void
  anchor: HTMLElement | null
  children: ReactNode
  align?: "left" | "right"
  width?: number
  up?: boolean
  /** Conteúdo de altura fixa (calendário): sem o teto de 480px, só o da janela. */
  alto?: boolean
}) {
  const { portal } = useTk()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const a = anchor
      const el = ref.current
      if (!a || !el) return
      const r = a.getBoundingClientRect()
      const h = el.offsetHeight
      const w = el.offsetWidth || width
      let left = align === "right" ? r.right - w : r.left
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
      let top = r.bottom + 4
      if (up || top + h > window.innerHeight - 8) {
        const acima = r.top - h - 4
        top = acima >= 8 ? acima : Math.max(8, window.innerHeight - h - 8)
      }
      el.style.left = `${left}px`
      el.style.top = `${top}px`
      el.style.visibility = "visible"
    }
    place()
    const ro = new ResizeObserver(place)
    if (ref.current) ro.observe(ref.current)
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open, up, align, width, anchor])

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor?.contains(t)) return
      closeRef.current()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.stopPropagation()
      closeRef.current()
    }
    const id = window.setTimeout(() => document.addEventListener("mousedown", down), 0)
    document.addEventListener("keydown", key, true)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener("mousedown", down)
      document.removeEventListener("keydown", key, true)
    }
  }, [open, anchor])

  if (!open || !portal) return null
  return createPortal(
    <div
      ref={ref}
      className={TK_MENU}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      style={{
        ...ELEVACAO_MENU,
        position: "fixed",
        left: -9999,
        top: -9999,
        visibility: "hidden",
        width,
        zIndex: 1200,
        borderRadius: "var(--r-md)",
        maxHeight: alto ? "calc(100vh - 16px)" : "min(480px, calc(100vh - 16px))",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* o vidro tem overflow:hidden (anel de brilho); quem rola é o miolo */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: 4, minHeight: 0, overflowY: "auto" }}>{children}</div>
    </div>,
    portal,
  )
}

/**
 * Gatilho + popover: estado de aberto e elemento-âncora. A âncora é o próprio
 * elemento clicado (`onClick={pop.toggle}` guarda `e.currentTarget`) — sem refs.
 */
export function usePop() {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const toggle = (e?: { currentTarget: EventTarget }) => {
    if (e?.currentTarget instanceof HTMLElement) setAnchor(e.currentTarget)
    setOpen((o) => !o)
  }
  return { open, anchor, toggle, close: () => setOpen(false) }
}

export function TkMenuItem({
  children,
  onClick,
  checked,
  disabled,
  icon,
  danger,
  dot,
  right,
}: {
  children: ReactNode
  onClick?: () => void
  checked?: boolean
  disabled?: boolean
  icon?: TfIconName
  danger?: boolean
  dot?: string
  right?: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="tk-menuitem"
      disabled={disabled}
      onClick={onClick}
      style={{ color: danger ? "var(--crit)" : undefined }}
    >
      {dot && <TkDot color={dot} />}
      {icon && <Icon name={icon} size={15} style={{ color: danger ? undefined : "var(--text-muted)", flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis" }}>{children}</span>
      {right}
      {checked && <Icon name="check" size={14} strokeWidth={2.2} style={{ color: "var(--accent)", flexShrink: 0 }} />}
    </button>
  )
}
export const TkMenuLabel = ({ children }: { children: ReactNode }) => <div className="tk-menulabel">{children}</div>
export const TkMenuSep = () => <div className="tk-menusep" />

export function TkSeg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; count?: number | null }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="tk-seg" role="tablist">
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          className={value === o.id ? "on" : ""}
          onClick={() => onChange(o.id)}
        >
          {o.label}
          {o.count != null && (
            <span className="tnum" style={{ color: "var(--text-muted)", marginLeft: 5 }}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function TkChip({
  active,
  onClick,
  onRemove,
  children,
}: {
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  children: ReactNode
}) {
  return (
    <span className={"tk-chip" + (active ? " on" : "")}>
      <button type="button" onClick={onClick} className="tk-chip-main">
        {children}
      </button>
      {onRemove && (
        <button type="button" className="tk-chip-x" title="Remover" aria-label="Remover" onClick={onRemove}>
          <Icon name="x" size={12} strokeWidth={2} />
        </button>
      )}
    </span>
  )
}

export const TOM_SELO = {
  late: { fg: "var(--crit)", icon: "alertCircle" as TfIconName },
  risk: { fg: "var(--warn)", icon: "alertTriangle" as TfIconName },
  // relógio é do PRAZO; espera usa outro ícone para não parecer uma segunda data
  wait: { fg: "var(--text-muted)", icon: "circleDot" as TfIconName },
}

/**
 * Pelo que a tarefa espera — nunca parecido com uma data: corrente + "Depois de
 * <tarefa> · <pessoa>" quando é uma ligação, pessoa + "Aguardando: <texto>"
 * quando é um terceiro. `caixa` = bloco destacado (cartão do quadro).
 */
export function TkEspera({ t, semPalavra, caixa }: { t: TaskRow; semPalavra?: boolean; caixa?: boolean }) {
  const { map, pessoa } = useTk()
  const cls = "tk-espera" + (caixa ? " caixa" : "")
  if (t.aguardandoTexto) {
    return (
      <div className={cls} title={`Aguardando: ${t.aguardandoTexto}`}>
        <Icon name="user" size={13} />
        <span className="tk-espera-txt">{semPalavra ? t.aguardandoTexto : `Aguardando: ${t.aguardandoTexto}`}</span>
      </div>
    )
  }
  const pend = pendentes(t, map)
  if (!pend.length) return null
  if (pend.length > 1) {
    return (
      <div className={cls} title={`Só começa depois de: ${pend.map((p) => p.titulo).join(" · ")}`}>
        <Icon name="link2" size={13} />
        <span className="tk-espera-txt">
          Depois de <strong>{pend.length} passos</strong>
        </span>
      </div>
    )
  }
  const p = pend[0]
  const quem = pessoa(p.responsavelId)?.first
  return (
    <div className={cls} title={`Só começa depois de: ${p.titulo}${quem ? ` (${quem})` : ""}`}>
      <Icon name="link2" size={13} />
      <span className="tk-espera-txt">
        Depois de <strong>{p.titulo}</strong>
        {quem ? ` · ${quem}` : ""}
      </span>
    </div>
  )
}

/** Linha de estado: texto pequeno com ícone, sem fundo. Vencida não aparece (a data já diz). */
export function TkState({
  selo,
  t,
  semPalavraAguardando,
  caixa,
}: {
  selo: Selo | null
  /** com a tarefa, a espera sai detalhada (ligação vs terceiro) em vez do rótulo pronto */
  t?: TaskRow
  semPalavraAguardando?: boolean
  caixa?: boolean
}) {
  if (!selo || selo.kind === "late") return null
  if (selo.kind === "wait" && t) return <TkEspera t={t} semPalavra={semPalavraAguardando} caixa={caixa} />
  const tom = TOM_SELO[selo.kind]
  const label = selo.kind === "wait" ? (semPalavraAguardando ? selo.label : `Aguardando: ${selo.label}`) : "Em risco"
  const title = selo.kind === "risk" ? selo.motivo : label
  return (
    <div className="tk-state" style={{ color: tom.fg }} title={title}>
      <Icon name={tom.icon} size={13} />
      <span>{label}</span>
    </div>
  )
}

export function TkDue({ t }: { t: Pick<TaskRow, "prazo" | "status" | "prazoFatal"> }) {
  const { hoje } = useTk()
  const done = t.status === "done"
  const late = vencida(t, hoje)
  const today = !done && t.prazo === hoje
  const rel = rotuloPrazo(t.prazo, hoje)
  if (t.prazoFatal && !done) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          height: 18,
          padding: "0 5px",
          borderRadius: 4,
          border: "1px solid var(--crit)",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--crit)",
          whiteSpace: "nowrap",
        }}
      >
        <Icon name="flag" size={11} strokeWidth={2} />
        Prazo fatal · {rel}
      </span>
    )
  }
  const color = late ? "var(--crit)" : today ? "var(--warn)" : "var(--text-muted)"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: late || today ? 500 : 400, color, whiteSpace: "nowrap" }}>
      <Icon name="calendar" size={12} />
      {rel}
    </span>
  )
}

export function TkPerson({ id }: { id: number | null }) {
  const { pessoa } = useTk()
  const p = pessoa(id)
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", minWidth: 0 }}>
      <Icon name="user" size={12} style={{ flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p ? p.first : "Sem responsável"}</span>
    </span>
  )
}

export function TkProgress({ feitas, total, width = 64 }: { feitas: number; total: number; width?: number }) {
  return (
    <span className="tnum" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
      <span style={{ width, height: 4, borderRadius: 2, background: "var(--bg-sunken)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: total ? `${(feitas / total) * 100}%` : 0, background: "var(--ok)" }} />
      </span>
      {`${feitas} de ${total}`}
    </span>
  )
}

/** Avatar de pessoa (iniciais sobre a cor da pessoa), como os membros do Trello. */
export function TkAvatar({ id, size = 28 }: { id: number | null; size?: number }) {
  const { pessoa } = useTk()
  const p = pessoa(id)
  if (!p) return null
  return (
    <span
      title={p.nome}
      aria-label={p.nome}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: p.color,
        color: "#fff",
        fontSize: Math.round(size * 0.4),
        fontWeight: 500,
        letterSpacing: "-0.02em",
        boxShadow: "0 0 0 1px var(--border-strong)",
      }}
    >
      {p.initials}
    </span>
  )
}

/**
 * Prazo em destaque no cartão (pílula colorida): vencida = vermelho, hoje =
 * âmbar, demais = neutro. Prazo fatal ganha a bandeira e o contorno vermelho.
 */
export function TkPrazoBadge({ t }: { t: Pick<TaskRow, "prazo" | "status" | "prazoFatal"> }) {
  const { hoje } = useTk()
  const late = vencida(t, hoje)
  const today = t.status !== "done" && t.prazo === hoje
  const tom = late ? " late" : today ? " today" : ""
  return (
    <span className={"tk-due" + tom + (t.prazoFatal ? " fatal" : "")} title={t.prazoFatal ? "Prazo fatal" : "Prazo"}>
      <Icon name={t.prazoFatal ? "flag" : "clock"} size={13} strokeWidth={2} />
      {rotuloPrazo(t.prazo, hoje)}
    </span>
  )
}

/** Janela de confirmação (vidro). Esc / clique fora = onClose. */
export function TkDialog({
  title,
  children,
  actions,
  onClose,
  width = 400,
}: {
  title: string
  children?: ReactNode
  actions: ReactNode
  onClose: () => void
  width?: number
}) {
  useEsc(onClose)
  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 1150 }}>
      <div className={TK_JANELA} role="dialog" aria-label={title} style={{ ...ELEVACAO_JANELA, width, maxWidth: "calc(100% - 32px)", padding: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.3, marginBottom: children ? 8 : 16 }}>{title}</div>
        {children && <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>{children}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>{actions}</div>
      </div>
    </div>
  )
}

// Pilha de janelas abertas: Esc fecha SÓ a do topo (um diálogo por cima do
// detalhe não fecha os dois). Popovers interceptam antes, na captura.
const pilhaEsc: { current: () => void }[] = []
let escInstalado = false
function instalarEsc() {
  if (escInstalado || typeof document === "undefined") return
  escInstalado = true
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !pilhaEsc.length) return
    pilhaEsc[pilhaEsc.length - 1].current()
  })
}

/** Esc fecha esta janela quando ela é a do topo. */
export function useEsc(fn: () => void, ativo = true) {
  const ref = useRef(fn)
  useLayoutEffect(() => {
    ref.current = fn
  })
  useEffect(() => {
    if (!ativo) return
    instalarEsc()
    const entrada = { current: () => ref.current() }
    pilhaEsc.push(entrada)
    return () => {
      const i = pilhaEsc.indexOf(entrada)
      if (i >= 0) pilhaEsc.splice(i, 1)
    }
  }, [ativo])
}

