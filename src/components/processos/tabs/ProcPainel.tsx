"use client"

// Contencioso · Painel — cockpit do dia: KPIs, prazos próximos (semáforo),
// audiências, caixa de entrada de publicações a triar e tarefas pendentes.
import { useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { FxFrame, CrmBadge, CrmEmpty, CrmPrioTag, useCrmToast } from "@/components/crm/crm-kit"
import { crmDate } from "@/components/crm/crm-fmt"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import type { ProcessosDataset } from "@/lib/processos/dataset"
import type { PublicacaoRow } from "@/lib/processos/types"
import type { AlertaProcesso } from "@/lib/processos/saude"
import type { ProcNav } from "../proc-types"
import { ProcFonte, ProcMovIcon, ProcResp, ProcSemaforo, ProcStat, urgenciaUI } from "../proc-kit"
import { proporPrazos } from "../proc-api"

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"
}
function dataLonga(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00`))
}

function CardHead({ icon, title, right, badge }: { icon: CrmIconName; title: string; right?: ReactNode; badge?: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Icon name={icon} size={16} style={{ color: "var(--text-subtle)" }} />
        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{title}</span>
        {badge && <span style={{ fontSize: 11, fontWeight: 500, background: "var(--warn-soft)", color: "var(--warn)", padding: "1px 8px", borderRadius: 999 }}>{badge}</span>}
      </div>
      {right}
    </div>
  )
}

// Tone + icon by alerta tipo — reuses the semantic soft-fill tokens.
const ALERTA_UI: Record<AlertaProcesso["tipo"], { color: string; soft: string; icon: CrmIconName }> = {
  prazo_risco: { color: "var(--crit)", soft: "var(--crit-soft)", icon: "flag" },
  parado: { color: "var(--warn)", soft: "var(--warn-soft)", icon: "clock" },
  inconsistencia: { color: "var(--text-subtle)", soft: "var(--bg-sunken)", icon: "alertTriangle" },
}

export function ProcPainel({
  dataset, nav, alertas = [], onLancarPrazo, onTriar, capturaFalhou = false,
}: {
  dataset: ProcessosDataset
  nav: ProcNav
  alertas?: AlertaProcesso[]
  onLancarPrazo: () => void
  onTriar: (pub: PublicacaoRow) => void
  capturaFalhou?: boolean
}) {
  const { processos, prazos, audiencias, publicacoes, tarefas, responsaveis, userName, hoje } = dataset
  const router = useRouter()
  const { toast } = useCrmToast()
  const [propondo, setPropondo] = useState(false)
  const respNome = (id: number | null) => (id ? responsaveis.find((u) => u.id === id)?.nome ?? null : null)

  const pend = useMemo(() => prazos.filter((p) => p.status === "pendente"), [prazos])
  const propostos = useMemo(() => prazos.filter((p) => p.status === "proposto"), [prazos])

  const gerarPropostas = async () => {
    setPropondo(true)
    try {
      const r = await proporPrazos()
      toast(`${r.propostos} prazo(s) proposto(s) · ${r.arquivados} movimento(s) arquivado(s)`, { icon: "sparkles" })
      nav.refresh()
    } catch {
      toast("Não foi possível gerar as propostas", { tone: "neg" })
    } finally {
      setPropondo(false)
    }
  }
  const prazosSemana = pend.filter((p) => p.urgencia && p.urgencia.diasRestantes >= 0 && p.urgencia.diasRestantes <= 7)
  const criticos = prazosSemana.filter((p) => p.urgencia && p.urgencia.diasRestantes <= 2).length
  const ativos = processos.filter((p) => p.status !== "arquivado" && p.status !== "baixado")
  const audFuturas = audiencias.filter((a) => a.dia >= hoje)
  const audHoje = audiencias.filter((a) => a.dia === hoje)
  const audSemana = audFuturas.filter((a) => Math.round((Date.parse(`${a.dia}T12:00:00`) - Date.parse(`${hoje}T12:00:00`)) / 86_400_000) <= 7)
  const inbox = publicacoes.filter((p) => p.statusTriagem === "pendente")

  return (
    <FxFrame pad="24px 40px 56px">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Contencioso</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)" }}>{saudacao()}, {userName.split(" ")[0]}</h1>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 5, textTransform: "capitalize" }}>{dataLonga(hoje)} · o que precisa da sua atenção hoje</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={gerarPropostas} disabled={propondo}>
            <Icon name="sparkles" size={15} />{propondo ? "Gerando…" : "Gerar propostas (IA)"}
          </button>
          <button className="btn btn-primary" onClick={onLancarPrazo}><Icon name="flag" size={15} />Lançar prazo</button>
        </div>
      </div>

      {propostos.length > 0 && (
        <button
          onClick={() => nav.setView("prazos")}
          className="crm-row"
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "11px 16px", marginBottom: 18, borderRadius: 10, border: "1px solid var(--border-gold)", background: "var(--accent-soft)", color: "var(--text)", cursor: "pointer", fontSize: 13 }}
        >
          <Icon name="sparkles" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            <strong>{propostos.length} prazo{propostos.length === 1 ? "" : "s"} proposto{propostos.length === 1 ? "" : "s"} pela IA</strong>{" "}
            <span style={{ color: "var(--text-muted)" }}>— revise e confirme na aba Prazos antes de virar definitivo.</span>
          </span>
          <Icon name="arrowRight" size={14} style={{ color: "var(--text-subtle)" }} />
        </button>
      )}

      {capturaFalhou && (
        <button
          onClick={() => nav.setView("captura")}
          className="crm-row"
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "11px 16px", marginBottom: 18, borderRadius: 10, border: "1px solid var(--crit)", background: "var(--crit-soft)", color: "var(--text)", cursor: "pointer", fontSize: 13 }}
        >
          <Icon name="alertTriangle" size={16} style={{ color: "var(--crit)", flexShrink: 0 }} />
          <span style={{ flex: 1 }}><strong>Falha na captura automática.</strong> <span style={{ color: "var(--text-muted)" }}>Uma varredura do CNJ falhou — abra a aba Captura para ver os detalhes.</span></span>
          <Icon name="arrowRight" size={14} style={{ color: "var(--text-subtle)" }} />
        </button>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <ProcStat label="Processos ativos" value={ativos.length} icon="scale" onClick={() => nav.setView("processos")} />
        <ProcStat label="Prazos da semana" value={prazosSemana.length} icon="flag" tone={criticos ? "neg" : prazosSemana.length ? "warn" : null} sub={criticos ? `${criticos} crítico(s)` : "sob controle"} onClick={() => nav.setView("prazos")} />
        <ProcStat label="Audiências da semana" value={audSemana.length} icon="users" sub={audHoje.length ? `${audHoje.length} hoje` : "nenhuma hoje"} />
        <ProcStat label="Publicações a triar" value={inbox.length} icon="inbox" tone={inbox.length ? "warn" : null} onClick={() => nav.setView("andamentos")} />
      </div>

      {/* alertas: processos parados / prazos em risco / inconsistências */}
      {alertas.length > 0 && (
        <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
          <CardHead icon="alertTriangle" title="Alertas" badge={`${alertas.length}`} />
          {alertas.slice(0, 6).map((a, i) => {
            const ui = ALERTA_UI[a.tipo]
            return (
              <button
                key={a.chave}
                onClick={() => { if (a.href) router.push(a.href) }}
                className="crm-row"
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : "none", background: "transparent", border: "none", cursor: "pointer" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, background: ui.soft, flexShrink: 0 }}>
                  <Icon name={ui.icon} size={15} style={{ color: ui.color }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.titulo}</div>
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.detalhe}</div>
                </div>
                <Icon name="arrowRight" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}

      {/* linha 1: prazos próximos + audiências */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, marginBottom: 16, alignItems: "start" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <CardHead icon="flag" title="Prazos próximos" right={<button className="btn btn-ghost btn-sm" onClick={() => nav.setView("prazos")} style={{ fontSize: 12 }}>Ver painel<Icon name="arrowRight" size={13} /></button>} />
          {pend.length === 0 ? (
            <CrmEmpty icon="checkCircle" title="Sem prazos em aberto" sub="Nenhum prazo pendente no momento." />
          ) : (
            pend.slice(0, 6).map((p, i) => (
              <div key={p.id} onClick={() => nav.openProcesso(p.processoId)} className="crm-row" style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                <div style={{ width: 4, alignSelf: "stretch", borderRadius: 3, background: urgenciaUI(p.urgencia).color, flexShrink: 0, margin: "2px 0" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.descricao}</div>
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.numeroCnj ?? "sem número"} · {p.caso ?? "—"}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>fatal {crmDate(p.dataFatal)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>interno {crmDate(p.dataInterna)}</div>
                </div>
                <ProcResp nome={p.responsavel} showName={false} />
                <div style={{ width: 116, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}><ProcSemaforo urgencia={p.urgencia} /></div>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <CardHead icon="calendar" title="Audiências" />
          {audFuturas.length === 0 ? (
            <CrmEmpty icon="calendar" title="Sem audiências" sub="Nenhuma audiência marcada." />
          ) : (
            audFuturas.slice(0, 4).map((a, i) => {
              const d = new Date(`${a.dia}T12:00:00`)
              const isHoje = a.dia === hoje
              return (
                <div key={a.id} onClick={() => a.processoId && nav.openProcesso(a.processoId)} className="crm-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : "none", cursor: a.processoId ? "pointer" : "default" }}>
                  <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 500, color: isHoje ? "var(--accent)" : "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{d.getDate()}</div>
                    <div style={{ fontSize: 10, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][d.getMonth()]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.titulo}</div>
                    <div style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.hora} · {a.caso ?? a.numeroCnj ?? "—"}</div>
                  </div>
                  {isHoje && <CrmBadge tone="gold" dot>hoje</CrmBadge>}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* linha 2: caixa de entrada + tarefas */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <CardHead
            icon="inbox"
            title="Caixa de entrada"
            badge={inbox.length ? `${inbox.length} a triar` : null}
            right={<button className="btn btn-ghost btn-sm" onClick={() => nav.setView("andamentos")} style={{ fontSize: 12 }}>Ver tudo<Icon name="arrowRight" size={13} /></button>}
          />
          {inbox.length === 0 ? (
            <CrmEmpty icon="checkCircle" title="Tudo triado" sub="Nenhuma publicação aguardando análise." />
          ) : (
            inbox.slice(0, 4).map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <ProcMovIcon tipo="publicacao" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.diario ?? "Publicação"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3, minWidth: 0 }}>
                    <ProcFonte fonte="dje" />
                    <span style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.numeroCnj ?? "a vincular"} · {crmDate(a.dataPublicacao ?? a.dataDisponibilizacao ?? a.createdAt)}</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => onTriar(a)} style={{ fontSize: 12, flexShrink: 0 }}><Icon name="flag" size={13} />Triar</button>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <CardHead icon="listChecks" title="Tarefas pendentes" />
          {tarefas.length === 0 ? (
            <CrmEmpty icon="checkCircle" title="Sem tarefas" sub="Nenhuma tarefa pendente com prazo." />
          ) : (
            tarefas.slice(0, 5).map((t, i) => (
              <div key={t.id} className="crm-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <CrmPrioTag p={t.prio} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.titulo}</span>
                {t.prazo && <span style={{ fontSize: 11, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{crmDate(t.prazo)}</span>}
                <ProcResp nome={respNome(t.responsavelId)} showName={false} size={20} />
              </div>
            ))
          )}
        </div>
      </div>
    </FxFrame>
  )
}
