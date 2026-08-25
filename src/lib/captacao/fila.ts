// Fila de eventos de conversão — leitura para a aba Captação (monitoramento)
// e o bloco read-only da ficha da oportunidade. As ações de descartar/
// reativar em lote vivem em ./eventos.ts (descartarEventos/reativarEventos)
// — repassadas aqui só como conveniência de import único p/ as rotas. SERVER
// ONLY.
import { prisma } from "@/lib/db"
import { notificarCaptacaoSemClique } from "@/lib/notificacoes/triggers"
import { escolherIdentificador } from "./core"
import { getAlertasConfig } from "./config"
import { elegivelParaConversao, JANELA_CONVERSOES_DIAS } from "./feed"

export interface EventoRow {
  id: number
  leadId: number
  leadNome: string
  tipo: string
  status: string
  valorCents: number
  temGclid: boolean
  gclid: string | null // bruto — tooltip na fila + coluna do CSV de conferência
  campanhaNome: string | null
  ocorreuEm: string
  motivoDescarte: string | null
  temAjuste: boolean // RETRACT ou RESTATE já aplicado — informativo na fila
}

/** Fila inteira (client-side filtrada/agrupada pelo ViewGrid); teto defensivo
 *  de 2000 linhas mais recentes. */
export async function listarEventosConversao(): Promise<EventoRow[]> {
  const rows = await prisma.conversaoEvento.findMany({
    include: { lead: { select: { nome: true, gclid: true, campanha: { select: { nome: true } } } }, ajustes: { select: { id: true }, take: 1 } },
    orderBy: { ocorreuEm: "desc" },
    take: 2000,
  })
  return rows.map((r) => ({
    id: r.id,
    leadId: r.leadId,
    leadNome: r.lead.nome,
    tipo: r.tipo,
    status: r.status,
    valorCents: r.valorCents,
    temGclid: !!r.lead.gclid,
    gclid: r.lead.gclid,
    campanhaNome: r.lead.campanha?.nome ?? null,
    ocorreuEm: r.ocorreuEm.toISOString(),
    motivoDescarte: r.motivoDescarte,
    temAjuste: r.ajustes.length > 0,
  }))
}

export interface CaptacaoKpis {
  pendentes: number
  descartados: number
  noFeedAgora: number // linhas que apareceriam em conversions.csv se gerado agora
  semCliquePct: number // leads via LP nos últimos N dias (captacao.alertas.janelaDias) sem gclid
  janelaDias: number
}

/** Cabeçalho da aba Captação — inclui o "alarme de incêndio" do módulo: % de
 *  leads capturados por uma LP sem `gclid`. Escopado a leads que vieram de
 *  fato por uma landing page (`landingPageId != null`) — leads manuais/
 *  Genions nunca têm clique e diluiriam o percentual sem dizer nada sobre a
 *  saúde do snippet. */
export async function getCaptacaoKpis(): Promise<CaptacaoKpis> {
  const alertas = await getAlertasConfig()
  const agora = new Date()
  const desdeAlerta = new Date(agora.getTime() - alertas.janelaDias * 86_400_000)
  const desdeJanela = new Date(agora.getTime() - JANELA_CONVERSOES_DIAS * 86_400_000)
  const [pendentes, descartados, elegiveis, leadsRecentes, leadsSemClique] = await Promise.all([
    prisma.conversaoEvento.count({ where: { status: "pendente" } }),
    prisma.conversaoEvento.count({ where: { status: "descartado" } }),
    prisma.conversaoEvento.findMany({
      where: { status: "pendente", ocorreuEm: { gte: desdeJanela, lte: agora } },
      select: { ocorreuEm: true, status: true, lead: { select: { gclid: true } } },
    }),
    prisma.lead.count({ where: { dataEntrada: { gte: desdeAlerta }, landingPageId: { not: null } } }),
    prisma.lead.count({ where: { dataEntrada: { gte: desdeAlerta }, landingPageId: { not: null }, gclid: null } }),
  ])
  const noFeedAgora = elegiveis.filter((e) => elegivelParaConversao({ gclid: e.lead.gclid, tipo: "formulario_enviado", ocorreuEm: e.ocorreuEm, valorCents: 0, moeda: "BRL", status: e.status }, agora)).length
  const semCliquePct = leadsRecentes > 0 ? Math.round((leadsSemClique / leadsRecentes) * 100) : 0
  return { pendentes, descartados, noFeedAgora, semCliquePct, janelaDias: alertas.janelaDias }
}

export interface CaptacaoLeadDetail {
  temClique: boolean
  identificador: "gclid" | "wbraid" | "gbraid" | null // gclid é o único que o feed lê — os outros são só informativos
  utmCampaign: string | null
  utmTerm: string | null
  landingPageNome: string | null
  consentimentoEm: string | null
  consentimentoVersao: string | null
  eventos: { tipo: string; status: string; ocorreuEm: string; temAjuste: boolean }[]
}

/** Bloco read-only "Origem & atribuição" da ficha da oportunidade — carregado
 *  sob demanda ao abrir o modal, NUNCA entra no CmDataset. */
export async function getCaptacaoLeadDetail(leadId: number): Promise<CaptacaoLeadDetail | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      gclid: true,
      wbraid: true,
      gbraid: true,
      utmCampaign: true,
      utmTerm: true,
      consentimentoEm: true,
      consentimentoVersao: true,
      landingPage: { select: { nome: true } },
      conversoes: {
        select: { tipo: true, status: true, ocorreuEm: true, ajustes: { select: { id: true }, take: 1 } },
        orderBy: { ocorreuEm: "asc" },
      },
    },
  })
  if (!lead) return null
  const identificador = escolherIdentificador(lead)
  return {
    temClique: !!lead.gclid, // só gclid alimenta o feed
    identificador,
    utmCampaign: lead.utmCampaign,
    utmTerm: lead.utmTerm,
    landingPageNome: lead.landingPage?.nome ?? null,
    consentimentoEm: lead.consentimentoEm?.toISOString() ?? null,
    consentimentoVersao: lead.consentimentoVersao,
    eventos: lead.conversoes.map((c) => ({ tipo: c.tipo, status: c.status, ocorreuEm: c.ocorreuEm.toISOString(), temAjuste: c.ajustes.length > 0 })),
  }
}

/** Job diário (POST /api/jobs/captacao-saude) — recalcula o KPI de "% sem
 *  clique" e dispara o alarme quando cruza o limiar configurado. Não há mais
 *  worker de envio (o Google LÊ o feed — nada para retentar deste lado), só
 *  esta checagem de saúde sobrevive como job agendado. */
export async function verificarAlertaCaptacao(): Promise<{ semCliquePct: number; alertou: boolean }> {
  const kpis = await getCaptacaoKpis()
  const alertas = await getAlertasConfig()
  const alertou = kpis.semCliquePct >= alertas.semCliqueLimiarPct
  if (alertou) void notificarCaptacaoSemClique({ percentual: kpis.semCliquePct, limiar: alertas.semCliqueLimiarPct })
  return { semCliquePct: kpis.semCliquePct, alertou }
}
