"use client"

// Tarefas — página Quadro: cabeçalho (título, linha-resumo clicável, Quadro |
// Lista | Fluxo), linha de filtros (Minhas | Equipe, filtros ativos, Filtrar,
// Ordenar e Agrupar à vista), cabeçalho compacto do projeto quando há UM projeto
// filtrado, colunas fixas com títulos que grudam ao rolar, raias (projeto,
// responsável, grupo) e a Lista por prazo. Arrastar um cartão para cima/baixo na
// coluna grava a ordem manual DE QUEM ESTÁ VENDO e liga o "Ordenar: Manual".
import { Fragment, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useAreasStore, resolveAreaLabel } from "@/lib/areas/store"
import {
  ROTULO_PRAZO,
  SEM_PROJETO,
  noEscopo,
  ordenar,
  visiveis,
  type Agrupamento,
  type CtxOrdenacao,
  type Filtros,
  type FiltroPrazo,
  type Ordenacao,
} from "@/lib/tarefas/filtros"
import { cadeia, dataCurta, faixa, resumo, selo } from "@/lib/tarefas/regras"
import { STATUS, statusLabel, type ProjetoRow, type TaskRow, type TaskStatus } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { TkCard, TkCardSkeleton, type CardProps } from "./tk-card"
import { useTk } from "./tk-context"
import { TkFlowView } from "./tk-flow"
import {
  TkAvatar,
  TkChip,
  TkDot,
  TkDue,
  TkIconBtn,
  TkMenuItem,
  TkMenuLabel,
  TkMenuSep,
  TkPerson,
  TkPop,
  TkProgress,
  TkProjTag,
  TkSeg,
  TkState,
  usePop,
} from "./tk-ui"

export type SetFiltros = (p: Partial<Filtros>) => void

// ── helpers ──────────────────────────────────────────────────────────────────
/** Tudo que o `ordenar` precisa: ordem dos projetos, nomes e a ordem manual de quem vê. */
export function useOrdenacao(): CtxOrdenacao {
  const { projetos, nomePessoa, ordemManual } = useTk()
  const ordemProjeto = useMemo(() => {
    const m = new Map(projetos.map((p, i) => [p.id, i]))
    return (id: number | null) => (id == null ? 9999 : (m.get(id) ?? 9998))
  }, [projetos])
  return { ordemProjeto, nomePessoa, ordemManual }
}

const ROTULO_ORDENAR: Record<Ordenacao, string> = { manual: "Manual", due: "Prazo", proj: "Projeto", owner: "Responsável" }
const ROTULO_AGRUPAR: Record<Agrupamento, string> = { none: "Nenhum", proj: "Projeto", owner: "Responsável", group: "Grupo" }

/** "Ordenar: Prazo" à vista na linha de filtros; cada critério crescente ou decrescente. */
function TkOrdenarChip({ F, setF }: { F: Filtros; setF: SetFiltros }) {
  const pop = usePop()
  const manual = F.ordenar === "manual"
  return (
    <span style={{ display: "inline-flex" }}>
      <button type="button" className="btn btn-ghost btn-sm tk-viewbtn" onClick={pop.toggle}>
        <Icon name={manual ? "arrowUpDown" : F.direcao === "desc" ? "sortDesc" : "sortAsc"} size={14} />
        <span style={{ color: "var(--text-muted)" }}>Ordenar:</span>
        {ROTULO_ORDENAR[F.ordenar]}
      </button>
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} align="right" width={220}>
        <TkMenuLabel>Ordenar por</TkMenuLabel>
        {(["due", "proj", "owner", "manual"] as Ordenacao[]).map((o) => (
          <TkMenuItem key={o} checked={F.ordenar === o} onClick={() => setF({ ordenar: o })}>
            {ROTULO_ORDENAR[o]}
          </TkMenuItem>
        ))}
        <TkMenuSep />
        <TkMenuLabel>Direção</TkMenuLabel>
        <TkMenuItem icon="sortAsc" disabled={manual} checked={!manual && F.direcao === "asc"} onClick={() => setF({ direcao: "asc" })}>
          Crescente
        </TkMenuItem>
        <TkMenuItem icon="sortDesc" disabled={manual} checked={!manual && F.direcao === "desc"} onClick={() => setF({ direcao: "desc" })}>
          Decrescente
        </TkMenuItem>
      </TkPop>
    </span>
  )
}

