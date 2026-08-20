// Emissão de eventos de conversão + ajustes (RETRACT/RESTATE) — o wrapper
// Prisma sobre eventos-core.ts. Chamado a partir dos pontos de transição que
// JÁ existem no Comercial (moverEtapa/createLead/converterLead/
// mesclarLeadComCliente/bulkUpdateLeads/marcarPerdido em mutations.ts,
// criarAtividade em atividades.ts) e do Financeiro (updateLancamento →
// RESTATE quando o valor de um contrato já assinado muda) — nunca por uma
// tela própria. Sempre chamado com `void` (nunca lança — mesma convenção de
// src/lib/notificacoes/triggers.ts) e nunca dentro da transação do chamador
// (é I/O best-effort; uma falha aqui não pode desfazer a mutação de negócio).
// SERVER ONLY.
import { prisma } from "@/lib/db"
import { fitScore } from "@/lib/comercial/score"
import { getScoringConfig } from "@/lib/settings"
import { log } from "@/lib/log"
import { UserError } from "@/lib/errors"
import { getValoresConfig } from "./config"
import { avaliarRetratacaoPorEtapa, valorDoEvento, type EventoCanonico, type MapaFunil, type ValorResultado } from "./eventos-core"

const LEAD_SCORE_SELECT = {
  area: true,
  origem: true,
  potencialFinanceiro: true,
  urgenciaNivel: true,
  poderDecisao: true,
  jurisdicao: true,
  viabilidade: true,
} as const

/** Fit score do lead a partir do perfil já carregado — evita repetir o select
 *  entre `registrarEventoFunil` e `previsaoValorEvento` (mesma leitura). */
function fitDoLead(lead: Record<keyof typeof LEAD_SCORE_SELECT, string | null>, scoring: Parameters<typeof fitScore>[1]) {
  return fitScore(
    {
      area: lead.area,
      origem: lead.origem,
      potencialFinanceiro: lead.potencialFinanceiro,
      urgenciaNivel: lead.urgenciaNivel,
      poderDecisao: lead.poderDecisao,
      jurisdicao: lead.jurisdicao,
      viabilidade: lead.viabilidade,
    },
    scoring,
  )
}

/** Qual valor seria enviado para um evento, dado um lead real — usado pela
 *  pré-visualização em Configurações → Captação. Não escreve nada; lê a
 *  MESMA regra que `registrarEventoFunil` usaria. */
export async function previsaoValorEvento(leadId: number, tipo: EventoCanonico): Promise<ValorResultado> {
  const [lead, valores, scoring] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId }, select: { ...LEAD_SCORE_SELECT, lancamento: { select: { valorCents: true } } } }),
    getValoresConfig(),
    getScoringConfig(),
  ])
  if (!lead) throw new UserError("Lead não encontrado")
  const fit = fitDoLead(lead, scoring)
  return valorDoEvento({ area: lead.area, fit, valorRealCents: lead.lancamento?.valorCents ?? null }, valores.porEvento[tipo])
}

/**
 * Registra (se ainda não existe — `@@unique([leadId,tipo])` garante no banco)
 * o evento de conversão para um lead. `ocorreuEm` é o timestamp do FATO
 * (passado pelo chamador — pode ser "agora" para uma transição de etapa, ou o
 * `ocorreuEm` de uma OportunidadeAtividade de reunião registrada com atraso)
 * — REGRA INVIOLÁVEL: gravado aqui e NUNCA recalculado depois (ver o
 * comentário do model `ConversaoEvento` no schema). Nunca lança; loga e segue
 * em caso de erro.
 */
export async function registrarEventoFunil(input: { leadId: number; tipo: EventoCanonico; ocorreuEm: Date }): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId }, select: { ...LEAD_SCORE_SELECT, lancamento: { select: { valorCents: true } } } })
    if (!lead) return

    const [valores, scoring] = await Promise.all([getValoresConfig(), getScoringConfig()])
    const fit = fitDoLead(lead, scoring)
    const { cents } = valorDoEvento({ area: lead.area, fit, valorRealCents: lead.lancamento?.valorCents ?? null }, valores.porEvento[input.tipo])

    await prisma.conversaoEvento.createMany({
      data: [
        {
          leadId: input.leadId,
          tipo: input.tipo,
          ocorreuEm: input.ocorreuEm,
          valorCents: cents,
          orderId: `${input.leadId}-${input.tipo}`, // PARADO — não lido pelo feed hoje (ver schema)
        },
      ],
      skipDuplicates: true, // append-only: regressão de etapa nunca reemite (a linha já existe)
    })
  } catch (e) {
    log.error({ leadId: input.leadId, tipo: input.tipo, err: e instanceof Error ? e.message : String(e) }, "registrarEventoFunil falhou")
  }
}

