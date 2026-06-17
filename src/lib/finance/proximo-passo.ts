// Deterministic "próximo passo financeiro" engine — the anti-idleness queue.
// Today it's pure rules over the data (overdue receivables, fees due tomorrow,
// active cases without a fee). The UI shows a gold "IA" badge slot so a Claude
// tool-use ranker can replace/augment this later without changing the surface.
// SERVER ONLY (imports prisma).
import { prisma } from "@/lib/db"
import { avaliarSilencio, getEstadosCobranca, getPagamentosRecentes } from "@/lib/clientes/cobranca"
import { COBRANCA_ATIVA } from "@/lib/clientes/cobranca-core"
import { dispensadas } from "@/lib/sugestoes/dispensa"
import { formatBRL } from "./money"
import type { ProximoPassoItem } from "./types"

function startOfToday(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Calendar-day difference a − b (TZ-safe; prazos are stored at local noon). */
function dayDiff(a: Date, b: Date): number {
  return Math.round(
    (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 86_400_000,
  )
}

const URGENCIA_RANK = { alta: 0, media: 1, baixa: 2 } as const

export async function getProximoPasso(limit = 8): Promise<ProximoPassoItem[]> {
  const today = startOfToday()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(today.getDate() + 2)
  // Prazo horizon: vencidos + os que vencem nos próximos 2 dias.
  const prazoLimite = new Date(today)
  prazoLimite.setDate(today.getDate() + 3)

  const [overdue, dueTomorrow, casosSemFee, prazos] = await Promise.all([
    prisma.lancamento.findMany({
      where: { tipo: "entrada", isAnomalia: false, status: "aberto", dataVencimento: { lt: today } },
      select: { id: true, valorCents: true, dataVencimento: true, cliente: { select: { id: true, nome: true } } },
      orderBy: { dataVencimento: "asc" },
      take: 20,
    }),
    prisma.lancamento.findMany({
      where: { tipo: "entrada", isAnomalia: false, status: "aberto", dataVencimento: { gte: tomorrow, lt: dayAfter } },
      select: { id: true, valorCents: true, cliente: { select: { nome: true } } },
      take: 20,
    }),
    prisma.caso.findMany({
      where: { status: "Ativo", honorarios: { none: {} } },
      select: { id: true, titulo: true, clientePrincipal: { select: { nome: true } } },
      orderBy: { ultimaMovimentacao: "desc" },
      take: 20,
    }),
    prisma.prazo.findMany({
      where: { excluidoEm: null, status: "pendente", processo: { excluidoEm: null }, dataFatal: { lt: prazoLimite } },
      select: { id: true, descricao: true, dataFatal: true, processoId: true, processo: { select: { numeroCnj: true } } },
      orderBy: { dataFatal: "asc" },
      take: 20,
    }),
  ])

  // Collection memory: a debtor may be paused / suspended / softened (just paid),
  // so it should not surface as a "cobrar" item (see lib/clientes/cobranca).
  const overdueIds = [...new Set(overdue.map((l) => l.cliente?.id).filter((x): x is number => x != null))]
  const [estadosCob, pagamentosCob] = await Promise.all([
    getEstadosCobranca(overdueIds),
    getPagamentosRecentes(overdueIds, 30),
  ])
  const cobrancaSilenciada = (id: number | null | undefined): boolean =>
    id != null && avaliarSilencio(estadosCob.get(id) ?? COBRANCA_ATIVA, pagamentosCob.get(id)).silenciado

  const items: ProximoPassoItem[] = []

  // Prazos first — a missed legal deadline is the costliest, irreversible miss.
  for (const p of prazos) {
    const dias = dayDiff(p.dataFatal, today)
    const quando =
      dias < 0
        ? `vencido há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`
        : dias === 0
          ? "vence hoje"
          : dias === 1
            ? "vence amanhã"
            : `vence em ${dias} dias`
    const ref = p.processo?.numeroCnj ? ` · ${p.processo.numeroCnj}` : ""
    items.push({
      id: `prazo-${p.id}`,
      tipo: "prazo",
      titulo: `Prazo: ${p.descricao}`,
      descricao: `${quando}${ref}`,
      urgencia: "alta",
      href: `/processos/${p.processoId}`,
      cta: "Abrir processo",
      ai: true,
      chave: `prazo:${p.id}`,
    })
  }

  for (const l of overdue) {
    if (cobrancaSilenciada(l.cliente?.id)) continue
    const dias = l.dataVencimento ? Math.round((today.getTime() - l.dataVencimento.getTime()) / 86_400_000) : 0
    items.push({
      id: `overdue-${l.id}`,
      tipo: "inadimplente",
      titulo: `Cobrar ${l.cliente?.nome ?? "cliente"}`,
      descricao: `${formatBRL(l.valorCents)} vencido há ${dias} dia${dias === 1 ? "" : "s"}`,
      valorCents: l.valorCents,
      urgencia: "alta",
      href: `/financeiro?tab=lancamentos&dir=in&stat=vencido${l.cliente ? `&q=${encodeURIComponent(l.cliente.nome)}` : ""}`,
      cta: "Cobrar",
      ai: true,
      chave: `overdue:${l.id}`,
    })
  }
  for (const l of dueTomorrow) {
    items.push({
      id: `due-${l.id}`,
      tipo: "parcela_vence",
      titulo: `Parcela vence amanhã — ${l.cliente?.nome ?? "cliente"}`,
      descricao: `${formatBRL(l.valorCents)} · confirmar recebimento`,
      valorCents: l.valorCents,
      urgencia: "media",
      href: `/financeiro?tab=lancamentos&dir=in&stat=avencer${l.cliente ? `&q=${encodeURIComponent(l.cliente.nome)}` : ""}`,
      cta: "Ver título",
      chave: `parcela:${l.id}`,
    })
  }
  for (const c of casosSemFee) {
    items.push({
      id: `semfee-${c.id}`,
      tipo: "caso_sem_fee",
      titulo: `Lançar honorário — ${c.titulo}`,
      descricao: `Caso ativo de ${c.clientePrincipal?.nome ?? "cliente"} sem honorário lançado`,
      urgencia: "baixa",
      href: "/financeiro?tab=casos-sem-honorario",
      cta: "Lançar honorário",
      ai: true,
      chave: `semfee:${c.id}`,
    })
  }

  // Drop snoozed/dismissed suggestions so they stop "insisting" (see lib/sugestoes).
  const dismissed = await dispensadas()
  return items
    .filter((it) => !it.chave || !dismissed.has(it.chave))
    .sort((a, b) => URGENCIA_RANK[a.urgencia] - URGENCIA_RANK[b.urgencia])
    .slice(0, limit)
}
