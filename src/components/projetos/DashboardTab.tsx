"use client"

// Projetos & Tarefas — produtividade da equipe. Renders the server-computed
// ProdutividadeDashboard (KPIs + saúde por projeto + carga por pessoa + gargalos).
import type { ProdutividadeDashboard, ProjetoView } from "@/lib/projetos/types"
import { statusMeta } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "@/components/tarefas/tf-icons"
import { AssigneeAvatar } from "@/components/tarefas/tf-kit"
import { MO, WD, tParse } from "@/components/tarefas/tf-meta"
import { resolveAreaLabel, useAreasStore } from "@/lib/areas/store"
import { CardTitle, ErrorBanner, PageFrame, PageHeader, ProgressBar, SaudeChip } from "./pj-kit"

// One cell of the forward-distribution heatmap: intensity scales with the count.
function HeatCell({ count, today, weekend, title }: { count: number; today: boolean; weekend: boolean; title: string }) {
  const intensity = count === 0 ? 0 : Math.min(0.78, 0.2 + (count - 1) * 0.2)
  const bg = count === 0 ? (weekend ? "transparent" : "var(--bg-sunken)") : `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, transparent)`
  return (
    <div
      title={title}
      style={{
        height: 28,
        borderRadius: 6,
        background: bg,
        border: today ? "1px solid var(--border-gold)" : "1px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        fontFeatureSettings: '"tnum"',
        color: count === 0 ? "var(--text-subtle)" : intensity > 0.5 ? "#fff" : "var(--text)",
      }}
    >
      {count > 0 ? count : ""}
    </div>
  )
}

function KpiCard({ label, value, icon, sub, tone }: { label: string; value: string | number; icon: TfIconName; sub?: string; tone?: "crit" }) {
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: tone === "crit" ? "var(--crit-soft)" : "var(--accent-soft)", color: tone === "crit" ? "var(--crit)" : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={icon} size={17} strokeWidth={1.9} />
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.03em", color: tone === "crit" ? "var(--crit)" : "var(--text)", fontFeatureSettings: '"tnum"' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{sub}</div>}
    </div>
  )
}

