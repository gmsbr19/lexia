// Deterministic weekly-briefing + action-plan derivation over the ledger —
// the data behind the Início BriefingCard and /plano-acao. Pure rules today
// (overdue receivables, fee-less active cases, flagged imports); a Claude
// generator can replace the assembly later without changing the surfaces.
// "Potencial" values are estimates (casos sem fee × average honorário) and are
// labeled as such in the UI. SERVER ONLY (imports prisma).
import { prisma } from "@/lib/db"
import { avaliarSilencio, getEstadosCobranca, getPagamentosRecentes, type Silencio } from "@/lib/clientes/cobranca"
import { COBRANCA_ATIVA } from "@/lib/clientes/cobranca-core"
import { dispensadas } from "@/lib/sugestoes/dispensa"
import { formatBRL, formatBRLCompact } from "./money"
import { getKpis } from "./queries"
import type { BriefingData, BriefingPrazo, PlanoAcaoData, PlanoGroup, PlanoReason, PlanoStep } from "./types"

function startOfToday(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Local calendar day "YYYY-MM-DD" (TZ-safe: prazos are stored at local noon). */
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/**
 * Litigation deadlines for the briefing — office-wide, pending, excluding prazos
 * whose processo was soft-deleted (no orphans). One bounded query (dataFatal up to
 * +7d covers both vencidos and próximos); counts + the most urgent examples.
 */
async function getPrazosBriefing(today: Date): Promise<Pick<BriefingData, "prazosVencidos" | "prazosHoje" | "prazos7Dias" | "prazosExemplos">> {
  const limite = new Date(today)
  limite.setDate(today.getDate() + 7)
  limite.setHours(12, 0, 0, 0)
  const todayISO = ymd(today)
  const [rows, dismissed] = await Promise.all([
    prisma.prazo.findMany({
      where: { excluidoEm: null, status: "pendente", processo: { excluidoEm: null }, dataFatal: { lte: limite } },
      orderBy: { dataFatal: "asc" },
      select: {
        id: true,
        descricao: true,
        dataFatal: true,
        processoId: true,
        responsavelUser: { select: { nome: true } },
        processo: { select: { numeroCnj: true } },
      },
    }),
    dispensadas(),
  ])
  let prazosVencidos = 0
  let prazosHoje = 0
  let prazos7Dias = 0
  const prazosExemplos: BriefingPrazo[] = []
  for (const r of rows) {
    if (dismissed.has(`prazo:${r.id}`)) continue // respeita soneca/"nunca mais"
    const fatalISO = ymd(r.dataFatal)
    const vencido = fatalISO < todayISO
    if (vencido) prazosVencidos++
    else {
      prazos7Dias++
      if (fatalISO === todayISO) prazosHoje++
    }
    if (prazosExemplos.length < 6) {
      prazosExemplos.push({
        prazoId: r.id,
        processoId: r.processoId,
        numeroCnj: r.processo?.numeroCnj ?? null,
        descricao: r.descricao,
        dataFatal: fatalISO,
        responsavel: r.responsavelUser?.nome ?? null,
        vencido,
      })
    }
  }
  return { prazosVencidos, prazosHoje, prazos7Dias, prazosExemplos }
}

const OVERDUE_WHERE = (today: Date) => ({
  tipo: "entrada",
  isAnomalia: false,
  status: "aberto",
  dataVencimento: { lt: today },
})

async function ticketMedioCents(): Promise<number> {
  const avg = await prisma.honorario.aggregate({
    _avg: { valorCents: true },
    where: { valorCents: { gt: 0 } },
  })
  return Math.round(avg._avg.valorCents ?? 0)
}

export async function getBriefing(): Promise<BriefingData> {
  const today = startOfToday()
  const cutoff60 = new Date(today)
  cutoff60.setDate(today.getDate() - 60)

  const [kpis, vencido60, vencido60Clientes, casosSemFee, ticket, prazos] = await Promise.all([
    getKpis(),
    prisma.lancamento.aggregate({
      _sum: { valorCents: true },
      where: { ...OVERDUE_WHERE(today), dataVencimento: { lt: cutoff60 } },
    }),
    prisma.lancamento.groupBy({
      by: ["clienteId"],
      where: { ...OVERDUE_WHERE(today), dataVencimento: { lt: cutoff60 } },
    }),
    prisma.caso.count({ where: { status: "Ativo", honorarios: { none: {} } } }),
    ticketMedioCents(),
    getPrazosBriefing(today),
  ])

  return {
    recebidoMesCents: kpis.recebidoMesCents,
    recebidoDeltaPct: kpis.recebidoDeltaPct,
    vencido60Cents: vencido60._sum.valorCents ?? 0,
    vencido60Clientes: vencido60Clientes.length,
    vencidoCents: kpis.vencidoCents,
    casosSemFee,
    potencialCents: casosSemFee * ticket,
    ...prazos,
  }
}

const lancHref = (stat: "vencido" | "avencer", q?: string) =>
  `/financeiro?tab=lancamentos&dir=in&stat=${stat}${q ? `&q=${encodeURIComponent(q)}` : ""}`

export async function getPlanoAcao(): Promise<PlanoAcaoData> {
  const today = startOfToday()
  const soon = new Date(today)
  soon.setDate(today.getDate() + 3)

  const [briefing, overdue, dueSoon, casosSemFee, anomalias, ticket] = await Promise.all([
    getBriefing(),
    prisma.lancamento.findMany({
      where: OVERDUE_WHERE(today),
      select: { valorCents: true, dataVencimento: true, cliente: { select: { id: true, nome: true } } },
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.lancamento.findMany({
      where: { tipo: "entrada", isAnomalia: false, status: "aberto", dataVencimento: { gte: today, lt: soon } },
      select: { valorCents: true, dataVencimento: true, cliente: { select: { nome: true } } },
      orderBy: { dataVencimento: "asc" },
      take: 2,
    }),
    prisma.caso.findMany({
      where: { status: "Ativo", honorarios: { none: {} } },
      select: { id: true, titulo: true, clientePrincipal: { select: { nome: true } } },
      orderBy: { ultimaMovimentacao: "desc" },
    }),
    prisma.lancamento.count({ where: { isAnomalia: true } }),
    ticketMedioCents(),
  ])

  const groups: PlanoGroup[] = []

  // ── 1. Recuperar inadimplência — overdue receivables grouped per cliente ──
  // A per-cliente collection memory (notes) can SILENCE a debtor: paused until a
  // date, suspended ("não cobrar mais"), or auto-softened because they JUST paid.
  // Silenced debtors move to a deprioritized "em espera" group (1b) so they stop
  // being chased daily but stay visible.
  type Dev = { id: number | null; nome: string; sumCents: number; titulos: number; maxDias: number }
  const byCliente = new Map<number | string, Dev>()
  for (const l of overdue) {
    const id = l.cliente?.id ?? null
    const nome = l.cliente?.nome ?? "Cliente não identificado"
    const key = id ?? `n:${nome}`
    const dias = l.dataVencimento ? Math.round((today.getTime() - l.dataVencimento.getTime()) / 86_400_000) : 0
    const cur = byCliente.get(key) ?? { id, nome, sumCents: 0, titulos: 0, maxDias: 0 }
    cur.sumCents += l.valorCents
    cur.titulos += 1
    cur.maxDias = Math.max(cur.maxDias, dias)
    byCliente.set(key, cur)
  }
  const idsDevedores = [...byCliente.values()].map((d) => d.id).filter((x): x is number => x != null)
  const [estados, pagamentos] = await Promise.all([
    getEstadosCobranca(idsDevedores),
    getPagamentosRecentes(idsDevedores, 30),
  ])
  const ativos: Dev[] = []
  const emEspera: (Dev & { silencio: Silencio })[] = []
  for (const d of byCliente.values()) {
    const sil = d.id != null ? avaliarSilencio(estados.get(d.id) ?? COBRANCA_ATIVA, pagamentos.get(d.id)) : null
    if (sil?.silenciado) emEspera.push({ ...d, silencio: sil })
    else ativos.push(d)
  }
  ativos.sort((a, b) => b.sumCents - a.sumCents)
  emEspera.sort((a, b) => b.sumCents - a.sumCents)

  if (ativos.length > 0) {
    const steps: PlanoStep[] = ativos.slice(0, 4).map((d) => ({
      id: `cobrar-${d.id ?? d.nome}`,
      icon: d.maxDias >= 60 ? "phone" : "mail",
      title: `Cobrar ${d.nome}`,
      ctx: `${d.maxDias} dia${d.maxDias === 1 ? "" : "s"} em atraso · ${d.titulos} título${d.titulos === 1 ? "" : "s"}`,
      valueCents: d.sumCents,
      valueKind: "recuperar",
      priority: d.maxDias >= 60 ? "Alta" : "Média",
      cta: "Ver títulos",
      href: lancHref("vencido", d.nome),
      ai: true,
    }))
    const resto = ativos.slice(4)
    if (resto.length > 0) {
      const restoSum = resto.reduce((s, d) => s + d.sumCents, 0)
      steps.push({
        id: "cobrar-resto",
        icon: "fileText",
        title: `Revisar ${resto.length} outros devedores`,
        ctx: `${formatBRLCompact(restoSum)} vencidos em títulos menores`,
        valueCents: restoSum,
        valueKind: "recuperar",
        priority: "Média",
        cta: "Ver títulos",
        href: lancHref("vencido"),
        ai: false,
      })
    }
    const ativosSum = ativos.reduce((s, d) => s + d.sumCents, 0)
    const desc =
      emEspera.length > 0
        ? `${formatBRLCompact(ativosSum)} a cobrar em ${ativos.length} cliente${ativos.length === 1 ? "" : "s"} ativo${ativos.length === 1 ? "" : "s"} — ${emEspera.length} em espera (abaixo).`
        : briefing.vencido60Cents > 0
          ? `${formatBRLCompact(briefing.vencido60Cents)} vencidos há mais de 60 dias, concentrados em ${briefing.vencido60Clientes} cliente${briefing.vencido60Clientes === 1 ? "" : "s"}.`
          : `${formatBRLCompact(ativosSum)} vencidos em ${ativos.length} cliente${ativos.length === 1 ? "" : "s"}.`
    groups.push({ id: "inadimplencia", title: "Recuperar inadimplência", desc, icon: "alertTriangle", tone: "vencido", steps })
  }

  // ── 1b. Cobranças em espera — silenced debtors (paused / não-cobrar / just paid) ─
  if (emEspera.length > 0) {
    const esperaSum = emEspera.reduce((s, d) => s + d.sumCents, 0)
    const steps: PlanoStep[] = emEspera.slice(0, 5).map((d) => ({
      id: `espera-${d.id ?? d.nome}`,
      icon: d.silencio.razao === "pagou" ? "trendingDown" : "clock",
      title: d.nome,
      ctx: `${d.silencio.texto} · ${formatBRLCompact(d.sumCents)} em aberto`,
      valueCents: 0,
      valueKind: null,
      priority: "Baixa",
      cta: d.id != null ? "Abrir contato" : "Ver títulos",
      href: d.id != null ? `/contatos/${d.id}?tab=cobranca` : lancHref("vencido", d.nome),
      ai: true,
    }))
    const resto = emEspera.length - steps.length
    groups.push({
      id: "cobranca-espera",
      title: "Cobranças em espera",
      desc: `${formatBRLCompact(esperaSum)} em ${emEspera.length} cliente${emEspera.length === 1 ? "" : "s"} que a IA não vai cobrar agora — pausados, marcados como "não cobrar" ou que voltaram a pagar${resto > 0 ? ` (+${resto})` : ""}.`,
      icon: "clock",
      tone: "espera",
      steps,
    })
  }

  // ── 2. Capturar receita não lançada — active cases without a fee ──────────
  if (casosSemFee.length > 0) {
    const steps: PlanoStep[] = casosSemFee.slice(0, 3).map((c, i) => ({
      id: `semfee-${c.id}`,
      icon: "receipt",
      title: `Lançar honorário — ${c.titulo}`,
      ctx: `Caso ativo de ${c.clientePrincipal?.nome ?? "cliente"} · estimado ${formatBRL(ticket)}`,
      valueCents: ticket,
      valueKind: "potencial",
      priority: i === 0 ? "Alta" : "Média",
      cta: "Lançar honorário",
      href: "/financeiro?tab=casos-sem-honorario",
      ai: true,
    }))
    const resto = casosSemFee.length - 3
    if (resto > 0) {
      steps.push({
        id: "semfee-resto",
        icon: "briefcase",
        title: `Revisar ${resto} caso${resto === 1 ? "" : "s"} sem fee restante${resto === 1 ? "" : "s"}`,
        ctx: `Potencial estimado de ${formatBRLCompact(resto * ticket)}`,
        valueCents: resto * ticket,
        valueKind: "potencial",
        priority: "Média",
        cta: "Ver casos",
        href: "/financeiro?tab=casos-sem-honorario",
        ai: true,
      })
    }
    groups.push({
      id: "receita",
      title: "Capturar receita não lançada",
      desc: `${casosSemFee.length} caso${casosSemFee.length === 1 ? " ativo" : "s ativos"} sem honorário definido — potencial estimado de ${formatBRLCompact(briefing.potencialCents)}.`,
      icon: "receipt",
      tone: "gold",
      steps,
    })
  }

  // ── 3. Revisar & estabilizar o caixa — flagged imports + parcelas due soon ─
  const estabilizar: PlanoStep[] = []
  if (anomalias > 0) {
    estabilizar.push({
      id: "anomalias",
      icon: "alertCircle",
      title: "Revisar importação sinalizada",
      ctx: `${anomalias} lançamento${anomalias === 1 ? " atípico aguardando" : "s atípicos aguardando"} revisão`,
      valueCents: 0,
      valueKind: null,
      priority: "Alta",
      cta: "Revisar",
      href: "/financeiro?tab=importacao",
      ai: false,
    })
  }
  for (const l of dueSoon) {
    const dias = l.dataVencimento ? Math.round((l.dataVencimento.getTime() - today.getTime()) / 86_400_000) : 0
    estabilizar.push({
      id: `due-${l.cliente?.nome ?? "x"}-${l.dataVencimento ? l.dataVencimento.toISOString().slice(0, 10) : "x"}-${l.valorCents}`,
      icon: "calendar",
      title: `Confirmar parcela — ${l.cliente?.nome ?? "cliente"}`,
      ctx: `${formatBRL(l.valorCents)} vence ${dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`}`,
      valueCents: 0,
      valueKind: null,
      priority: "Baixa",
      cta: "Ver título",
      href: lancHref("avencer", l.cliente?.nome),
      ai: false,
    })
  }
  if (estabilizar.length > 0) {
    const parts: string[] = []
    if (anomalias > 0) parts.push("lançamento atípico sinalizado")
    if (dueSoon.length > 0) parts.push("parcelas vencendo nos próximos dias")
    const desc = parts.join(" e ")
    groups.push({
      id: "estabilizar",
      title: "Revisar & estabilizar o caixa",
      desc: desc.charAt(0).toUpperCase() + desc.slice(1) + ".",
      icon: "sliders",
      tone: "alerta",
      steps: estabilizar,
    })
  }

  // ── reasoning rail ──────────────────────────────────────────────────────────
  const reasoning: PlanoReason[] = []
  if (briefing.recebidoDeltaPct !== null && briefing.recebidoDeltaPct < 0) {
    reasoning.push({
      icon: "trendingDown",
      text: `O recebido do mês caiu ${Math.abs(briefing.recebidoDeltaPct).toFixed(0)}% frente ao mês anterior — recuperar vencidos restaura o fluxo.`,
    })
  }
  if (briefing.vencido60Cents > 0) {
    reasoning.push({
      icon: "clock",
      text: `${formatBRLCompact(briefing.vencido60Cents)} estão parados há mais de 60 dias em ${briefing.vencido60Clientes} cliente${briefing.vencido60Clientes === 1 ? "" : "s"}. Quanto mais tempo, menor a chance de receber.`,
    })
  }
  if (briefing.casosSemFee > 0) {
    reasoning.push({
      icon: "receipt",
      text: `${briefing.casosSemFee} caso${briefing.casosSemFee === 1 ? " segue ativo" : "s seguem ativos"} sem honorário. São ${formatBRLCompact(briefing.potencialCents)} estimados de receita já trabalhada e não faturada.`,
    })
  }
  if (emEspera.length > 0) {
    reasoning.push({
      icon: "clock",
      text: `${emEspera.length} cliente${emEspera.length === 1 ? "" : "s"} ficaram de fora da cobrança hoje (pausa, "não cobrar" ou pagamento recente) — não insisto neles para não desgastar a relação.`,
    })
  }

  const allSteps = groups.flatMap((g) => g.steps)
  return {
    groups,
    reasoning: reasoning.slice(0, 3),
    totalValueCents: allSteps.reduce((s, st) => s + st.valueCents, 0),
    totalSteps: allSteps.length,
  }
}
