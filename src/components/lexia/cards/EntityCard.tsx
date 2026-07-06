"use client"

// LexIA · Chat — card de entidade automático (handoff, Fase 3). Uma linha
// compacta (CcRow) quando faz parte de uma lista, um card de detalhe (CcDetail)
// quando é o resultado de uma consulta única — ambos construídos 100% sobre o
// cc-kit (Fase 1). Roteia por `kind`; o "Abrir no app" usa a rota que veio do
// mapeamento em agent/cards.ts.
import { useRouter } from "next/navigation"
import {
  CC_FUNNEL_LABEL,
  CcAvatar,
  CcBadge,
  CcDetail,
  CcField,
  CcFunnelStepper,
  CcGrid,
  CcIconBox,
  CcMoney,
  CcPayProgress,
  CcRow,
  CcUrgencyBanner,
  ccUrgency,
  type CcTone,
} from "../cc/CcKit"
import type {
  CardClienteData,
  CardDataByKind,
  CardEntityData,
  CardEventoData,
  CardHonorarioData,
  CardKind,
  CardLancamentoData,
  CardLeadData,
  CardProcessoData,
  CardTarefaData,
  EntityCardPayload,
  EntityListCardPayload,
} from "@/lib/lexia/cards-types"

const fmtDataHora = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}
const fmtData = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR")

const CLI_STATUS: Record<string, { label: string; tone: CcTone }> = {
  ativo: { label: "Em dia", tone: "ok" },
  pausado: { label: "Pausado", tone: "warn" },
  suspenso: { label: "Suspenso", tone: "crit" },
}

// ── Cliente ──────────────────────────────────────────────────────────────────
function ClienteRowView({ c, onClick }: { c: CardClienteData; onClick: () => void }) {
  return (
    <CcRow
      onClick={onClick}
      leading={<CcAvatar label={c.nome} />}
      title={c.nome}
      meta={[c.cidade, c.uf].filter(Boolean).join("/") || undefined}
      rightTop={c.status && <CcBadge tone={CLI_STATUS[c.status]?.tone ?? "neutral"}>{CLI_STATUS[c.status]?.label ?? c.status}</CcBadge>}
    />
  )
}
function ClienteDetailView({ c, onOpen }: { c: CardClienteData; onOpen: () => void }) {
  const st = c.status ? CLI_STATUS[c.status] : null
  return (
    <CcDetail leading={<CcAvatar label={c.nome} size={34} />} title={c.nome} sub={[c.cidade, c.uf].filter(Boolean).join("/") || undefined} badge={st && <CcBadge tone={st.tone}>{st.label}</CcBadge>} onOpen={onOpen}>
      <CcGrid>
        {c.numCasos != null && <CcField label="Casos">{c.numCasos}</CcField>}
        {c.telefone && <CcField label="Telefone">{c.telefone}</CcField>}
        {c.email && <CcField label="E-mail">{c.email}</CcField>}
      </CcGrid>
    </CcDetail>
  )
}

// ── Lead ─────────────────────────────────────────────────────────────────────
function LeadRowView({ l, onClick }: { l: CardLeadData; onClick: () => void }) {
  return <CcRow onClick={onClick} leading={<CcAvatar label={l.nome} tone="gold" />} title={l.nome} meta={CC_FUNNEL_LABEL[l.estagio]} rightTop={l.valorCents != null ? <CcMoney valueCents={l.valorCents} plain /> : undefined} />
}
function LeadDetailView({ l, onOpen }: { l: CardLeadData; onOpen: () => void }) {
  return (
    <CcDetail leading={<CcAvatar label={l.nome} size={34} tone="gold" />} title={l.nome} sub={l.origem ?? undefined} onOpen={onOpen}>
      <CcFunnelStepper stage={l.estagio} />
    </CcDetail>
  )
}

// ── Lançamento ───────────────────────────────────────────────────────────────
function LancamentoRowView({ it, onClick }: { it: CardLancamentoData; onClick: () => void }) {
  return (
    <CcRow
      onClick={onClick}
      leading={<CcIconBox icon={it.dir === "in" ? "trendingUp" : "trendingDown"} tone={it.dir === "in" ? "ok" : "crit"} />}
      title={it.desc}
      meta={it.venc ? fmtData(it.venc) : undefined}
      rightTop={<CcMoney valueCents={it.valorCents} dir={it.dir} />}
      rightBottom={<CcBadge tone={it.pago ? "ok" : "neutral"} size="sm">{it.pago ? "Pago" : "Pendente"}</CcBadge>}
    />
  )
}

