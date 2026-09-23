"use client"

// Tarefas — Equipe (só gestão): Vencidas · Concluídas no prazo (30 dias) ·
// Projetos ativos; "Precisa de atenção" (vencidas, em risco, prazos fatais em até
// 5 dias); carga por pessoa (nome clicável abre o Quadro filtrado pela pessoa).
// Mesmo cálculo puro de GET /api/tarefas/equipe (equipe.ts).
import { useMemo } from "react"
import { painelEquipe, type TipoAtencao } from "@/lib/tarefas/equipe"
import { Icon, type TfIconName } from "./tf-icons"
import { useTk } from "./tk-context"
import { TkPerson, TkProjTag } from "./tk-ui"

const TOM: Record<TipoAtencao, { cor: string; icon: TfIconName }> = {
  late: { cor: "var(--crit)", icon: "alertCircle" },
  risk: { cor: "var(--warn)", icon: "alertTriangle" },
  fatal: { cor: "var(--crit)", icon: "flag" },
}

function Kpi({ label, valor, sub, cor }: { label: string; valor: string | number; sub?: string; cor?: string }) {
  return (
    <div className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <span className="tnum" style={{ fontSize: 25, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.2, color: cor ?? "var(--text)" }}>
        {valor}
      </span>
      {sub && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  )
}

export function TkTeamPage({ onAbrirPessoa }: { onAbrirPessoa: (id: number) => void }) {
  const { tarefas, projetos, pessoas, hoje, map, openTask } = useTk()
  const p = useMemo(() => painelEquipe(tarefas, projetos, pessoas, hoje), [tarefas, projetos, pessoas, hoje])
  const max = Math.max(1, ...p.carga.map((c) => c.abertas))
  return (
    <main className="tk-main">
      <div className="tk-head">
        <h1 className="tk-h1">Equipe</h1>
      </div>
      <div className="tk-body" style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 16, maxWidth: 1180 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Kpi label="Vencidas" valor={p.vencidas} cor={p.vencidas ? "var(--crit)" : undefined} />
          <Kpi
            label="Concluídas no prazo (30 dias)"
            valor={p.noPrazo.pct == null ? "—" : `${p.noPrazo.pct}%`}
            sub={`${p.noPrazo.feitas} de ${p.noPrazo.total}`}
          />
          <Kpi label="Projetos ativos" valor={p.projetosAtivos} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12, alignItems: "start" }}>
          <section className="card" style={{ padding: "12px 16px 8px" }}>
            <div className="tk-sec-title" style={{ fontSize: 14, marginBottom: 6 }}>
              Precisa de atenção
              <span className="tnum" style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                {p.atencao.length}
              </span>
            </div>
            {p.atencao.map(({ tarefaId, tipo, texto }) => {
              const t = map.get(tarefaId)
              if (!t) return null
              return (
                <div
                  key={`${tarefaId}-${tipo}`}
                  className="tk-arow tk-row-hover"
                  tabIndex={0}
                  onClick={() => openTask(tarefaId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openTask(tarefaId)
                  }}
                >
                  <Icon name={TOM[tipo].icon} size={14} style={{ color: TOM[tipo].cor, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.titulo}</span>
                    <span style={{ display: "flex", minWidth: 0 }}>
                      <TkProjTag projetoId={t.projetoId} grupo={t.grupo} />
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: TOM[tipo].cor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={texto}>
                    {texto}
                  </span>
                  <TkPerson id={t.responsavelId} />
                </div>
              )
            })}
            {!p.atencao.length && <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "8px 0 12px" }}>Nada precisa de atenção</div>}
          </section>
          <section className="card" style={{ padding: "12px 16px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span className="tk-sec-title" style={{ fontSize: 14, flex: 1 }}>
                Carga por pessoa
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--border-strong)" }} />A fazer
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--crit)" }} />
                Vencidas
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {p.carga.map((c) => {
                const pessoa = pessoas.find((x) => x.id === c.pessoaId)
                return (
                  <div key={c.pessoaId} style={{ display: "grid", gridTemplateColumns: "92px minmax(0,1fr) 72px", gap: 10, alignItems: "center", minHeight: 36 }}>
                    <button type="button" className="tk-link" onClick={() => onAbrirPessoa(c.pessoaId)} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pessoa?.first ?? "—"}
                    </button>
                    <div style={{ height: 8, borderRadius: 4, background: "var(--bg-sunken)", overflow: "hidden", display: "flex" }}>
                      <span style={{ width: `${(c.vencidas / max) * 100}%`, background: "var(--crit)" }} />
                      <span style={{ width: `${((c.abertas - c.vencidas) / max) * 100}%`, background: "var(--border-strong)" }} />
                    </div>
                    <span className="tnum" style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right", whiteSpace: "nowrap" }}>
                      {c.abertas}
                      {c.vencidas ? <span style={{ color: "var(--crit)" }}>{` · ${c.vencidas}`}</span> : null}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
