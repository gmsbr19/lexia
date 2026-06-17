"use client"

// Contencioso · Prazos & agenda — lista agrupada por urgência (semáforo) +
// calendário. Distinção fatal (limite legal) × interno (margem da equipe).
import { useMemo, useState } from "react"
import { FxFrame, FxSegmented, FxSelect, CrmBadge, CrmEmpty, CrmPageHead, useCrmToast } from "@/components/crm/crm-kit"
import { crmDate } from "@/components/crm/crm-fmt"
import { Icon } from "@/components/crm/crm-icons"
import type { ProcessosDataset } from "@/lib/processos/dataset"
import type { PrazoRow } from "@/lib/processos/types"
import type { ProcNav } from "../proc-types"
import { ProcDot, ProcResp, ProcSemaforo, ProcStat, urgenciaUI } from "../proc-kit"
import { confirmarPrazo, cumprirPrazo, rejeitarPrazo } from "../proc-api"
import { ProcPrazoModal } from "../ProcModals"

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export function ProcPrazos({
  dataset, nav, onLancarPrazo,
}: {
  dataset: ProcessosDataset
  nav: ProcNav
  onLancarPrazo: () => void
}) {
  const { prazos, audiencias, responsaveis, hoje } = dataset
  const { toast } = useCrmToast()
  const [view, setView] = useState("lista")
  const [urg, setUrg] = useState("todos")
  const [resp, setResp] = useState("todos")
  const [cursor, setCursor] = useState(() => new Date(`${hoje}T12:00:00`))
  const [editando, setEditando] = useState<PrazoRow | null>(null)

  // Prazos PROPOSTOS pela IA — aguardam confirmação humana (não contam como pendentes).
  const propostos = useMemo(() => prazos.filter((p) => p.status === "proposto"), [prazos])

  const confirmar1 = async (id: number) => {
    try {
      await confirmarPrazo(id)
      toast("Prazo confirmado — agora é definitivo e está na agenda", { icon: "flag" })
      nav.refresh()
    } catch {
      toast("Não foi possível confirmar", { tone: "neg" })
    }
  }
  const rejeitar = async (id: number) => {
    try {
      await rejeitarPrazo(id)
      toast("Proposta rejeitada", { icon: "check" })
      nav.refresh()
    } catch {
      toast("Não foi possível rejeitar", { tone: "neg" })
    }
  }

  const all = useMemo(
    () =>
      prazos
        .filter((p) => p.status === "pendente")
        .filter((p) => resp === "todos" || p.responsavel === resp)
        .filter((p) => {
          if (urg === "todos") return true
          const f = p.urgencia?.faixa
          return urg === "critico" ? f === "vermelho" : urg === "semana" ? f === "ambar" : f === "verde"
        }),
    [prazos, resp, urg],
  )

  const buckets: { id: string; label: string; faixa: string; tone: "neg" | "warn" | "pos" }[] = [
    { id: "crit", label: "Vencendo / atrasados", faixa: "vermelho", tone: "neg" },
    { id: "sem", label: "Esta semana", faixa: "ambar", tone: "warn" },
    { id: "mes", label: "Mais adiante", faixa: "verde", tone: "pos" },
  ]

  const kCrit = all.filter((p) => p.urgencia?.faixa === "vermelho").length
  const kSem = all.filter((p) => p.urgencia?.faixa === "ambar").length
  const audFuturas = audiencias.filter((a) => a.dia >= hoje)

  const protocolar = async (id: number) => {
    try {
      await cumprirPrazo(id)
      toast("Prazo protocolado", { icon: "checkCircle" })
      nav.refresh()
    } catch {
      toast("Não foi possível protocolar", { tone: "neg" })
    }
  }

  const Row = ({ p, top }: { p: PrazoRow; top: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 18px", borderTop: top ? "1px solid var(--border)" : "none" }}>
      <div style={{ width: 4, alignSelf: "stretch", borderRadius: 3, background: urgenciaUI(p.urgencia).color, margin: "2px 0", flexShrink: 0 }} />
      <div onClick={() => nav.openProcesso(p.processoId)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{p.descricao}</div>
        <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.numeroCnj ?? "sem número"} · {p.caso ?? "—"}</div>
      </div>
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>interno</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{crmDate(p.dataInterna)}</div>
      </div>
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "var(--crit)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>fatal</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{crmDate(p.dataFatal)}</div>
      </div>
      <ProcResp nome={p.responsavel} showName={false} />
      <div style={{ width: 116, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}><ProcSemaforo urgencia={p.urgencia} /></div>
      <button className="btn btn-ghost btn-sm" onClick={() => protocolar(p.id)} style={{ fontSize: 12, flexShrink: 0 }}><Icon name="check" size={13} />Protocolar</button>
    </div>
  )

  const renderCal = () => {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const start = new Date(y, m, 1 - new Date(y, m, 1).getDay())
    const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
    const prazosByDay = (iso: string) => all.filter((p) => p.dataFatal === iso)
    const audByDay = (iso: string) => audiencias.filter((a) => a.dia === iso)
    return (
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn btn-ghost" onClick={() => setCursor(new Date(y, m - 1, 1))} style={{ width: 30, height: 30, padding: 0 }}><Icon name="chevronLeft" size={16} /></button>
            <div style={{ minWidth: 150, textAlign: "center", fontSize: 14.5, fontWeight: 500, color: "var(--text)" }}>{MESES[m]} {y}</div>
            <button className="btn btn-ghost" onClick={() => setCursor(new Date(y, m + 1, 1))} style={{ width: 30, height: 30, padding: 0 }}><Icon name="chevronRight" size={16} /></button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: "var(--text-subtle)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><ProcDot tone="neg" />vencendo</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><ProcDot tone="warn" />esta semana</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><ProcDot tone="pos" />adiante</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }} />audiência</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {WD.map((w) => <div key={w} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{w}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "104px" }}>
          {cells.map((d, i) => {
            const iso = isoOf(d)
            const inMonth = d.getMonth() === m
            const isToday = iso === hoje
            const pzs = prazosByDay(iso)
            const aud = audByDay(iso)
            return (
              <div key={i} style={{ borderTop: "1px solid var(--border)", borderRight: i % 7 !== 6 ? "1px solid var(--border)" : "none", padding: 6, background: inMonth ? "transparent" : "var(--bg-soft)", display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums", background: isToday ? "var(--accent)" : "transparent", color: isToday ? "#020D25" : inMonth ? "var(--text)" : "var(--text-subtle)" }}>{d.getDate()}</span>
                </div>
                {pzs.slice(0, 2).map((p) => {
                  const u = urgenciaUI(p.urgencia)
                  return (
                    <button key={p.id} onClick={() => nav.openProcesso(p.processoId)} style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: u.soft, color: u.color, borderRadius: 5, padding: "2px 6px", fontSize: 11, fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />{p.descricao}
                    </button>
                  )
                })}
                {aud.slice(0, 1).map((a) => (
                  <button key={a.id} onClick={() => a.processoId && nav.openProcesso(a.processoId)} style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 5, padding: "2px 6px", fontSize: 11, fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    <Icon name="users" size={10} />{a.hora}
                  </button>
                ))}
                {pzs.length + aud.length > 3 && <div style={{ fontSize: 10, color: "var(--text-subtle)", paddingLeft: 4 }}>+{pzs.length + aud.length - 3}</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <FxFrame>
      <CrmPageHead
        title="Prazos & agenda"
        sub="Prazos processuais em dias úteis · fatal (limite legal) × interno (margem da equipe)"
        right={<button className="btn btn-primary" onClick={onLancarPrazo}><Icon name="flag" size={15} />Lançar prazo</button>}
      />

      {propostos.length > 0 && (
        <div className="card" style={{ overflow: "hidden", marginBottom: 20, borderColor: "var(--border-gold)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--accent-soft)", flexWrap: "wrap" }}>
            <Icon name="sparkles" size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>A confirmar · {propostos.length} prazo{propostos.length === 1 ? "" : "s"} proposto{propostos.length === 1 ? "" : "s"} pela IA</span>
            <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>revise antes de virar definitivo (rascunho não entra na agenda nem notifica)</span>
          </div>
          {propostos.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div onClick={() => nav.openProcesso(p.processoId)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{p.descricao}</div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.numeroCnj ?? "sem número"} · {p.caso ?? "—"}</div>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "var(--crit)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>fatal (sugerido)</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{crmDate(p.dataFatal)}</div>
              </div>
              <div style={{ width: 116, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}><ProcSemaforo urgencia={p.urgencia} /></div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={() => confirmar1(p.id)} style={{ fontSize: 12 }}><Icon name="check" size={13} />Confirmar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditando(p)} style={{ fontSize: 12 }}>Editar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => rejeitar(p.id)} title="Rejeitar proposta" style={{ fontSize: 12, color: "var(--crit)" }}><Icon name="x" size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <ProcStat label="Prazos em aberto" value={all.length} icon="flag" />
        <ProcStat label="Vencendo / atrasados" value={kCrit} icon="alertTriangle" tone={kCrit ? "neg" : null} />
        <ProcStat label="Esta semana" value={kSem} icon="clock" tone={kSem ? "warn" : null} />
        <ProcStat label="Audiências futuras" value={audFuturas.length} icon="users" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <FxSegmented options={[{ value: "lista", label: "Lista", icon: "list" }, { value: "calendario", label: "Calendário", icon: "calendar" }]} value={view} onChange={setView} />
        {view === "lista" && (
          <FxSegmented size="sm" options={[{ value: "todos", label: "Todas" }, { value: "critico", label: "Vencendo" }, { value: "semana", label: "Semana" }, { value: "mes", label: "Adiante" }]} value={urg} onChange={setUrg} />
        )}
        <div style={{ marginLeft: "auto" }}>
          <FxSelect options={["Todos", ...responsaveis.map((u) => u.nome)]} value={resp === "todos" ? "Todos" : resp} onChange={(e) => setResp(e.target.value === "Todos" ? "todos" : e.target.value)} />
        </div>
      </div>

      {view === "lista" ? (
        all.length === 0 ? (
          <div className="card"><CrmEmpty icon="checkCircle" title="Nenhum prazo nesse filtro" sub="Ajuste a urgência ou o responsável." /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {buckets.map((b) => {
              const items = all.filter((p) => p.urgencia?.faixa === b.faixa)
              if (items.length === 0) return null
              return (
                <div key={b.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                    <ProcDot tone={b.tone} />
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{b.label}</span>
                    <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>· {items.length}</span>
                  </div>
                  <div className="card" style={{ overflow: "hidden" }}>
                    {items.map((p, i) => <Row key={p.id} p={p} top={i > 0} />)}
                  </div>
                </div>
              )
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderRadius: 10, background: "var(--bg-sunken)", fontSize: 12.5, color: "var(--text-muted)" }}>
              <Icon name="inbox" size={15} style={{ color: "var(--text-subtle)" }} />
              Para lançar um prazo a partir de uma publicação capturada, use a aba <CrmBadge tone="neutral">Andamentos</CrmBadge>.
            </div>
          </div>
        )
      ) : (
        renderCal()
      )}

      {editando && (
        <ProcPrazoModal
          processos={dataset.processos}
          responsaveis={responsaveis}
          hoje={hoje}
          confirmarPrazoRow={editando}
          onClose={() => setEditando(null)}
          onSaved={() => nav.refresh()}
        />
      )}
    </FxFrame>
  )
}
