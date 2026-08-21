// POST /api/lead — recebe leads do site institucional (ncm.adv.br) pela rede
// interna do projeto (http://lexia:3000).
//
// ── Autenticação: DUAS formas, nesta ordem ────────────────────────────────────
// 1. header `x-ncm-secret` == `LEXIA_SECRET` (comparação em tempo constante,
//    ver captacao/site-auth.ts). O site é público e anônimo — o visitante nunca
//    terá sessão —, então ele age como intermediário: recebe o POST do
//    navegador same-origin, valida/rate-limita/honeypot, e só então repassa
//    para cá com o segredo compartilhado.
// 2. sem o header (ou com header errado): exige sessão NextAuth normalmente,
//    como qualquer outra rota. Sem sessão ⇒ 401.
//
// O bypass é ESTRITAMENTE local a esta rota: nenhuma outra rota do Lexia lê
// `x-ncm-secret`, e esta é a única entrada nova no matcher de src/proxy.ts
// (precisa estar fora dele, senão o proxy responde 401 antes do guard rodar —
// mesmo padrão de /api/jobs, /api/captacao e /feeds/google-ads). Por estar fora
// do proxy, a checagem de sessão do caminho 2 é feita AQUI, via requireUser().
//
// ── Latência ──────────────────────────────────────────────────────────────────
// O site desiste em 3s e segue sem protocolo. Só a transação entra no ciclo de
// request/response; notificação e auditoria já são fire-and-forget dentro de
// captarLead (nunca se perde um lead por causa de um efeito colateral).
import { NextResponse } from "next/server"
import { AuthError, requireUser } from "@/lib/auth/session"
import { captarLead } from "@/lib/captacao/captar"
import { normalizarE164 } from "@/lib/captacao/core"
import { autenticadoPeloSite } from "@/lib/captacao/site-auth"
import { envelopeCru, dataEnvioSegura, mapearSiteLead } from "@/lib/captacao/site-lead"
import { siteLeadSchema } from "@/lib/captacao/schemas"
import { UserError } from "@/lib/errors"
import { readJson, writeAudit } from "@/lib/finance/api"
import { log } from "@/lib/log"
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Fonte de captação do site institucional — não tem linha de LandingPage (a
 *  autenticação é por segredo, não por chave de LP), então entra com
 *  `Lead.landingPageId = null`. Sem campanha/área/responsável padrão: o lead
 *  cai no funil sem dono, como qualquer entrada não configurada. */
const FONTE_SITE = {
  id: null,
  nome: "Site institucional",
  chaveFonte: "site",
  campanhaPadraoId: null,
  areaPadrao: null,
  responsavelPadraoUserId: null,
  consentimentoVersao: null,
} as const

/** Auditoria de POST rejeitado — alimenta "POSTs que falharam" no painel de
 *  reconciliação. NUNCA loga PII nem o segredo: só o motivo estruturado. */
function logRejeicao(motivo: string): void {
  void writeAudit("captacao:site", { action: "captacao.lead.rejeitado", entity: "Lead", payload: { motivo, fonte: "site" } }, null)
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon"
}

export async function POST(req: Request) {
  // 1. segredo compartilhado ANTES de qualquer outra checagem de auth
  const porSegredo = autenticadoPeloSite(req)
  if (!porSegredo) {
    // 2. sem segredo válido → comportamento padrão: exige sessão NextAuth
    try {
      await requireUser()
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
      throw e
    }
  }

  // Rate limit por IP — o site já limita do lado dele, este é o cinto de
  // segurança caso o segredo vaze ou o proxy seja contornado na rede interna.
  const ip = clientIp(req)
  if (!rateLimit(`captacao:site:ip:${ip}`, 60, 60_000)) {
    logRejeicao("rate limit (IP)")
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  const body = await readJson(req)
  const parsed = siteLeadSchema.safeParse(body)
  if (!parsed.success) {
    logRejeicao("dados inválidos")
    return NextResponse.json({ error: "Dados inválidos — verifique os campos e tente novamente" }, { status: 400 })
  }
  const input = parsed.data

  // Honeypot: o proxy do site já remove `site` antes de repassar, então isso
  // aqui só dispara se alguém postar direto no endpoint. Mesma semântica do
  // endpoint das LPs — descarta em silêncio com protocolo sintético, para não
  // ensinar o bot a distinguir aceito de rejeitado (e por isso NÃO conta como
  // POST que falhou).
  if (input.site && input.site.trim()) {
    log.info({ fonte: "site" }, "captacao(site): honeypot preenchido, descartado")
    return NextResponse.json({ protocolo: "NCM-000000" }, { status: 200 })
  }

  const telKey = normalizarE164(input.telefone ?? input.telefone_e164)
  if (telKey && !rateLimit(`captacao:tel:${telKey}`, 5, 3_600_000)) {
    logRejeicao("rate limit (telefone)")
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  try {
    const { protocolo } = await captarLead(FONTE_SITE, mapearSiteLead(input), req.headers.get("idempotency-key"), {
      dataEntrada: dataEnvioSegura(input.enviado_em, new Date()),
      captacaoRaw: envelopeCru(body),
    })
    return NextResponse.json({ protocolo }, { status: 200 })
  } catch (e) {
    if (e instanceof UserError) {
      logRejeicao(`erro de validação: ${e.message}`)
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    logRejeicao("erro interno")
    // Só a mensagem do erro — nunca o corpo (tem nome e telefone) nem o header.
    log.error({ fonte: "site", err: e instanceof Error ? e.message : String(e) }, "captacao(site).lead falhou")
    return NextResponse.json({ error: "Erro ao processar a requisição" }, { status: 500 })
  }
}