/** "Agrupar: Projeto" — raias por projeto, responsável ou (dentro de um projeto) grupo. */
function TkAgruparChip({ F, setF, single }: { F: Filtros; setF: SetFiltros; single: boolean }) {
  const pop = usePop()
  const efetivo: Agrupamento = (F.agrupar === "group" && !single) || (F.agrupar === "proj" && single) ? "none" : F.agrupar
  const opcoes: Agrupamento[] = single ? ["none", "group", "owner"] : ["none", "proj", "owner"]
  const ativo = efetivo !== "none"
  return (
    <span style={{ display: "inline-flex" }}>
      <button type="button" className="btn btn-ghost btn-sm tk-viewbtn" onClick={pop.toggle} style={{ color: ativo ? "var(--accent)" : undefined }}>
        <Icon name="layers" size={14} />
        <span style={{ color: ativo ? undefined : "var(--text-muted)" }}>Agrupar:</span>
        {ROTULO_AGRUPAR[efetivo]}
      </button>
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} align="right" width={200}>
        <TkMenuLabel>Agrupar por</TkMenuLabel>
        {opcoes.map((a) => (
          <TkMenuItem
            key={a}
            checked={efetivo === a}
            onClick={() => {
              setF({ agrupar: a })
              pop.close()
            }}
          >
            {ROTULO_AGRUPAR[a]}
          </TkMenuItem>
        ))}
      </TkPop>
    </span>
  )
}

// ── linha-resumo clicável ────────────────────────────────────────────────────
export function TkSummary({ noEsc, F, setF, loading }: { noEsc: TaskRow[]; F: Filtros; setF: SetFiltros; loading?: boolean }) {
  const { hoje } = useTk()
  if (loading) return <div className="skeleton" style={{ height: 14, width: 220 }} />
  const r = resumo(noEsc, hoje)
  const itens: { id: FiltroPrazo; n: number; label: string; tom: string }[] = (
    [
      { id: "late", n: r.vencidas, label: r.vencidas === 1 ? "1 vencida" : `${r.vencidas} vencidas`, tom: "var(--crit)" },
      { id: "today", n: r.hoje, label: `${r.hoje} hoje`, tom: "var(--warn)" },
      { id: "week", n: r.semana, label: `${r.semana} na semana`, tom: "var(--text)" },
    ] as const
  ).filter((i) => i.n > 0)
  if (!itens.length) return <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Nada vencendo</span>
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
      {itens.map((i, k) => (
        <Fragment key={i.id}>
          {k > 0 && <span style={{ color: "var(--text-muted)" }}>·</span>}
          <button
            type="button"
            className={"tk-sumlink" + (F.prazo === i.id ? " on" : "")}
            style={{ color: i.tom }}
            onClick={() => setF({ prazo: F.prazo === i.id ? null : i.id })}
          >
            {i.label}
          </button>
        </Fragment>
      ))}
    </span>
  )
}

// ── cabeçalho compacto do projeto ────────────────────────────────────────────
export function TkProjectHeader({ p, onEditar }: { p: ProjetoRow; onEditar?: () => void }) {
  const { tarefas, cliente } = useTk()
  const areas = useAreasStore((s) => s.areas)
  const [aberto, setAberto] = useState(false)
  const todas = tarefas.filter((t) => t.projetoId === p.id)
  const area = resolveAreaLabel(areas, p.area)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 20px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, minWidth: 0 }}>
          <TkDot color={p.cor} />
          {p.nomeCurto}
          <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>{p.nome}</span>
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{cliente(p.clienteId)?.nome ?? "Sem cliente"}</span>
        <TkPerson id={p.responsavelId} />
        {p.prazo && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
            <Icon name="flag" size={12} />
            {dataCurta(p.prazo)}
          </span>
        )}
        <TkProgress feitas={todas.filter((t) => t.status === "done").length} total={todas.length} />
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 2 }}>
          {(area || p.descricao) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ height: 26, padding: "0 8px", fontSize: 12 }}
              onClick={() => setAberto((o) => !o)}
              aria-expanded={aberto}
            >
              Descrição
              <Icon name="chevronDown" size={13} style={{ transform: aberto ? "rotate(180deg)" : "none", transition: "transform .16s" }} />
            </button>
          )}
          {onEditar && <TkIconBtn icon="edit" title="Editar projeto" size={14} onClick={onEditar} />}
        </span>
      </div>
      {aberto && (
        <div style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 820, textWrap: "pretty", whiteSpace: "pre-wrap" }}>
          {[area, p.descricao].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  )
}

