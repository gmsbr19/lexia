import type { ReactNode } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Building,
  Calendar,
  Clock,
  Gavel,
  ListChecks,
  Megaphone,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { formatBRL, formatBRLCompact } from "@/lib/finance/money"
import type { DashboardData } from "@/lib/inicio/dashboard"
import * as s from "./dashboard.css"

const EVT_LABEL: Record<string, string> = { audiencia: "Audiência", prazo: "Prazo", reuniao: "Reunião", outro: "Evento" }

/** ISO "YYYY-MM-DD" → "dd/mm". */
function diaMes(iso: string | null): string {
  if (!iso) return "—"
  const [, m, d] = iso.slice(0, 10).split("-")
  return d && m ? `${d}/${m}` : iso
}
function quandoEvt(inicio: string, diaInteiro: boolean): string {
  const base = diaMes(inicio)
  return diaInteiro || inicio.length <= 10 ? base : `${base} · ${inicio.slice(11, 16)}`
}
function pct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(0)}%`
}

/* ── primitives (port of the design's Stat / PanelHead / EmptyNote) ── */
function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "crit" | "plain" }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue({ tone: tone ?? "plain" })}>{value}</div>
    </div>
  )
}

function PanelHead({ icon: Icon, title, href, link }: { icon: LucideIcon; title: string; href: string; link: string }) {
  return (
    <div className={s.panelHead}>
      <span className={s.panelIco}>
        <Icon size={17} strokeWidth={1.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={s.panelTitle}>{title}</div>
      </div>
      <Link href={href} className={s.panelLink}>
        {link}
        <ArrowUpRight size={13} />
      </Link>
    </div>
  )
}

function Kpi({
  label,
  icon: Icon,
  value,
  valTone,
  sub,
  subTone,
}: {
  label: string
  icon: LucideIcon
  value: string
  valTone?: "crit" | "plain"
  sub: ReactNode
  subTone?: "crit" | "sub"
}) {
  return (
    <div className={s.kpiCard}>
      <div className={s.kpiTop}>
        <span className={s.kpiLabel}>{label}</span>
        <Icon size={15} strokeWidth={1.8} style={{ color: valTone === "crit" ? "var(--crit)" : "var(--text-subtle)", flexShrink: 0 }} />
      </div>
      <div className={s.kpiValue({ tone: valTone ?? "plain" })}>{value}</div>
      <div className={s.kpiSub({ tone: subTone ?? "sub" })}>{sub}</div>
    </div>
  )
}

export function OfficeDashboard({ data, verFin }: { data: DashboardData; verFin: boolean }) {
  const { financeiro: f, prazos, agenda, tarefas, comercial: cm, escritorio: e } = data
  const delta = f.recebidoDeltaPct

  return (
    <div>
      {/* KPI strip */}
      <div className={s.kpiGrid}>
        {verFin && (
          <>
            <Kpi
              label="Recebido no mês"
              icon={Banknote}
              value={formatBRL(f.recebidoMesCents)}
              sub={
                delta == null ? (
                  "sem comparação"
                ) : (
                  <>
                    {delta >= 0 ? <TrendingUp size={12} strokeWidth={2} /> : <TrendingDown size={12} strokeWidth={2} />}
                    {`${pct(delta)} vs. mês anterior`}
                  </>
                )
              }
              subTone={delta != null && delta < 0 ? "crit" : "sub"}
            />
            <Kpi
              label="A receber"
              icon={Clock}
              value={formatBRL(f.aReceberCents)}
              sub={`${f.aReceberCount} título${f.aReceberCount === 1 ? "" : "s"} em aberto`}
            />
            <Kpi
              label="Vencido"
              icon={AlertTriangle}
              value={formatBRL(f.vencidoCents)}
              valTone={f.vencidoCents > 0 ? "crit" : "plain"}
              sub={`${f.vencidoClientes} cliente${f.vencidoClientes === 1 ? "" : "s"}`}
              subTone={f.vencidoCents > 0 ? "crit" : "sub"}
            />
          </>
        )}
        <Kpi
          label="Prazos · 7 dias"
          icon={Gavel}
          value={String(prazos.sete)}
          sub={prazos.vencidos > 0 ? `${prazos.vencidos} vencido${prazos.vencidos === 1 ? "" : "s"}` : "nenhum vencido"}
          subTone={prazos.vencidos > 0 ? "crit" : "sub"}
        />
        <Kpi
          label="Tarefas atrasadas"
          icon={ListChecks}
          value={String(tarefas.atrasadas)}
          valTone={tarefas.atrasadas > 0 ? "crit" : "plain"}
          sub={`${tarefas.hoje} para hoje`}
          subTone={tarefas.atrasadas > 0 ? "crit" : "sub"}
        />
      </div>

      {/* two columns of stacked panels */}
      <div className={s.panelCols}>
        {/* left column */}
        <div className={s.panelCol}>
          {/* Prazos & Processos */}
          <div className={s.panel}>
            <PanelHead icon={Scale} title="Prazos & Processos" href="/processos?view=prazos" link="Ver processos" />
            <div className={s.statRow} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <Stat label="Vencidos" value={prazos.vencidos} tone={prazos.vencidos > 0 ? "crit" : "plain"} />
              <Stat label="Hoje" value={prazos.hoje} />
              <Stat label="Próximos 7 dias" value={prazos.sete} />
            </div>
            <div className={s.panelDivider} />
            {prazos.exemplos.length === 0 ? (
              <div className={s.emptyNote}>Nenhum prazo em aberto nos próximos dias.</div>
            ) : (
              <div>
                {prazos.exemplos.slice(0, 5).map((p) => (
                  <Link key={p.prazoId} href={`/processos/${p.processoId}`} className={s.finRow}>
                    <span className={s.dot({ tom: p.vencido ? "crit" : "gold" })} />
                    <span className={s.finRowName}>{p.descricao}</span>
                    <span className={s.finRowValue({ tone: p.vencido ? "crit" : "muted" })}>{diaMes(p.dataFatal)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Agenda */}
          <div className={s.panel}>
            <PanelHead icon={Calendar} title="Agenda · próximos 7 dias" href="/agenda" link="Ver agenda" />
            {agenda.eventos.length === 0 ? (
              <div className={s.emptyNote}>Sem compromissos nos próximos 7 dias.</div>
            ) : (
              <div>
                {agenda.eventos.map((ev) => (
                  <Link key={ev.id} href="/agenda" className={s.finRow}>
                    <span className={s.dot({ tom: ev.tipo === "audiencia" || ev.tipo === "prazo" ? "gold" : "sub" })} />
                    <span className={s.finRowName}>
                      {ev.titulo}
                      <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>
                        {[" · " + (EVT_LABEL[ev.tipo] ?? "Evento"), ev.cliente].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className={s.finRowValue({ tone: "muted" })}>{quandoEvt(ev.inicio, ev.diaInteiro)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Comercial */}
          <div className={s.panel}>
            <PanelHead icon={Megaphone} title="Comercial · mês" href="/comercial" link="Ver comercial" />
            <div className={s.statRow} style={{ gridTemplateColumns: `repeat(${verFin ? 4 : 3}, 1fr)` }}>
              <Stat label="Leads" value={cm.leads} />
              <Stat label="Conversões" value={cm.conversoes} />
              <Stat label="Taxa" value={cm.taxaConversaoPct == null ? "—" : `${cm.taxaConversaoPct.toFixed(0)}%`} />
              {verFin && <Stat label="ROAS" value={cm.roas == null ? "—" : `${cm.roas.toFixed(1)}×`} />}
            </div>
            {verFin && (
              <>
                <div className={s.panelDivider} />
                <div className={s.kvRow}>
                  <span>Investimento</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatBRL(cm.investimentoCents)}</span>
                </div>
                <div className={s.kvRow}>
                  <span>Valor contratado</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)", fontWeight: 500 }}>
                    {formatBRL(cm.valorContratadoCents)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* right column */}
        <div className={s.panelCol}>
          {/* Financeiro — oculto para a "Equipe" (sem acesso ao financeiro) */}
          {verFin && (
          <div className={s.panel}>
            <PanelHead icon={Wallet} title="Financeiro" href="/financeiro" link="Ver financeiro" />
            <div className={s.statRow} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <Stat label="Recebido · mês" value={formatBRLCompact(f.recebidoMesCents)} />
              <Stat label="A receber" value={formatBRLCompact(f.aReceberCents)} />
              <Stat label="Vencido" value={formatBRLCompact(f.vencidoCents)} tone={f.vencidoCents > 0 ? "crit" : "plain"} />
            </div>
            <div className={s.panelDivider} />
            {f.devedores.length === 0 ? (
              <div className={s.emptyNote}>Sem inadimplência a cobrar.</div>
            ) : (
              <div>
                {f.devedores.map((d) => (
                  <Link key={d.id} href={`/clientes/${d.id}?tab=financeiro`} className={s.finRow}>
                    <span className={s.finRowName}>{d.nome}</span>
                    <span className={s.finRowValue({ tone: "muted" })}>{formatBRL(d.valorCents)}</span>
                  </Link>
                ))}
              </div>
            )}
            {f.emEsperaCount > 0 && (
              <>
                <div className={s.panelDivider} />
                <div className={s.emptyNote}>
                  {f.emEsperaCount} cliente{f.emEsperaCount === 1 ? "" : "s"} em espera (cobrança pausada, “não cobrar” ou que voltaram a pagar).
                </div>
              </>
            )}
          </div>
          )}

          {/* Tarefas */}
          <div className={s.panel}>
            <PanelHead icon={ListChecks} title="Tarefas" href="/tarefas" link="Ver tarefas" />
            <div className={s.statRow} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <Stat label="Atrasadas" value={tarefas.atrasadas} tone={tarefas.atrasadas > 0 ? "crit" : "plain"} />
              <Stat label="Para hoje" value={tarefas.hoje} />
              <Stat label="Pendentes" value={tarefas.pendentes} />
            </div>
            <div className={s.panelDivider} />
            {tarefas.itens.length === 0 ? (
              <div className={s.emptyNote}>Tudo em dia — sem tarefas pendentes.</div>
            ) : (
              <div>
                {tarefas.itens.map((t) => (
                  <Link key={t.id} href={`/tarefas?tarefa=${t.id}`} className={s.taskRow}>
                    <span className={s.dot({ tom: t.atrasada ? "crit" : t.hoje ? "warn" : "sub" })} />
                    <span className={s.taskName}>{t.titulo}</span>
                    <span className={s.taskMeta} style={{ color: t.atrasada ? "var(--crit)" : undefined }}>
                      {t.prazo ? diaMes(t.prazo) : "—"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Escritório */}
          <div className={s.panel}>
            <PanelHead icon={Building} title="Escritório" href="/clientes" link="Ver clientes" />
            <div className={s.statRow} style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              <Stat label="Casos ativos" value={e.casosAtivos} />
              <Stat label="Clientes" value={e.clientesTotal} />
            </div>
            {/* "Casos sem honorário" expõe receita potencial — só para quem vê o financeiro. */}
            {verFin && (
              <>
                <div className={s.panelDivider} />
                {e.casosSemFee > 0 ? (
                  <Link href="/financeiro?tab=casos-sem-honorario" className={s.highlightRow}>
                    <span className={s.dot({ tom: "gold" })} style={{ marginTop: 5 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className={s.highlightTitle}>
                        {e.casosSemFee} caso{e.casosSemFee === 1 ? "" : "s"} sem honorário
                      </span>
                      <span className={s.highlightSub}>Potencial estimado de {formatBRLCompact(e.potencialCents)}</span>
                    </span>
                    <ArrowUpRight size={15} style={{ color: "var(--text-subtle)", flexShrink: 0, marginTop: 3 }} />
                  </Link>
                ) : (
                  <div className={s.emptyNote}>Todos os casos ativos têm honorário lançado.</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