export function DashboardTab({
  data,
  loading,
  error,
  onRetry,
  projetos,
  onOpenProject,
  onOpenTask,
}: {
  data: ProdutividadeDashboard | null
  loading: boolean
  error: boolean
  onRetry: () => void
  projetos: ProjetoView[]
  onOpenProject: (id: number) => void
  onOpenTask: (id: number) => void
}) {
  const areas = useAreasStore((s) => s.areas)
  const corDe = (id: number) => projetos.find((p) => p.id === id)?.cor || "var(--text-muted)"

  if (loading && !data) {
    return (
      <PageFrame>
        <PageHeader title="Equipe" sub="Produtividade da equipe nos projetos ativos · histórico e próximos dias" />
        <div style={{ textAlign: "center", padding: "70px 20px", color: "var(--text-subtle)", fontSize: 13 }}>Carregando indicadores…</div>
      </PageFrame>
    )
  }
  if (error || !data) {
    return (
      <PageFrame>
        <PageHeader title="Equipe" sub="Produtividade da equipe" />
        <ErrorBanner onRetry={onRetry}>Não foi possível carregar os indicadores.</ErrorBanner>
      </PageFrame>
    )
  }

  const k = data.kpis
  const critOverdue = k.tarefasAtrasadas > 0
  const maxCarga = Math.max(8, ...data.carga.map((c) => c.atribuidas))
  const dias = data.distribuicao.dias
  const semPrazoTotal = data.distribuicao.linhas.reduce((a, l) => a + l.semPrazo, 0)
  const heatCols = `132px repeat(${dias.length}, minmax(22px, 1fr)) 52px 46px`
  const diaTitulo = (iso: string) => {
    const d = tParse(iso)
    return `${d.getDate()} ${MO[d.getMonth()]}`
  }
  const diasConcl = data.conclusoes.dias
  const conclCols = `132px repeat(${diasConcl.length}, minmax(22px, 1fr)) 46px`
  const hojeConcl = diasConcl[diasConcl.length - 1]

  return (
    <PageFrame>
      <PageHeader title="Equipe" sub="Produtividade da equipe nos projetos ativos · últimos 7 dias" />

      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
        <KpiCard label="Projetos ativos" value={k.projetosAtivos} icon="layoutGrid" sub={`${projetos.length} no total`} />
        <KpiCard label="Tarefas atrasadas" value={k.tarefasAtrasadas} icon="flame" tone={critOverdue ? "crit" : undefined} sub={critOverdue ? "exigem ação imediata" : "tudo no prazo"} />
        <KpiCard label="Conclusão no prazo" value={k.taxaNoPrazoPct != null ? `${k.taxaNoPrazoPct}%` : "—"} icon="checkCircle" sub="últimos 30 dias" />
        <KpiCard label="Cycle time médio" value={k.cycleTimeDias != null ? `${k.cycleTimeDias} d` : "—"} icon="clock" sub="da abertura à conclusão" />
      </div>

      {critOverdue && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 18, marginTop: -8, background: "var(--crit-soft)", borderRadius: 10, border: "1px solid color-mix(in srgb, var(--crit) 24%, transparent)" }}>
          <Icon name="alertTriangle" size={16} strokeWidth={1.9} style={{ color: "var(--crit)", flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: "var(--text)" }}>
            <strong style={{ fontWeight: 500 }}>{k.tarefasAtrasadas} tarefas atrasadas</strong> em projetos ativos. Priorize a reatribuição ou o reagendamento.
          </span>
        </div>
      )}

      {/* Por área */}
      {data.porArea.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <CardTitle title="Por área" sub="Projetos ativos e tarefas atrasadas agrupados pela área do direito" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginTop: 10 }}>
            {data.porArea.map((a) => (
              <div key={a.area} style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {resolveAreaLabel(areas, a.area) || a.area}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 24, fontWeight: 500, fontFeatureSettings: '"tnum"', color: "var(--text)", letterSpacing: "-0.03em" }}>{a.projetosAtivos}</span>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>projeto{a.projetosAtivos === 1 ? "" : "s"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
                  {a.tarefasAtrasadas > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--crit)", fontFeatureSettings: '"tnum"' }}>
                      <Icon name="flame" size={11} strokeWidth={2} />
                      {a.tarefasAtrasadas} atras.
                    </span>
                  )}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--ok)", fontFeatureSettings: '"tnum"' }}>
                    <Icon name="check" size={11} strokeWidth={2.4} />
                    {a.tarefasConcluidas30d} 30d
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Saúde por projeto */}
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
            <CardTitle title="Saúde por projeto" sub="Clique para abrir o projeto" />
          </div>
          {!data.projetos.length ? (
            <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 13, color: "var(--text-subtle)" }}>Nenhum projeto ainda.</div>
          ) : (
            <table className="dash-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "var(--bg-soft)" }}>
                  <th>Projeto</th>
                  <th style={{ width: 90 }}>Resp.</th>
                  <th>Progresso</th>
                  <th style={{ width: 92, textAlign: "center" }}>Saúde</th>
                  <th style={{ width: 64, textAlign: "right" }}>Atras.</th>
                </tr>
              </thead>
              <tbody>
                {data.projetos.map((p) => (
                  <tr key={p.id} className="dash-row" onClick={() => onOpenProject(p.id)} style={{ cursor: "pointer", borderTop: "1px solid var(--border)" }}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, maxWidth: "100%" }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: corDe(p.id), flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome}</span>
                      </span>
                    </td>
                    <td>
                      {p.responsavel ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <AssigneeAvatar id={p.responsavel.id} size={20} />
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.responsavel.first}</span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-subtle)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <span style={{ flex: 1 }}><ProgressBar value={p.progresso} color={corDe(p.id)} /></span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFeatureSettings: '"tnum"', width: 28, textAlign: "right" }}>{p.progresso}%</span>
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}><SaudeChip saude={p.saude} compact /></td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, fontFeatureSettings: '"tnum"', color: p.atrasadas > 0 ? "var(--crit)" : "var(--text-subtle)" }}>{p.atrasadas || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Carga por pessoa */}
        <div className="card" style={{ padding: 16 }}>
          <CardTitle title="Carga por pessoa" sub="Tarefas abertas · concluídas na semana" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
            {data.carga.map((c) => {
              const over = c.atribuidas >= 7
              return (
                <div key={c.membro.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                    <AssigneeAvatar id={c.membro.id} size={22} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{c.membro.first}</span>
                    <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{c.membro.role}</span>
                    <div style={{ flex: 1 }} />
                    {over && <span style={{ fontSize: 10.5, fontWeight: 500, color: "var(--warn)", background: "var(--warn-soft)", padding: "1px 7px", borderRadius: 999 }}>sobrecarga</span>}
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", fontFeatureSettings: '"tnum"' }}>{c.atribuidas}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 31 }}>
                    <ProgressBar value={(c.atribuidas / maxCarga) * 100} color={over ? "var(--warn)" : "var(--accent)"} height={6} />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ok)", whiteSpace: "nowrap" }}><Icon name="check" size={11} strokeWidth={2.4} />{c.concluidasSemana}</span>
                    {c.atrasadas > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--crit)", whiteSpace: "nowrap" }}><Icon name="flame" size={11} strokeWidth={2} />{c.atrasadas}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Distribuição futura da carga */}
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <CardTitle title="Distribuição da equipe" sub="Tarefas abertas por dia · próximos 14 dias (hoje em diante)" />
        {!data.distribuicao.linhas.length ? (
          <div style={{ padding: "18px 0", textAlign: "center", fontSize: 13, color: "var(--text-subtle)" }}>Nenhuma tarefa futura agendada.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 620 }}>
              <div style={{ display: "grid", gridTemplateColumns: heatCols, gap: 4, alignItems: "end", marginBottom: 7 }}>
                <span />
                {dias.map((d, i) => {
                  const dt = tParse(d)
                  const today = i === 0
                  const weekend = dt.getDay() === 0 || dt.getDay() === 6
                  return (
                    <div key={d} style={{ textAlign: "center", lineHeight: 1.25, fontSize: 10, color: today ? "var(--accent)" : weekend ? "var(--text-subtle)" : "var(--text-muted)", fontWeight: today ? 600 : 500 }}>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.02em" }}>{WD[dt.getDay()]}</div>
                      <div style={{ fontFeatureSettings: '"tnum"' }}>{dt.getDate()}</div>
                    </div>
                  )
                })}
                <div style={{ textAlign: "center", fontSize: 10, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Depois</div>
                <div style={{ textAlign: "center", fontSize: 10, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Total</div>
              </div>
              {data.distribuicao.linhas.map((l) => (
                <div key={l.membro.id} style={{ display: "grid", gridTemplateColumns: heatCols, gap: 4, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <AssigneeAvatar id={l.membro.id} size={20} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.membro.first}</span>
                  </span>
                  {l.counts.map((c, i) => {
                    const dt = tParse(dias[i])
                    return <HeatCell key={dias[i]} count={c} today={i === 0} weekend={dt.getDay() === 0 || dt.getDay() === 6} title={`${l.membro.first} · ${diaTitulo(dias[i])}: ${c} tarefa${c === 1 ? "" : "s"}`} />
                  })}
                  <div style={{ textAlign: "center", fontSize: 12, color: l.depois ? "var(--text-muted)" : "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>{l.depois || "—"}</div>
                  <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--text)", fontFeatureSettings: '"tnum"' }}>{l.total}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {semPrazoTotal > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 11.5, color: "var(--text-subtle)" }}>
            <Icon name="alertCircle" size={13} strokeWidth={1.9} />
            {semPrazoTotal} tarefa{semPrazoTotal === 1 ? "" : "s"} aberta{semPrazoTotal === 1 ? "" : "s"} sem prazo definido — não aparece{semPrazoTotal === 1 ? "" : "m"} na distribuição.
          </div>
        )}
      </div>

      {/* Conclusões por pessoa */}
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <CardTitle title="Conclusões por pessoa" sub="Tarefas concluídas por dia · últimos 14 dias (até hoje)" />
        {!data.conclusoes.linhas.length ? (
          <div style={{ padding: "18px 0", textAlign: "center", fontSize: 13, color: "var(--text-subtle)" }}>Nenhuma tarefa concluída no período.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 620 }}>
              <div style={{ display: "grid", gridTemplateColumns: conclCols, gap: 4, alignItems: "end", marginBottom: 7 }}>
                <span />
                {diasConcl.map((d) => {
                  const dt = tParse(d)
                  const today = d === hojeConcl
                  const weekend = dt.getDay() === 0 || dt.getDay() === 6
                  return (
                    <div key={d} style={{ textAlign: "center", lineHeight: 1.25, fontSize: 10, color: today ? "var(--accent)" : weekend ? "var(--text-subtle)" : "var(--text-muted)", fontWeight: today ? 600 : 500 }}>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.02em" }}>{WD[dt.getDay()]}</div>
                      <div style={{ fontFeatureSettings: '"tnum"' }}>{dt.getDate()}</div>
                    </div>
                  )
                })}
                <div style={{ textAlign: "center", fontSize: 10, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Total</div>
              </div>
              {data.conclusoes.linhas.map((l) => (
                <div key={l.membro.id} style={{ display: "grid", gridTemplateColumns: conclCols, gap: 4, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <AssigneeAvatar id={l.membro.id} size={20} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.membro.first}</span>
                  </span>
                  {l.counts.map((c, i) => {
                    const dt = tParse(diasConcl[i])
                    return <HeatCell key={diasConcl[i]} count={c} today={diasConcl[i] === hojeConcl} weekend={dt.getDay() === 0 || dt.getDay() === 6} title={`${l.membro.first} · ${diaTitulo(diasConcl[i])}: ${c} concluída${c === 1 ? "" : "s"}`} />
                  })}
                  <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--text)", fontFeatureSettings: '"tnum"' }}>{l.total}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gargalos */}
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <CardTitle title="Gargalos" sub="Tarefas paradas tempo demais em andamento ou revisão" />
        {!data.gargalos.length ? (
          <div style={{ padding: "18px 0", textAlign: "center", fontSize: 13, color: "var(--text-subtle)" }}>Nenhum gargalo no momento ✓</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.gargalos.map((g, i) => {
              const st = statusMeta(g.status)
              return (
                <div key={g.tarefaId} onClick={() => onOpenTask(g.tarefaId)} className="task-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 8, cursor: "pointer", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.titulo}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />
                    {st.label}
                  </span>
                  {g.responsavel && <AssigneeAvatar id={g.responsavel.id} size={20} />}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 500, color: g.diasParado >= 7 ? "var(--crit)" : "var(--warn)", background: g.diasParado >= 7 ? "var(--crit-soft)" : "var(--warn-soft)", padding: "2px 9px", borderRadius: 6, width: 92, justifyContent: "center" }}>
                    <Icon name="clock" size={11} strokeWidth={2} />
                    {g.diasParado} dias
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageFrame>
  )
}