// ── linha 2: Minhas | Equipe · filtros ativos · Filtrar · Mais opções ────────
export function TkFilterBar({
  F,
  setF,
  single,
  fluxo,
  onLimpar,
}: {
  F: Filtros
  setF: SetFiltros
  single: ProjetoRow | null
  fluxo: boolean
  onLimpar: () => void
}) {
  const { projetosAtivos, pessoas, gestao, projeto, pessoa } = useTk()
  const pf = usePop()
  const pp = usePop()
  const projOpts = [
    ...projetosAtivos.map((p) => ({ id: p.id, label: p.nomeCurto, cor: p.cor })),
    { id: SEM_PROJETO, label: "Sem projeto", cor: "var(--text-subtle)" },
  ]
  const toggleProj = (id: number) => setF({ projetos: F.projetos.includes(id) ? F.projetos.filter((x) => x !== id) : [...F.projetos, id] })

  if (fluxo) {
    const p = projeto(F.projetos[0] ?? null)
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "inline-flex" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={pp.toggle}>
            {p && <TkDot color={p.cor} />}
            {p ? p.nomeCurto : "Projeto"}
            <Icon name="chevronDown" size={13} style={{ color: "var(--text-muted)" }} />
          </button>
        </span>
        <TkPop open={pp.open} onClose={pp.close} anchor={pp.anchor} width={220}>
          {projetosAtivos.map((x) => (
            <TkMenuItem
              key={x.id}
              dot={x.cor}
              checked={F.projetos[0] === x.id}
              onClick={() => {
                setF({ projetos: [x.id] })
                pp.close()
              }}
            >
              {x.nomeCurto}
            </TkMenuItem>
          ))}
        </TkPop>
      </div>
    )
  }

  const ativos = [
    ...F.projetos.map((id) => {
      const o = projOpts.find((x) => x.id === id)
      return {
        k: `p:${id}`,
        label: (
          <>
            <TkDot color={o?.cor ?? "var(--text-subtle)"} />
            {o?.label ?? projeto(id)?.nomeCurto ?? "Projeto"}
          </>
        ),
        limpar: () => toggleProj(id),
      }
    }),
    ...(F.escopo === "team" && F.responsavel != null
      ? [{ k: "resp", label: <>{pessoa(F.responsavel)?.first ?? "Responsável"}</>, limpar: () => setF({ responsavel: null }) }]
      : []),
    ...(F.prazo ? [{ k: "prazo", label: <>{ROTULO_PRAZO[F.prazo]}</>, limpar: () => setF({ prazo: null }) }] : []),
  ]
  const n = ativos.length
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      {gestao && (
        <TkSeg
          options={[
            { id: "mine", label: "Minhas" },
            { id: "team", label: "Equipe" },
          ]}
          value={F.escopo}
          onChange={(v) => setF({ escopo: v, responsavel: null })}
        />
      )}
      {n > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
          {ativos.map((i) => (
            <TkChip key={i.k} active onClick={i.limpar} onRemove={i.limpar}>
              {i.label}
            </TkChip>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ height: 28, padding: "0 8px", fontSize: 12 }} onClick={onLimpar}>
            Limpar
          </button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
        <span style={{ display: "inline-flex" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={pf.toggle} style={{ color: n ? "var(--accent)" : undefined }}>
            <Icon name="filter" size={14} />
            Filtrar
            {n ? <span className="tnum">{`(${n})`}</span> : null}
          </button>
        </span>
        <TkPop open={pf.open} onClose={pf.close} anchor={pf.anchor} align="right" width={240}>
          <TkMenuLabel>Projeto</TkMenuLabel>
          {projOpts.map((o) => (
            <TkMenuItem key={o.id} dot={o.cor} checked={F.projetos.includes(o.id)} onClick={() => toggleProj(o.id)}>
              {o.label}
            </TkMenuItem>
          ))}
          <TkMenuSep />
          {F.escopo === "team" && gestao && (
            <>
              <TkMenuLabel>Responsável</TkMenuLabel>
              {pessoas.map((p) => (
                <TkMenuItem key={p.id} checked={F.responsavel === p.id} onClick={() => setF({ responsavel: F.responsavel === p.id ? null : p.id })}>
                  {p.nome}
                </TkMenuItem>
              ))}
              <TkMenuSep />
            </>
          )}
          <TkMenuLabel>Prazo</TkMenuLabel>
          {(["late", "week", "fatal"] as FiltroPrazo[]).map((k) => (
            <TkMenuItem key={k} checked={F.prazo === k} onClick={() => setF({ prazo: F.prazo === k ? null : k })}>
              {ROTULO_PRAZO[k]}
            </TkMenuItem>
          ))}
        </TkPop>
        <TkOrdenarChip F={F} setF={setF} />
        {F.visao === "board" && <TkAgruparChip F={F} setF={setF} single={!!single} />}
      </div>
    </div>
  )
}

// ── colunas ──────────────────────────────────────────────────────────────────
const VAZIO_COL: Record<TaskStatus, string> = {
  todo: "Nada a fazer",
  doing: "Nada em andamento",
  wait: "Nada aguardando",
  done: "Nada concluído",
}

function TkColumn({
  status,
  cards,
  cardProps,
  hover,
  chain,
  setHover,
  manual,
  cap = 15,
}: {
  status: TaskStatus
  cards: TaskRow[]
  cardProps: CardProps
  hover: number | null
  chain: Set<number>
  setHover: (id: number | null) => void
  /** "Ordenar: Manual": vindo de outra coluna, o cartão entra onde foi solto. */
  manual: boolean
  cap?: number
}) {
  const { act, dragging, map } = useTk()
  const [over, setOver] = useState(false)
  const [todas, setTodas] = useState(false)
  // posição de inserção entre os cartões visíveis (linha dourada)
  const [alvo, setAlvo] = useState<number | null>(null)
  const shown = todas ? cards : cards.slice(0, cap)
  const realce = hover != null && chain.size > 1
  const de = dragging != null ? cards.findIndex((c) => c.id === dragging) : -1
  const mostrarLinha = dragging != null && alvo != null && !(de >= 0 && (alvo === de || alvo === de + 1))
  const linha = <div className="tk-drop-line" aria-hidden />
  return (
    <div
      className={"tk-col" + (over ? " over" : "")}
      onDragOver={(e) => {
        e.preventDefault()
        if (!over) setOver(true)
        if (dragging == null) return
        // reordena na própria lista; vindo de outra coluna, só no modo Manual
        const posiciona = de >= 0 || (manual && map.get(dragging)?.status !== status)
        if (!posiciona) {
          if (alvo != null) setAlvo(null)
          return
        }
        const els = e.currentTarget.querySelectorAll<HTMLElement>("[data-card]")
        let i = els.length
        for (let k = 0; k < els.length; k++) {
          const r = els[k].getBoundingClientRect()
          if (e.clientY < r.top + r.height / 2) {
            i = k
            break
          }
        }
        if (i !== alvo) setAlvo(i)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOver(false)
          setAlvo(null)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const i = alvo
        setAlvo(null)
        // Só aceita um cartão arrastado deste quadro (não texto solto de fora).
        const id = dragging
        if (id == null || id !== Number(e.dataTransfer.getData("text/plain"))) return
        const ids = cards.map((c) => c.id)
        if (de >= 0) {
          // mesma lista: nova posição manual (liga o "Ordenar: Manual")
          if (i == null) return
          const para = i > de ? i - 1 : i
          if (para === de) return
          ids.splice(de, 1)
          ids.splice(para, 0, id)
          act.reordenar(ids)
          return
        }
        if (map.get(id)?.status === status) return // outra raia, mesmo status: nada muda
        act.mover(id, status)
        if (manual && i != null) {
          ids.splice(Math.min(i, ids.length), 0, id)
          act.reordenar(ids)
        }
      }}
    >
      {shown.map((t, k) => (
        <Fragment key={t.id}>
          {mostrarLinha && alvo === k && linha}
          <TkCard
            t={t}
            {...cardProps}
            naColunaAguardando={status === "wait"}
            onHover={setHover}
            dim={realce && !chain.has(t.id)}
            lit={realce && chain.has(t.id)}
          />
        </Fragment>
      ))}
      {mostrarLinha && alvo === shown.length && linha}
      {cards.length > shown.length && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTodas(true)} style={{ justifyContent: "flex-start" }}>
          Mostrar mais {cards.length - shown.length}
        </button>
      )}
      {!cards.length && dragging == null && <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "6px 4px" }}>{VAZIO_COL[status]}</div>}
    </div>
  )
}