/**
 * RETRACT — o lead deixou de satisfazer a condição de um evento já emitido
 * (regressão de etapa). Idempotente por design: só cria o ajuste se o evento
 * existir, estiver 'pendente' (não descartado) e ainda não tiver um RETRACT
 * (flapping ganho↔qualificado repetido não empilha ajustes repetidos — o
 * primeiro já basta, o Google trata RETRACT como idempotente do lado dele).
 * `criadoEm` (Adjustment Time) é gravado uma vez, na criação — mesma regra de
 * imutabilidade de `ocorreuEm` em ConversaoEvento.
 */
export async function retratarEvento(leadId: number, tipo: EventoCanonico, motivo: string): Promise<void> {
  try {
    const evento = await prisma.conversaoEvento.findUnique({
      where: { leadId_tipo: { leadId, tipo } },
      select: { id: true, status: true, ajustes: { where: { tipo: "RETRACT" }, select: { id: true } } },
    })
    if (!evento || evento.status === "descartado" || evento.ajustes.length > 0) return
    await prisma.conversaoAjuste.create({ data: { eventoId: evento.id, tipo: "RETRACT", motivo } })
  } catch (e) {
    log.error({ leadId, tipo, err: e instanceof Error ? e.message : String(e) }, "retratarEvento falhou")
  }
}

/** Avalia (puro, via avaliarRetratacaoPorEtapa) e aplica os RETRACTs que uma
 *  mudança de etapa exige — chamado a partir de moverEtapa/marcarPerdido. */
export async function retratarPorMudancaDeEtapa(leadId: number, curEtapa: string, nextEtapa: string, mapa: MapaFunil): Promise<void> {
  const tipos = avaliarRetratacaoPorEtapa(curEtapa, nextEtapa, mapa)
  for (const tipo of tipos) {
    await retratarEvento(leadId, tipo, `Lead retrocedeu de etapa (${curEtapa} → ${nextEtapa})`)
  }
}

/**
 * RESTATE — o valor de um contrato JÁ enviado como `contrato_assinado`
 * mudou. Lê o novo valor DIRETO do lançamento (nunca recalcula/deriva) — é a
 * mesma disciplina do RETRACT: o ajuste registra o que de fato mudou, não uma
 * reconstrução. Sem evento `contrato_assinado` emitido ainda (ou descartado),
 * não faz nada — não há o que restabelecer.
 */
export async function restabelecerValorContrato(leadId: number, novoValorCents: number, motivo: string): Promise<void> {
  try {
    const evento = await prisma.conversaoEvento.findUnique({
      where: { leadId_tipo: { leadId, tipo: "contrato_assinado" } },
      select: { id: true, status: true },
    })
    if (!evento || evento.status === "descartado") return
    await prisma.conversaoAjuste.create({ data: { eventoId: evento.id, tipo: "RESTATE", novoValorCents, motivo } })
  } catch (e) {
    log.error({ leadId, err: e instanceof Error ? e.message : String(e) }, "restabelecerValorContrato falhou")
  }
}

/** Descarta (manual, painel de reconciliação) um evento — para de aparecer no
 *  feed, com o motivo registrado. Reversível (reativarEvento). */
export async function descartarEventos(ids: number[], motivo: string): Promise<{ atualizados: number }> {
  const r = await prisma.conversaoEvento.updateMany({ where: { id: { in: ids } }, data: { status: "descartado", motivoDescarte: motivo } })
  return { atualizados: r.count }
}

export async function reativarEventos(ids: number[]): Promise<{ atualizados: number }> {
  const r = await prisma.conversaoEvento.updateMany({ where: { id: { in: ids } }, data: { status: "pendente", motivoDescarte: null } })
  return { atualizados: r.count }
}