// ── Honorário ────────────────────────────────────────────────────────────────
function HonorarioRowView({ h, onClick }: { h: CardHonorarioData; onClick: () => void }) {
  return (
    <CcRow
      onClick={onClick}
      leading={<CcIconBox icon="wallet" tone="gold" />}
      title={h.descricao}
      meta={h.cliente ?? undefined}
      rightTop={<CcMoney valueCents={h.valorCents} plain />}
      rightBottom={<CcBadge tone={h.status === "recebido" ? "ok" : "neutral"} size="sm">{h.status === "recebido" ? "Recebido" : "Pendente"}</CcBadge>}
    />
  )
}
function HonorarioDetailView({ h, onOpen }: { h: CardHonorarioData; onOpen: () => void }) {
  return (
    <CcDetail leading={<CcIconBox icon="wallet" tone="gold" size={34} />} title={h.descricao} sub={h.cliente ?? undefined} onOpen={onOpen}>
      <CcMoney valueCents={h.valorCents} plain size={18} weight={600} />
      {h.valorPagoCents != null && <CcPayProgress totalCents={h.valorCents} paidCents={h.valorPagoCents} />}
    </CcDetail>
  )
}

// ── Tarefa ───────────────────────────────────────────────────────────────────
const PRIO_LABEL: Record<number, string> = { 1: "Baixa", 2: "Média", 3: "Alta", 4: "Urgente" }
function TarefaRowView({ t, onClick }: { t: CardTarefaData; onClick: () => void }) {
  const diasPrazo = t.prazo ? diasAte(t.prazo) : null
  const u = ccUrgency(diasPrazo)
  return <CcRow onClick={onClick} leading={<CcIconBox icon="checkSquare" tone={u.tone === "neutral" ? "neutral" : u.tone} />} title={t.titulo} meta={t.responsavel ?? undefined} rightTop={t.prazo && <CcBadge tone={u.tone} size="sm">{u.label}</CcBadge>} />
}
function TarefaDetailView({ t, onOpen }: { t: CardTarefaData; onOpen: () => void }) {
  const diasPrazo = t.prazo ? diasAte(t.prazo) : null
  const u = ccUrgency(diasPrazo)
  return (
    <CcDetail leading={<CcIconBox icon="checkSquare" size={34} />} title={t.titulo} sub={t.responsavel ?? undefined} onOpen={onOpen} banner={t.prazo ? <CcUrgencyBanner tone={u.tone} icon="clock" eyebrow="Prazo" label={u.label} /> : undefined}>
      <CcGrid>
        {t.prio != null && <CcField label="Prioridade">{PRIO_LABEL[t.prio] ?? t.prio}</CcField>}
        <CcField label="Status">{t.status}</CcField>
      </CcGrid>
    </CcDetail>
  )
}

// ── Processo/Caso ────────────────────────────────────────────────────────────
function ProcessoRowView({ p, onClick }: { p: CardProcessoData; onClick: () => void }) {
  const u = ccUrgency(p.diasPrazo ?? null)
  return <CcRow onClick={onClick} leading={<CcIconBox icon="briefcase" />} title={p.titulo ?? p.numeroCnj ?? `Processo #${p.id}`} meta={p.caso ?? p.classe ?? undefined} rightTop={<CcBadge tone={p.diasPrazo != null ? u.tone : "neutral"} size="sm">{p.diasPrazo != null ? u.label : p.status}</CcBadge>} />
}
function ProcessoDetailView({ p, onOpen }: { p: CardProcessoData; onOpen: () => void }) {
  const u = ccUrgency(p.diasPrazo ?? null)
  return (
    <CcDetail
      leading={<CcIconBox icon="briefcase" size={34} />}
      title={p.titulo ?? p.numeroCnj ?? `Processo #${p.id}`}
      sub={p.classe ?? undefined}
      badge={<CcBadge tone="neutral">{p.status}</CcBadge>}
      onOpen={onOpen}
      banner={p.diasPrazo != null ? <CcUrgencyBanner tone={u.tone} icon="clock" eyebrow="Próximo prazo" label={u.label} /> : undefined}
    >
      {p.numeroCnj && <CcGrid><CcField label="Nº CNJ">{p.numeroCnj}</CcField></CcGrid>}
    </CcDetail>
  )
}