export function TkColumnHeads({ counts }: { counts: Record<TaskStatus, number> | null }) {
  return (
    <div className="tk-cols">
      {STATUS.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, height: 36, fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
          {s.label}
          <span className="tnum" style={{ fontWeight: 400, color: "var(--text-muted)" }}>
            {counts ? counts[s.id] : ""}
          </span>
        </div>
      ))}
    </div>
  )
}

function TkBoardView({ visible, F, single, loading }: { visible: TaskRow[]; F: Filtros; single: ProjetoRow | null; loading?: boolean }) {
  const { map, seguintes, projetos, projetosAtivos, tarefas, pessoas } = useTk()
  const ord = useOrdenacao()
  const [hover, setHover] = useState<number | null>(null)
  const [recolhidas, setRecolhidas] = useState<Record<string, boolean>>({})
  const chain = useMemo(() => (hover != null ? cadeia(hover, map, seguintes) : new Set<number>()), [hover, map, seguintes])
  const agrupar = (F.agrupar === "group" && !single) || (F.agrupar === "proj" && single) ? "none" : F.agrupar
  const cardProps: CardProps = {
    mostrarProjeto: !single && agrupar !== "proj",
    mostrarGrupo: agrupar !== "group",
  }
  if (loading) {
    return (
      <div className="tk-cols">
        {STATUS.map((s) => (
          <div key={s.id} className="tk-col">
            {[0, 1, 2, 3].slice(0, s.id === "done" ? 1 : 4).map((i) => (
              <TkCardSkeleton key={i} />
            ))}
          </div>
        ))}
      </div>
    )
  }
  const cols = (lista: TaskRow[]) =>
    STATUS.map((s) => (
      <TkColumn
        key={s.id}
        status={s.id}
        cards={ordenar(lista.filter((t) => t.status === s.id), F.ordenar, ord, F.direcao)}
        cardProps={cardProps}
        hover={hover}
        chain={chain}
        setHover={setHover}
        manual={F.ordenar === "manual"}
      />
    ))
  if (agrupar === "none") return <div className="tk-cols">{cols(visible)}</div>

  const raias =
    agrupar === "owner"
      ? [
          ...pessoas.map((p) => ({
            key: `u${p.id}`,
            head: (
              <>
                <TkAvatar id={p.id} size={20} />
                {p.nome}
              </>
            ),
            lista: visible.filter((t) => t.responsavelId === p.id),
          })),
          {
            key: "u0",
            head: <>Sem responsável</>,
            lista: visible.filter((t) => t.responsavelId == null || !pessoas.some((p) => p.id === t.responsavelId)),
          },
        ]
      : agrupar === "proj"
      ? [
          // Ativos primeiro; um arquivado só ganha raia se tiver tarefa visível (raias vazias somem abaixo).
          ...[...projetosAtivos, ...projetos.filter((p) => p.arquivadoEm != null)].map((p) => ({
            key: `p${p.id}`,
            head: (
              <>
                <TkDot color={p.cor} />
                {p.nomeCurto}
              </>
            ),
            lista: visible.filter((t) => t.projetoId === p.id),
          })),
          {
            key: "none",
            head: (
              <>
                <TkDot color="var(--text-subtle)" />
                Sem projeto
              </>
            ),
            lista: visible.filter((t) => t.projetoId == null),
          },
        ]
      : [...new Set(tarefas.filter((t) => t.projetoId === single!.id).map((t) => t.grupo || "Sem grupo"))]
          .sort((a, b) => (a === "Sem grupo" ? 1 : b === "Sem grupo" ? -1 : a.localeCompare(b, "pt-BR", { numeric: true })))
          .map((g) => {
            const todas = tarefas.filter((t) => t.projetoId === single!.id && (t.grupo || "Sem grupo") === g)
            return {
              key: g,
              head: (
                <>
                  {g}
                  <span style={{ marginLeft: 6 }}>
                    <TkProgress feitas={todas.filter((t) => t.status === "done").length} total={todas.length} width={48} />
                  </span>
                </>
              ),
              lista: visible.filter((t) => (t.grupo || "Sem grupo") === g),
            }
          })
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {raias
        .filter((l) => l.lista.length)
        .map((l) => {
          const c = recolhidas[l.key]
          return (
            <section key={l.key} className="tk-lane">
              <button type="button" className="tk-lane-head" aria-expanded={!c} onClick={() => setRecolhidas((s) => ({ ...s, [l.key]: !c }))}>
                <Icon name="chevronDown" size={14} style={{ transform: c ? "rotate(-90deg)" : "none", transition: "transform .16s", color: "var(--text-muted)" }} />
                {l.head}
                <span className="tnum" style={{ fontWeight: 400, fontSize: 12, color: "var(--text-muted)" }}>
                  {l.lista.length}
                </span>
              </button>
              {!c && (
                <div className="tk-cols" style={{ paddingBottom: 10 }}>
                  {cols(l.lista)}
                </div>
              )}
            </section>
          )
        })}
    </div>
  )
}

