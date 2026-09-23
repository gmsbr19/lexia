"use client"

// Tarefas — visão Fluxo de UM projeto: uma faixa por grupo, cartões compactos na
// ordem das ligações (não é Gantt), setas curvas inclusive entre faixas.
// Arrastar a alça "Ligar" de um cartão até outro cria "o alvo só começa depois
// desta"; clicar numa seta → "Remover". Celular: lista vertical por grupo.
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { criariaCiclo, cadeia, rotuloPrazo, selo, vencida } from "@/lib/tarefas/regras"
import { FLUXO, layoutFluxo, listaFluxo, type TomSeta } from "@/lib/tarefas/fluxo"
import { statusLabel, type ProjetoRow, type TaskRow } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { useTk } from "./tk-context"
import { TkMenuItem, TkPerson, TkProgress, TOM_SELO } from "./tk-ui"
import { ELEVACAO_MENU, TK_MENU } from "./tk-glass"

const { CW, CH, HEAD } = FLUXO

interface Arrasto {
  de: number
  x: number
  y: number
  sobre: number | null
}

function TkFlowCard({
  t,
  x,
  y,
  dim,
  lit,
  alvo,
  onHover,
  onLigar,
  onAbrir,
}: {
  t: TaskRow
  x: number
  y: number
  dim: boolean
  lit: boolean
  alvo: "ok" | "bad" | "src" | null
  onHover: (id: number | null) => void
  onLigar: (id: number, e: React.MouseEvent) => void
  onAbrir: (id: number) => void
}) {
  const { map, hoje, nomePessoa } = useTk()
  const s = selo(t, map, hoje, nomePessoa)
  const done = t.status === "done"
  const topo: { texto: string; cor: string; icon: TfIconName | null; motivo?: string } =
    s && s.kind === "risk"
      ? { texto: "Em risco", cor: TOM_SELO.risk.fg, icon: TOM_SELO.risk.icon, motivo: s.motivo }
      : done
        ? { texto: "Concluído", cor: "var(--ok)", icon: "checkCircle" }
        : { texto: statusLabel(t.status), cor: "var(--text-muted)", icon: t.status === "wait" ? "clock" : t.status === "doing" ? "circleDot" : null }
  const late = vencida(t, hoje)
  return (
    <div
      className={"tk-card tk-fcard" + (done ? " done" : "") + (dim ? " dim" : "") + (lit ? " lit" : "") + (alvo ? ` target-${alvo}` : "")}
      style={{ position: "absolute", left: x, top: y, width: CW, height: CH }}
      onMouseEnter={() => onHover(t.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onAbrir(t.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onAbrir(t.id)
      }}
    >
      <span
        title={topo.motivo}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: topo.cor, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {topo.icon && <Icon name={topo.icon} size={12} style={{ flexShrink: 0 }} />}
        {topo.texto}
      </span>
      <div className="tk-card-title" style={{ color: done ? "var(--text-muted)" : "var(--text)" }}>
        {t.titulo}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto", minWidth: 0 }}>
        <TkPerson id={t.responsavelId} />
        {!done && (
          <span
            style={{
              fontSize: 12,
              color: late || t.prazoFatal ? "var(--crit)" : "var(--text-muted)",
              fontWeight: late || t.prazoFatal ? 500 : 400,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            {t.prazoFatal && <Icon name="flag" size={11} />}
            {rotuloPrazo(t.prazo, hoje)}
          </span>
        )}
      </div>
      <button
        type="button"
        className="tk-link-handle"
        title="Ligar"
        aria-label="Ligar"
        onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onLigar(t.id, e)
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon name="link2" size={12} />
        Ligar
      </button>
    </div>
  )
}

const COR_TOM: Record<TomSeta | "accent", string> = {
  base: "var(--text-muted)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  accent: "var(--accent)",
}

const curva = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = Math.max(36, Math.abs(x2 - x1) / 2)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

export function TkFlowView({ projeto }: { projeto: ProjetoRow }) {
  const { tarefas, map, seguintes, hoje, act, mobile, openTask, portal } = useTk()
  const [hover, setHover] = useState<number | null>(null)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)
  const [menuSeta, setMenuSeta] = useState<{ de: number; para: number; x: number; y: number } | null>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // Soltar a alça "Ligar" sobre o próprio cartão gera um click nele — não abre o detalhe.
  const acabouDeArrastar = useRef(false)

  const doProjeto = useMemo(() => tarefas.filter((t) => t.projetoId === projeto.id), [tarefas, projeto.id])
  const layout = useMemo(() => layoutFluxo(doProjeto, hoje), [doProjeto, hoje])
  const chain = useMemo(() => (hover != null && !arrasto ? cadeia(hover, map, seguintes) : new Set<number>()), [hover, arrasto, map, seguintes])

  const local = (cx: number, cy: number) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: cx - r.left, y: cy - r.top }
  }
  const acertar = (p: { x: number; y: number }): number | null => {
    for (const [id, q] of layout.pos) if (p.x >= q.x && p.x <= q.x + CW && p.y >= q.y && p.y <= q.y + CH) return id
    return null
  }

  const deRef = useRef<number | null>(null)
  useEffect(() => {
    if (arrasto == null) return
    const mv = (e: MouseEvent) => {
      const p = local(e.clientX, e.clientY)
      setArrasto((d) => d && { ...d, ...p, sobre: acertar(p) })
    }
    const up = (e: MouseEvent) => {
      acabouDeArrastar.current = true
      window.setTimeout(() => (acabouDeArrastar.current = false), 0)
      const alvo = acertar(local(e.clientX, e.clientY))
      const de = deRef.current
      setArrasto(null)
      deRef.current = null
      if (de != null && alvo != null && alvo !== de) act.ligar(de, alvo)
    }
    window.addEventListener("mousemove", mv)
    window.addEventListener("mouseup", up)
    return () => {
      window.removeEventListener("mousemove", mv)
      window.removeEventListener("mouseup", up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrasto != null, layout])

  useEffect(() => {
    if (!menuSeta) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuSeta(null)
    }
    const id = window.setTimeout(() => document.addEventListener("mousedown", h), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener("mousedown", h)
    }
  }, [menuSeta])

  if (mobile) return <TkFlowList projeto={projeto} />

  const { pos, faixas, setas, W, H } = layout
  const largura = Math.max(W, 600)
  const valido =
    arrasto && arrasto.sobre != null && arrasto.sobre !== arrasto.de
      ? !criariaCiclo(arrasto.de, arrasto.sobre, map) && !(map.get(arrasto.sobre)?.anteriores.includes(arrasto.de) ?? false)
      : null

  return (
    <div style={{ overflowX: "auto", paddingBottom: 16 }}>
      <div ref={canvas} className={"tk-flow" + (arrasto ? " linking" : "")} style={{ position: "relative", width: largura, height: H, minWidth: "100%" }}>
        {faixas.map((f) => (
          <div key={f.grupo} className="tk-flane" style={{ top: f.y, height: f.h }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, height: HEAD - 4, padding: "0 16px" }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{f.grupo}</span>
              <TkProgress feitas={f.feitas} total={f.total} width={48} />
            </div>
          </div>
        ))}
        <svg width={largura} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
          <defs>
            {Object.entries(COR_TOM).map(([k, c]) => (
              <marker key={k} id={`tk-arr-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" style={{ fill: c }} />
              </marker>
            ))}
          </defs>
          {setas.map((s) => {
            const a = pos.get(s.de)!
            const b = pos.get(s.para)!
            const d = curva(a.x + CW, a.y + CH / 2, b.x, b.y + CH / 2)
            const on = chain.size > 1 && chain.has(s.de) && chain.has(s.para)
            const apagada = chain.size > 1 && !on
            return (
              <g key={`${s.de}>${s.para}`} style={{ opacity: apagada ? 0.18 : 1, transition: "opacity .16s" }}>
                <path d={d} fill="none" style={{ stroke: COR_TOM[s.tom], strokeWidth: on ? 2.25 : 1.5 }} markerEnd={`url(#tk-arr-${s.tom})`} />
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                  style={{ pointerEvents: arrasto ? "none" : "stroke", cursor: "pointer" }}
                  onClick={(ev) => setMenuSeta({ de: s.de, para: s.para, x: ev.clientX, y: ev.clientY })}
                >
                  <title>{`${map.get(s.de)?.titulo ?? ""} → ${map.get(s.para)?.titulo ?? ""}`}</title>
                </path>
              </g>
            )
          })}
          {arrasto &&
            (() => {
              const a = pos.get(arrasto.de)
              if (!a) return null
              const alvo = arrasto.sobre != null && arrasto.sobre !== arrasto.de ? pos.get(arrasto.sobre) : null
              const x2 = alvo ? alvo.x : arrasto.x
              const y2 = alvo ? alvo.y + CH / 2 : arrasto.y
              const tom = valido === false ? "crit" : "accent"
              return (
                <path
                  d={curva(a.x + CW, a.y + CH / 2, x2, y2)}
                  fill="none"
                  style={{ stroke: COR_TOM[tom], strokeWidth: 2, strokeDasharray: "6 5" }}
                  markerEnd={`url(#tk-arr-${tom})`}
                />
              )
            })()}
        </svg>
        {doProjeto.map((t) => {
          const p = pos.get(t.id)
          if (!p) return null
          return (
            <TkFlowCard
              key={t.id}
              t={t}
              x={p.x}
              y={p.y}
              onHover={(id) => !arrasto && setHover(id)}
              onAbrir={(id) => {
                if (!acabouDeArrastar.current) openTask(id)
              }}
              onLigar={(id, e) => {
                setMenuSeta(null)
                deRef.current = id
                setArrasto({ de: id, ...local(e.clientX, e.clientY), sobre: null })
              }}
              dim={chain.size > 1 && !chain.has(t.id)}
              lit={chain.size > 1 && chain.has(t.id)}
              alvo={
                arrasto && arrasto.sobre === t.id && t.id !== arrasto.de ? (valido ? "ok" : "bad") : arrasto && arrasto.de === t.id ? "src" : null
              }
            />
          )
        })}
        {menuSeta &&
          portal &&
          createPortal(
            <div
              ref={menuRef}
              className={TK_MENU}
              style={{
                ...ELEVACAO_MENU,
                position: "fixed",
                left: Math.max(8, Math.min(menuSeta.x - 20, window.innerWidth - 168)),
                top: Math.min(menuSeta.y + 10, window.innerHeight - 56),
                width: 160,
                padding: 4,
                zIndex: 1200,
                borderRadius: "var(--r-md)",
              }}
            >
              <TkMenuItem
                icon="trash2"
                danger
                onClick={() => {
                  act.desligar(menuSeta.de, menuSeta.para)
                  setMenuSeta(null)
                }}
              >
                Remover
              </TkMenuItem>
            </div>,
            portal,
          )}
      </div>
    </div>
  )
}

/** Celular: lista vertical por grupo, na ordem das ligações; sem arrastar. */
export function TkFlowList({ projeto }: { projeto: ProjetoRow }) {
  const { tarefas, map, hoje, openTask, nomePessoa } = useTk()
  const grupos = listaFluxo(tarefas.filter((t) => t.projetoId === projeto.id))
  if (!grupos.length) return <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "8px 0" }}>Nenhuma tarefa</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {grupos.map((g) => (
        <section key={g.grupo} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 500 }}>
            {g.grupo}
            <TkProgress feitas={g.tarefas.filter((t) => t.status === "done").length} total={g.tarefas.length} width={40} />
          </div>
          {g.tarefas.map((t) => {
            const s = selo(t, map, hoje, nomePessoa)
            const antes = t.anteriores.map((a) => map.get(a)?.titulo).filter(Boolean)
            return (
              <button
                type="button"
                key={t.id}
                className="tk-card"
                style={{ textAlign: "left", font: "inherit", color: "inherit" }}
                onClick={() => openTask(t.id)}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: s?.kind === "risk" ? "var(--warn)" : t.status === "done" ? "var(--ok)" : "var(--text-muted)" }}>
                  {s?.kind === "risk" ? "Em risco" : statusLabel(t.status)}
                </span>
                <span className="tk-card-title">{t.titulo}</span>
                {antes.length > 0 && (
                  <span style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="link2" size={12} />
                    Só começa depois de: {antes.join(", ")}
                  </span>
                )}
                <span style={{ display: "flex", gap: 10, fontSize: 12, color: vencida(t, hoje) ? "var(--crit)" : "var(--text-muted)" }}>
                  <TkPerson id={t.responsavelId} />
                  {t.status !== "done" && rotuloPrazo(t.prazo, hoje)}
                </span>
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}
