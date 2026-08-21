// A transação de escrita do endpoint público de captação (POST /api/captacao/
// lead) — resolve/cria o Contato, cria o Lead com a atribuição completa, emite
// o evento `formulario_enviado` pendente, e devolve o protocolo. "Nunca perca
// um lead por causa de um efeito colateral": notificação e auditoria rodam
// FORA da transação, best-effort, depois que o 201 já está garantido.
// SERVER ONLY.
import { prisma } from "@/lib/db"
import { resolverOuCriarCliente } from "@/lib/comercial/contato"
import { UserError } from "@/lib/errors"
import { writeAudit } from "@/lib/finance/api"
import { notificarLeadCaptado } from "@/lib/notificacoes/triggers"
import { derivarCaptacaoKey, derivarOrigemCaptacao, gerarProtocolo } from "./core"
import type { CaptacaoLeadInput } from "./schemas"

export interface CaptarLeadResult {
  protocolo: string
}

/**
 * De onde o lead veio. Uma `LandingPageResolvida` satisfaz este shape
 * estruturalmente (o endpoint público das LPs continua passando a LP inteira);
 * `id: null` cobre a fonte SEM linha de LandingPage — hoje o site
 * institucional, que autentica por segredo compartilhado e não por chave de LP
 * (ver site-auth.ts + app/api/lead/route.ts). `Lead.landingPageId` é anulável,
 * então nada precisa ser inventado no banco.
 */
export interface FonteCaptacao {
  id: number | null
  nome: string
  /** Namespace da chave de idempotência quando não há LP (ex.: "site"). */
  chaveFonte?: string
  campanhaPadraoId: number | null
  areaPadrao: string | null
  responsavelPadraoUserId: number | null
  consentimentoVersao: string | null
}

export interface CaptarLeadOpts {
  /** Momento do envio (default: agora). Vira `dataEntrada` e, por consequência,
   *  o `ConversaoEvento.ocorreuEm` — que NUNCA é recalculado depois. */
  dataEntrada?: Date
  /** Corpo cru recebido, preservado sem normalização (ver site-lead.ts). */
  captacaoRaw?: string | null
}

function isUniqueViolation(e: unknown, field: string): boolean {
  const err = e as { code?: string; meta?: { target?: unknown } } | null
  if (!err || err.code !== "P2002") return false
  const target = err.meta?.target
  const targets = Array.isArray(target) ? target : typeof target === "string" ? [target] : []
  return targets.some((t) => String(t).includes(field))
}

const MAX_TENTATIVAS_PROTOCOLO = 3

/**
 * Cria (ou, se já existir p/ a mesma chave de idempotência, devolve) o lead
 * capturado por uma landing page. `idempotencyKeyHeader` vem do header
 * `Idempotency-Key`; sem ele, a chave cai para telefone|email|dia (§2.3.1 do
 * plano). Honeypot (`site` preenchido) é checado pelo chamador — esta função
 * assume que já passou dessa checagem.
 */