// ── Lista por prazo ──────────────────────────────────────────────────────────
const FAIXAS = [
  { id: "late", label: "Vencidas" },
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "later", label: "Depois" },
] as const

function TkListView({ visible, F, single }: { visible: TaskRow[]; F: Filtros; single: ProjetoRow | null }) {
  const { map, act, openTask, hoje, nomePessoa: nome } = useTk()
  const ord = useOrdenacao()
  const abertas = visible.filter((t) => t.status !== "done")
  const grupos = FAIXAS.map((b) => ({ ...b, lista: ordenar(abertas.filter((t) => faixa(t, hoje) === b.id), F.ordenar, ord, F.direcao) })).filter(
    (g) => g.lista.length,
  )
  if (!grupos.length) return <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "16px 0" }}>Nenhuma tarefa</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1120 }}>
      {grupos.map((g) => (
        <section key={g.id}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              padding: "0 0 6px",
              borderBottom: "1px solid var(--border)",
              color: g.id === "late" ? "var(--crit)" : "var(--text)",
            }}
          >
            {g.label}
            <span className="tnum" style={{ fontWeight: 400, color: "var(--text-muted)" }}>
              {g.lista.length}
            </span>
          </div>
          {g.lista.map((t) => (
            <div
              key={t.id}
              className="tk-row"
              tabIndex={0}
              onClick={() => openTask(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) openTask(t.id)
              }}
            >
              <button
                type="button"
                className="tk-check"
                title="Concluir"
                aria-label="Concluir"
                onClick={(e) => {
                  e.stopPropagation()
                  act.concluir(t.id)
                }}
              >
                <span />
              </button>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titulo}</span>
                {(!single || t.grupo) && (
                  <span style={{ minWidth: 0, display: "flex" }}>
                    {single ? (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.grupo}</span>
                    ) : (
                      <TkProjTag projetoId={t.projetoId} grupo={t.grupo} />
                    )}
                  </span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <TkState selo={selo(t, map, hoje, nome)} t={t} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{statusLabel(t.status)}</span>
              {F.escopo === "team" ? <TkPerson id={t.responsavelId} /> : <span />}
              <TkDue t={t} />
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

// ── página Quadro ────────────────────────────────────────────────────────────

// ── quadro vazio: nunca uma tela em branco ───────────────────────────────────
function TkVazio({ icon, titulo, children }: { icon: TfIconName; titulo: string; children?: ReactNode }) {
  return (
    <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "72px 24px", textAlign: "center" }}>
      <span
        aria-hidden
        style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Icon name={icon} size={22} />
      </span>
      <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text)" }}>{titulo}</span>
      {children && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>{children}</div>}
    </div>
  )
}

