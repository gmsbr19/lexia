// Office dashboard — ONE server fetch composing the cross-module signals shown
// on the Início page (financeiro · prazos/processos · agenda · tarefas ·
// comercial · escritório). Reuses each module's existing read queries; the
// dataset is one small office, so the handful of parallel aggregates are cheap.
// SERVER ONLY.
import { prisma } from "@/lib/db"
import { getDevedoresDashboard, type DevedorDash } from "@/lib/clientes/cobranca"
import { addDiasISO, hojeISO } from "@/lib/lexia/agent/datas"
import { listEventos } from "@/lib/agenda/queries"
import { getComercialKpis } from "@/lib/comercial/queries"
import { getTarefasDataset } from "@/lib/tarefas/queries"
import { getBriefing } from "@/lib/finance/briefing"
import { getKpis } from "@/lib/finance/queries"
import type { BriefingPrazo } from "@/lib/finance/types"

export interface DashAgendaEvento {
  id: number
  titulo: string
  tipo: "audiencia" | "prazo" | "reuniao" | "outro"
  inicio: string // ISO
  diaInteiro: boolean
  cliente: string | null
  responsavel: string | null
}

export interface DashTarefa {
  id: number
  titulo: string
  prazo: string | null // ISO date
  atrasada: boolean
  hoje: boolean
}

export interface DashboardData {
  hoje: string
  financeiro: {
    recebidoMesCents: number
    recebidoDeltaPct: number | null
    aReceberCents: number
    aReceberCount: number
    vencidoCents: number
    vencidoClientes: number
    margemPct: number | null
    saidasMesCents: number
    devedores: DevedorDash[] // top chargeable debtors
    emEsperaCount: number // debtors silenced (paused / não-cobrar / pagaram)
  }
  prazos: { vencidos: number; hoje: number; sete: number; exemplos: BriefingPrazo[] }
  agenda: { total: number; eventos: DashAgendaEvento[] }
  tarefas: { atrasadas: number; hoje: number; pendentes: number; itens: DashTarefa[] }
  comercial: {
    leads: number
    leadsDeltaPct: number | null
    conversoes: number
    taxaConversaoPct: number | null
    roas: number | null
    investimentoCents: number
    valorContratadoCents: number
  }
  escritorio: { clientesTotal: number; casosAtivos: number; casosSemFee: number; potencialCents: number }
}

export async function getDashboard(): Promise<DashboardData> {
  const hoje = hojeISO()
  const [kpis, briefing, devedores, eventos, tarefasDs, comercial, clientesTotal, casosAtivos] = await Promise.all([
    getKpis(),
    getBriefing(),
    getDevedoresDashboard(5),
    listEventos({ de: hoje, ate: addDiasISO(hoje, 7) }),
    getTarefasDataset(),
    getComercialKpis(),
    prisma.cliente.count({ where: { classificacao: "cliente" } }),
    prisma.caso.count({ where: { status: "Ativo", excluidoEm: null } }),
  ])

  // tarefas — pending only, urgency-ranked (atrasadas → hoje → resto), top 5.
  const pend = tarefasDs.tarefas.filter((t) => !t.done)
  const itens: DashTarefa[] = pend
    .map((t) => ({
      id: t.id,
      titulo: t.titulo,
      prazo: t.prazo,
      atrasada: !!t.prazo && t.prazo < hoje,
      hoje: t.prazo === hoje || t.data === hoje,
    }))
    .sort((a, b) => {
      const rank = (x: DashTarefa) => (x.atrasada ? 0 : x.hoje ? 1 : 2)
      if (rank(a) !== rank(b)) return rank(a) - rank(b)
      return (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99")
    })
    .slice(0, 5)
  const atrasadas = pend.filter((t) => t.prazo && t.prazo < hoje).length
  const tarefasHoje = pend.filter((t) => t.prazo === hoje || t.data === hoje).length

  const agendaEventos: DashAgendaEvento[] = eventos.slice(0, 6).map((e) => ({
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo,
    inicio: e.inicio,
    diaInteiro: e.diaInteiro,
    cliente: e.cliente,
    responsavel: e.responsavel,
  }))

  return {
    hoje,
    financeiro: {
      recebidoMesCents: kpis.recebidoMesCents,
      recebidoDeltaPct: kpis.recebidoDeltaPct,
      aReceberCents: kpis.aReceberCents,
      aReceberCount: kpis.aReceberCount,
      vencidoCents: kpis.vencidoCents,
      vencidoClientes: kpis.vencidoClientes,
      margemPct: kpis.margemPct,
      saidasMesCents: kpis.saidasMesCents,
      devedores: devedores.ativos,
      emEsperaCount: devedores.emEspera.length,
    },
    prazos: {
      vencidos: briefing.prazosVencidos,
      hoje: briefing.prazosHoje,
      sete: briefing.prazos7Dias,
      exemplos: briefing.prazosExemplos,
    },
    agenda: { total: eventos.length, eventos: agendaEventos },
    tarefas: { atrasadas, hoje: tarefasHoje, pendentes: pend.length, itens },
    comercial: {
      leads: comercial.leads,
      leadsDeltaPct: comercial.leadsDeltaPct,
      conversoes: comercial.conversoes,
      taxaConversaoPct: comercial.taxaConversaoPct,
      roas: comercial.roas,
      investimentoCents: comercial.investimentoCents,
      valorContratadoCents: comercial.valorContratadoCents,
    },
    escritorio: {
      clientesTotal,
      casosAtivos,
      casosSemFee: briefing.casosSemFee,
      potencialCents: briefing.potencialCents,
    },
  }
}
