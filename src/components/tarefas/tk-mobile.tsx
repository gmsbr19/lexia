"use client"

// Tarefas — Quadro no celular: cabeçalho em vidro ("Quadro" + Nova tarefa),
// linha-resumo, Minhas | Equipe + Filtrar, abas de status roláveis com contador,
// lista de cartões do status (botão "…" sempre visível; sem arrastar) e a barra
// inferior (Quadro · Modelos · Equipe). Fluxo = lista vertical por grupo.
import { useState } from "react"
import { buscarCasos } from "@/lib/tarefas/casos-quadro"
import { ROTULO_PRAZO, SEM_CASO, noEscopo, ordenar, visiveis, type Filtros, type FiltroPrazo } from "@/lib/tarefas/filtros"
import { STATUS, type TaskStatus } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { TkSummary, useOrdenacao, type SetFiltros } from "./tk-board"
import { TkCard } from "./tk-card"
import { useTk } from "./tk-context"
import { TkFlowList } from "./tk-flow"
import { TkMenuItem, TkMenuLabel, TkMenuSep, TkPop, TkSeg, usePop } from "./tk-ui"

export type Pagina = "board" | "modelos" | "team"

const VAZIO: Record<TaskStatus, string> = {
  todo: "Nada a fazer",
  doing: "Nada em andamento",
  wait: "Nada aguardando",
  done: "Nada concluído",
}

export function TkMobileBoard({ F, setF, limpar }: { F: Filtros; setF: SetFiltros; limpar: () => void }) {
  const { tarefas, meId, hoje, gestao, casosComTarefas, caso, cliente, act } = useTk()
  const ord = useOrdenacao()
  const [aba, setAba] = useState<TaskStatus>("todo")
  const [qCaso, setQCaso] = useState("")
  const pf = usePop()
  const esc = noEscopo(tarefas, F, meId)
  const vis = visiveis(tarefas, F, meId, hoje)
  const single = F.casos.length === 1 && F.casos[0] !== SEM_CASO ? caso(F.casos[0]) : null
  const lista = ordenar(vis.filter((t) => t.status === aba), F.ordenar, ord, F.direcao)
  const nFiltros = F.casos.length + (F.responsavel != null ? 1 : 0) + (F.prazo ? 1 : 0)
  const fluxo = F.visao === "flow" && single
  const toggleCaso = (id: number) => setF({ casos: F.casos.includes(id) ? F.casos.filter((x) => x !== id) : [...F.casos, id] })
  const opcoesCaso = buscarCasos(casosComTarefas, qCaso, (id) => cliente(id)?.nome, 30)

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative" }}>
      <div className="glass-bar" style={{ position: "sticky", top: 0, zIndex: 5, padding: "14px 16px 12px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 className="tk-h1" style={{ flex: 1 }}>
            Quadro
          </h1>
          <button type="button" className="btn btn-primary btn-sm" onClick={act.novaTarefa}>
            <Icon name="plus" size={14} strokeWidth={2.4} />
            Nova tarefa
          </button>
        </div>
        <TkSummary noEsc={esc} F={F} setF={setF} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          <span style={{ marginLeft: "auto", display: "inline-flex" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={pf.toggle} style={{ color: nFiltros ? "var(--accent)" : undefined }}>
              <Icon name="filter" size={14} />
              Filtrar
              {nFiltros ? <span className="tnum">({nFiltros})</span> : null}
            </button>
          </span>
          <TkPop open={pf.open} onClose={pf.close} anchor={pf.anchor} align="right" width={260}>
            <TkMenuLabel>Caso</TkMenuLabel>
            <input className="input" placeholder="Buscar caso" aria-label="Buscar caso" value={qCaso} onChange={(e) => setQCaso(e.target.value)} style={{ marginBottom: 3 }} />
            <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
              {opcoesCaso.map((c) => (
                <TkMenuItem key={c.id} dot={c.cor} checked={F.casos.includes(c.id)} onClick={() => toggleCaso(c.id)}>
                  {c.nomeCurto}
                </TkMenuItem>
              ))}
              <TkMenuItem dot="var(--text-subtle)" checked={F.casos.includes(SEM_CASO)} onClick={() => toggleCaso(SEM_CASO)}>
                Sem caso
              </TkMenuItem>
            </div>
            <TkMenuSep />
            <TkMenuLabel>Prazo</TkMenuLabel>
            {(["late", "week", "fatal"] as FiltroPrazo[]).map((k) => (
              <TkMenuItem key={k} checked={F.prazo === k} onClick={() => setF({ prazo: F.prazo === k ? null : k })}>
                {ROTULO_PRAZO[k]}
              </TkMenuItem>
            ))}
            {single && (
              <>
                <TkMenuSep />
                <TkMenuItem checked={F.visao === "flow"} icon="workflow" onClick={() => setF({ visao: F.visao === "flow" ? "board" : "flow" })}>
                  Fluxo
                </TkMenuItem>
              </>
            )}
            {nFiltros > 0 && (
              <>
                <TkMenuSep />
                <TkMenuItem
                  onClick={() => {
                    limpar()
                    pf.close()
                  }}
                >
                  Limpar
                </TkMenuItem>
              </>
            )}
          </TkPop>
        </div>
        {!fluxo && (
          <div className="tk-mtabs">
            {STATUS.map((s) => (
              <button type="button" key={s.id} className={aba === s.id ? "on" : ""} onClick={() => setAba(s.id)}>
                {s.label}
                <span className="tnum">{vis.filter((t) => t.status === s.id).length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {fluxo && single ? (
          <TkFlowList caso={single} />
        ) : (
          <>
            {lista.map((t) => (
              <TkCard key={t.id} t={t} arrastavel={false} mostrarCaso={!single} naColunaAguardando={aba === "wait"} />
            ))}
            {!lista.length && <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "8px 0" }}>{VAZIO[aba]}</div>}
          </>
        )}
      </div>
    </div>
  )
}

export function TkMobileNav({ pagina, ir }: { pagina: Pagina; ir: (p: Pagina) => void }) {
  const { gestao } = useTk()
  const itens: [Pagina, TfIconName, string][] = [
    ["board", "kanban", "Quadro"],
    ["modelos", "layers", "Modelos"],
    ...(gestao ? ([["team", "users", "Equipe"]] as [Pagina, TfIconName, string][]) : []),
  ]
  return (
    <nav className="glass-bar" style={{ display: "flex", borderTop: "1px solid var(--border)", padding: "4px 8px 10px", flexShrink: 0 }}>
      {itens.map(([id, ic, l]) => (
        <button
          type="button"
          key={id}
          className="tk-mnav"
          aria-current={pagina === id ? "page" : undefined}
          style={{ color: pagina === id ? "var(--accent)" : "var(--text-muted)" }}
          onClick={() => ir(id)}
        >
          <Icon name={ic} size={18} />
          {l}
        </button>
      ))}
    </nav>
  )
}