// ── Evento (Agenda) ──────────────────────────────────────────────────────────
function EventoRowView({ e, onClick }: { e: CardEventoData; onClick: () => void }) {
  return <CcRow onClick={onClick} leading={<CcIconBox icon="calendar" />} title={e.titulo} meta={fmtDataHora(e.data)} rightTop={e.local ? <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{e.local}</span> : undefined} />
}
function EventoDetailView({ e, onOpen }: { e: CardEventoData; onOpen: () => void }) {
  return (
    <CcDetail leading={<CcIconBox icon="calendar" size={34} />} title={e.titulo} sub={fmtDataHora(e.data)} onOpen={onOpen}>
      {e.local && <CcGrid><CcField label="Local">{e.local}</CcField></CcGrid>}
    </CcDetail>
  )
}

function diasAte(iso: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(`${iso}T00:00:00`)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

const ROW_BY_KIND: { [K in CardKind]: (data: CardDataByKind[K], onClick: () => void) => React.ReactNode } = {
  cliente: (d, onClick) => <ClienteRowView c={d} onClick={onClick} />,
  lead: (d, onClick) => <LeadRowView l={d} onClick={onClick} />,
  lancamento: (d, onClick) => <LancamentoRowView it={d} onClick={onClick} />,
  honorario: (d, onClick) => <HonorarioRowView h={d} onClick={onClick} />,
  tarefa: (d, onClick) => <TarefaRowView t={d} onClick={onClick} />,
  processo: (d, onClick) => <ProcessoRowView p={d} onClick={onClick} />,
  evento: (d, onClick) => <EventoRowView e={d} onClick={onClick} />,
}

// Nem todo kind tem um card de DETALHE dedicado (só os que têm uma tool
// `detalhe_*`: cliente, caso/processo, honorário). Tarefa/Evento também
// ganham um; Lançamento e Lead não têm tool de detalhe hoje — cai na linha.
const DETAIL_BY_KIND: Partial<{ [K in CardKind]: (data: CardDataByKind[K], onOpen: () => void) => React.ReactNode }> = {
  cliente: (d, onOpen) => <ClienteDetailView c={d} onOpen={onOpen} />,
  lead: (d, onOpen) => <LeadDetailView l={d} onOpen={onOpen} />,
  honorario: (d, onOpen) => <HonorarioDetailView h={d} onOpen={onOpen} />,
  tarefa: (d, onOpen) => <TarefaDetailView t={d} onOpen={onOpen} />,
  processo: (d, onOpen) => <ProcessoDetailView p={d} onOpen={onOpen} />,
  evento: (d, onOpen) => <EventoDetailView e={d} onOpen={onOpen} />,
}

/** Renderiza uma linha compacta para qualquer kind (reusado pelo SearchResultsCard). */
export function EntityRow({ kind, data, rota }: { kind: CardKind; data: CardEntityData; rota?: string }) {
  const router = useRouter()
  return <>{ROW_BY_KIND[kind](data as never, () => rota && router.push(rota))}</>
}

export function EntityCard({ payload }: { payload: EntityCardPayload | EntityListCardPayload }) {
  const router = useRouter()
  const open = (rota?: string) => rota && router.push(rota)

  if (payload.type === "entity") {
    if (payload.variant === "detail") {
      const detail = DETAIL_BY_KIND[payload.kind]
      if (detail) return <>{detail(payload.data as never, () => open(payload.rota))}</>
    }
    return <>{ROW_BY_KIND[payload.kind](payload.data as never, () => open(payload.rota))}</>
  }

  // entity-list
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {payload.itens.map((item, i) => (
        <div key={i}>{ROW_BY_KIND[payload.kind](item as never, () => {})}</div>
      ))}
      {payload.truncado && payload.rota && (
        <button className="btn btn-secondary btn-sm" onClick={() => open(payload.rota)} style={{ alignSelf: "flex-start", fontSize: 12 }}>
          Ver todos
        </button>
      )}
    </div>
  )
}