export async function captarLead(
  lp: FonteCaptacao,
  input: CaptacaoLeadInput,
  idempotencyKeyHeader: string | null,
  opts: CaptarLeadOpts = {},
): Promise<CaptarLeadResult> {
  const nome = input.contato.nome.trim()
  if (!nome) throw new UserError("Nome é obrigatório")
  const telefone = input.contato.telefone?.trim() || null
  const email = input.contato.email?.trim() || null
  const atrib = input.atribuicao
  const origem = derivarOrigemCaptacao({
    gclid: atrib?.gclid,
    wbraid: atrib?.wbraid,
    gbraid: atrib?.gbraid,
    utmSource: atrib?.utm?.source,
  })
  const agora = opts.dataEntrada ?? new Date()
  const diaISO = agora.toISOString().slice(0, 10)
  const fonteKey = lp.id ?? lp.chaveFonte ?? "sem-lp"
  const captacaoKey = derivarCaptacaoKey(fonteKey, idempotencyKeyHeader, { telefone, email, diaISO })

  // Idempotência do submit: mesma chave já gravada → devolve o protocolo existente
  // sem criar um 2º lead (retry de rede / duplo-clique da LP).
  const existente = await prisma.lead.findUnique({ where: { captacaoKey }, select: { protocolo: true } })
  if (existente?.protocolo) return { protocolo: existente.protocolo }

  const triagem = input.triagem && Object.keys(input.triagem).length ? JSON.stringify(input.triagem) : null
  const consent = input.consentimento
  const consentimentoEm = consent?.aceito ? (consent.em ? new Date(consent.em) : new Date()) : null
  const consentimentoVersao = consent?.aceito ? (consent.versao ?? lp.consentimentoVersao ?? null) : null
  const cliqueEm = atrib?.cliqueEm ? new Date(atrib.cliqueEm) : null

  let tentativa = 0
  for (;;) {
    tentativa++
    const protocolo = gerarProtocolo(Math.random)
    try {
      const { leadId } = await prisma.$transaction(async (tx) => {
        const { id: clienteId } = await resolverOuCriarCliente(tx, { nome, email, telefone, origem })
        const lead = await tx.lead.create({
          data: {
            nome,
            email,
            telefone,
            origem,
            campanhaId: lp.campanhaPadraoId,
            area: lp.areaPadrao,
            dataEntrada: agora,
            responsavelUserId: lp.responsavelPadraoUserId,
            clienteId,
            landingPageId: lp.id,
            protocolo,
            captacaoKey,
            triagem,
            gclid: atrib?.gclid?.trim() || null,
            wbraid: atrib?.wbraid?.trim() || null,
            gbraid: atrib?.gbraid?.trim() || null,
            utmSource: atrib?.utm?.source?.trim() || null,
            utmMedium: atrib?.utm?.medium?.trim() || null,
            utmCampaign: atrib?.utm?.campaign?.trim() || null,
            utmTerm: atrib?.utm?.term?.trim() || null,
            utmContent: atrib?.utm?.content?.trim() || null,
            matchtype: atrib?.matchtype?.trim() || null,
            device: atrib?.device?.trim() || null,
            network: atrib?.network?.trim() || null,
            landingPageUrl: atrib?.landingPage?.trim() || null,
            referrer: atrib?.referrer?.trim() || null,
            cliqueEm,
            consentimentoEm,
            consentimentoVersao,
            captacaoRaw: opts.captacaoRaw ?? null,
          },
        })
        await tx.conversaoEvento.createMany({
          data: [
            {
              leadId: lead.id,
              tipo: "formulario_enviado",
              ocorreuEm: lead.dataEntrada, // = conversion_date_time — REGRA INVIOLÁVEL, nunca recalculado
              orderId: `${lead.id}-formulario_enviado`, // PARADO — não lido pelo feed hoje (ver schema)
            },
          ],
          skipDuplicates: true,
        })
        return { leadId: lead.id }
      })

      void notificarLeadCaptado({
        leadId,
        nome,
        landingPageNome: lp.nome,
        responsavelUserId: lp.responsavelPadraoUserId,
      })
      void writeAudit(
        `captacao:${lp.id ? `lp-${lp.id}` : (lp.chaveFonte ?? "sem-lp")}`,
        {
          action: "captacao.lead",
          entity: "Lead",
          entityId: leadId,
          payload: {
            landingPageId: lp.id,
            fonte: lp.id ? null : (lp.chaveFonte ?? "sem-lp"),
            protocolo,
            temClique: !!(atrib?.gclid || atrib?.wbraid || atrib?.gbraid),
            origem,
          },
        },
        { id: leadId },
      )
      return { protocolo }
    } catch (e) {
      // Corrida: dois submits com a MESMA captacaoKey passaram pelo findUnique
      // acima antes de qualquer um commitar. O índice único garante que só um
      // vence — o perdedor relê e devolve o protocolo do vencedor (mesma
      // semântica idempotente, sem duplicar o lead).
      if (isUniqueViolation(e, "captacaoKey")) {
        const ganhador = await prisma.lead.findUnique({ where: { captacaoKey }, select: { protocolo: true } })
        if (ganhador?.protocolo) return { protocolo: ganhador.protocolo }
      }
      // Colisão de protocolo (astronomicamente rara — 31^6 combinações): gera
      // outro e tenta de novo, até um teto pequeno.
      if (isUniqueViolation(e, "protocolo") && tentativa < MAX_TENTATIVAS_PROTOCOLO) continue
      throw e
    }
  }
}