export function TkBoardPage({
  F,
  setF,
  setFState,
  loading,
  onEditarProjeto,
}: {
  F: Filtros
  setF: SetFiltros
  setFState: Dispatch<SetStateAction<Filtros>>
  loading?: boolean
  onEditarProjeto: (p: ProjetoRow) => void
}) {
  const { tarefas, projeto, projetosAtivos, meId, hoje, podeProjeto, act } = useTk()
  const esc = noEscopo(tarefas, F, meId)
  const visible = visiveis(tarefas, F, meId, hoje)
  const single = F.projetos.length === 1 && F.projetos[0] !== SEM_PROJETO ? projeto(F.projetos[0]) : null
  const counts = Object.fromEntries(STATUS.map((s) => [s.id, visible.filter((t) => t.status === s.id).length])) as Record<TaskStatus, number>
  const fluxo = F.visao === "flow"
  const vazio = !tarefas.length && !loading
  // Há tarefas, mas nenhuma passa pelos filtros/escopo desta tela.
  const nadaVisivel = !vazio && !loading && !visible.length && !fluxo
  const filtrando = F.prazo != null || F.responsavel != null || (!single && F.projetos.length > 0)
  const limparFiltros = () => setFState((f) => ({ ...f, projetos: single ? f.projetos : [], responsavel: null, prazo: null }))
  const botaoNova = (
    <button type="button" className="btn btn-primary btn-sm" onClick={act.novaTarefa}>
      <Icon name="plus" size={15} strokeWidth={2.2} />
      Nova tarefa
    </button>
  )
  return (
    <main className="tk-main">
      <div className="tk-head">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 className="tk-h1">Quadro</h1>
          {!vazio && <TkSummary noEsc={esc} F={F} setF={setF} loading={loading} />}
          {!vazio && (
            <div style={{ marginLeft: "auto" }}>
              <TkSeg
                options={[
                  { id: "board", label: "Quadro" },
                  { id: "list", label: "Lista" },
                  { id: "flow", label: "Fluxo" },
                ]}
                value={F.visao}
                onChange={(v) =>
                  setF({
                    visao: v,
                    projetos:
                      v === "flow"
                        ? [F.projetos.find((x) => x !== SEM_PROJETO) ?? projetosAtivos[0]?.id].filter((x): x is number => x != null)
                        : F.projetos,
                  })
                }
              />
            </div>
          )}
        </div>
        {!vazio && (
          <TkFilterBar
            F={F}
            setF={setF}
            single={single}
            fluxo={fluxo}
            onLimpar={() => setFState((f) => ({ ...f, projetos: [], responsavel: null, prazo: null }))}
          />
        )}
        {!vazio && single && <TkProjectHeader p={single} onEditar={podeProjeto ? () => onEditarProjeto(single) : undefined} />}
      </div>
      {vazio && (
        <TkVazio icon="kanban" titulo="Nenhuma tarefa ainda">
          {botaoNova}
        </TkVazio>
      )}
      {nadaVisivel &&
        (filtrando ? (
          <TkVazio icon="filter" titulo="Nenhuma tarefa com estes filtros">
            <button type="button" className="btn btn-secondary btn-sm" onClick={limparFiltros}>
              Limpar filtros
            </button>
          </TkVazio>
        ) : (
          <TkVazio icon={single ? "folder" : "checkCircle"} titulo={single ? "Nenhuma tarefa neste projeto" : "Nenhuma tarefa para mostrar"}>
            {botaoNova}
          </TkVazio>
        ))}
      {!vazio && !nadaVisivel && F.visao === "board" && (
        <div className="tk-colheads">
          <TkColumnHeads counts={loading ? null : counts} />
        </div>
      )}
      {!vazio && !nadaVisivel && (
        <div className="tk-body" style={F.visao !== "board" ? { paddingTop: 4 } : undefined}>
          {F.visao === "board" && <TkBoardView visible={visible} F={F} single={single} loading={loading} />}
          {F.visao === "list" && <TkListView visible={visible} F={F} single={single} />}
          {F.visao === "flow" && (single ? <TkFlowView projeto={single} /> : <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Nenhum projeto</div>)}
        </div>
      )}
    </main>
  )
}

