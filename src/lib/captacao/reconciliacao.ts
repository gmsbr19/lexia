// Painel de reconciliação — por semana e por estágio: leads gravados no
// banco, conversões disparadas, linhas presentes no feed agora, eventos
// descartados (com motivo), POSTs que falharam. SERVER ONLY.
import { prisma } from "@/lib/db"
import { EVENTOS_CANONICOS } from "./acoes"
import { elegivelParaConversao } from "./feed"
import { inicioDaSemana, ultimasSemanas } from "./reconciliacao-core"
import type { EventoCanonico } from "./eventos-core"

export interface LinhaReconciliacao {
  semana: string // "AAAA-MM-DD" (segunda-feira)
  tipo: EventoCanonico
  leadsGravados: number // leads via LP capturados nessa semana (repetido nas 4 linhas — é uma métrica da semana, não do estágio)
  eventosDisparados: number
  noFeedAgora: number
  descartados: number
  motivosDescarte: string[]
  postsFalhos: number // idem leadsGravados — métrica da semana
}

export async function getReconciliacaoSemanal(numSemanas = 8): Promise<LinhaReconciliacao[]> {
  const agora = new Date()
  const semanas = ultimasSemanas(agora, numSemanas) // mais recente primeiro
  const cutoff = new Date(agora.getTime() - (numSemanas + 1) * 7 * 86_400_000)

  const [leads, eventos, rejeicoes] = await Promise.all([
    prisma.lead.findMany({
      where: { landingPageId: { not: null }, dataEntrada: { gte: cutoff } },
      select: { dataEntrada: true },
    }),
    prisma.conversaoEvento.findMany({
      where: { ocorreuEm: { gte: cutoff } },
      select: { tipo: true, ocorreuEm: true, status: true, motivoDescarte: true, lead: { select: { gclid: true } } },
    }),
    prisma.auditLog.findMany({
      where: { action: "captacao.lead.rejeitado", ts: { gte: cutoff } },
      select: { ts: true },
    }),
  ])

  const leadsPorSemana = new Map<string, number>()
  for (const l of leads) {
    const s = inicioDaSemana(l.dataEntrada)
    leadsPorSemana.set(s, (leadsPorSemana.get(s) ?? 0) + 1)
  }
  const postsFalhosPorSemana = new Map<string, number>()
  for (const r of rejeicoes) {
    const s = inicioDaSemana(r.ts)
    postsFalhosPorSemana.set(s, (postsFalhosPorSemana.get(s) ?? 0) + 1)
  }

  type Bucket = { disparados: number; noFeed: number; descartados: number; motivos: Set<string> }
  const porSemanaTipo = new Map<string, Bucket>() // chave: `${semana}|${tipo}`
  const chave = (semana: string, tipo: string) => `${semana}|${tipo}`
  for (const e of eventos) {
    const s = inicioDaSemana(e.ocorreuEm)
    const k = chave(s, e.tipo)
    const b = porSemanaTipo.get(k) ?? { disparados: 0, noFeed: 0, descartados: 0, motivos: new Set<string>() }
    b.disparados++
    if (e.status === "descartado") {
      b.descartados++
      if (e.motivoDescarte) b.motivos.add(e.motivoDescarte)
    } else if (elegivelParaConversao({ gclid: e.lead.gclid, tipo: e.tipo as EventoCanonico, ocorreuEm: e.ocorreuEm, valorCents: 0, moeda: "BRL", status: e.status }, agora)) {
      b.noFeed++
    }
    porSemanaTipo.set(k, b)
  }

  const linhas: LinhaReconciliacao[] = []
  for (const semana of semanas) {
    for (const tipo of EVENTOS_CANONICOS) {
      const b = porSemanaTipo.get(chave(semana, tipo))
      linhas.push({
        semana,
        tipo,
        leadsGravados: leadsPorSemana.get(semana) ?? 0,
        eventosDisparados: b?.disparados ?? 0,
        noFeedAgora: b?.noFeed ?? 0,
        descartados: b?.descartados ?? 0,
        motivosDescarte: b ? Array.from(b.motivos) : [],
        postsFalhos: postsFalhosPorSemana.get(semana) ?? 0,
      })
    }
  }
  return linhas
}
