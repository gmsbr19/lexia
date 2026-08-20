// Consultas Prisma que alimentam os feeds CSV — regeneram o conteúdo do ZERO
// a cada chamada (nenhum estado "já enviado" é lido ou escrito aqui). Só a
// janela de 90 dias limita a busca no banco (defensivo — o filtro real de
// elegibilidade é em ./feed.ts, puro e testável). SERVER ONLY.
import { prisma } from "@/lib/db"
import { JANELA_CONVERSOES_DIAS, type LinhaAjuste, type LinhaConversao } from "./feed"
import type { EventoCanonico } from "./eventos-core"

function desde(agora: Date): Date {
  return new Date(agora.getTime() - JANELA_CONVERSOES_DIAS * 86_400_000)
}

export async function buscarLinhasConversao(agora: Date): Promise<LinhaConversao[]> {
  const rows = await prisma.conversaoEvento.findMany({
    where: { ocorreuEm: { gte: desde(agora), lte: agora } },
    select: { tipo: true, ocorreuEm: true, valorCents: true, moeda: true, status: true, lead: { select: { gclid: true } } },
    orderBy: { ocorreuEm: "asc" },
  })
  return rows.map((r) => ({
    gclid: r.lead.gclid,
    tipo: r.tipo as EventoCanonico,
    ocorreuEm: r.ocorreuEm,
    valorCents: r.valorCents,
    moeda: r.moeda,
    status: r.status,
  }))
}

export async function buscarLinhasAjuste(agora: Date): Promise<LinhaAjuste[]> {
  const rows = await prisma.conversaoAjuste.findMany({
    where: { evento: { ocorreuEm: { gte: desde(agora), lte: agora } } },
    select: {
      tipo: true,
      criadoEm: true,
      novoValorCents: true,
      evento: { select: { tipo: true, ocorreuEm: true, moeda: true, status: true, lead: { select: { gclid: true } } } },
    },
    orderBy: { criadoEm: "asc" },
  })
  return rows.map((r) => ({
    gclid: r.evento.lead.gclid,
    tipoAcao: r.evento.tipo as EventoCanonico,
    ocorreuEmOriginal: r.evento.ocorreuEm,
    tipoAjuste: r.tipo as "RETRACT" | "RESTATE",
    criadoEm: r.criadoEm,
    novoValorCents: r.novoValorCents,
    moeda: r.evento.moeda,
    statusEventoOriginal: r.evento.status,
  }))
}
