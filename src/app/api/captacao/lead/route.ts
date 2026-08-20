// POST /api/captacao/lead — endpoint PÚBLICO (fora de src/proxy.ts) que as
// landing pages chamam ao submeter o formulário. Autentica por chave de LP
// (header X-Lexia-Lp-Key), não por sessão — não usa runMutation/requireUser.
//
// Ordem de checagem (§4/§7.1 do plano — é a maior superfície de ataque criada
// pelo módulo): chave → Origin → rate limit → zod → honeypot → normalização →
// transação (captarLead) → best-effort (notificação/auditoria já rodam DENTRO
// de captarLead, fora da transação). Nunca perde um lead por causa de um
// efeito colateral: a resposta 201 só depende da transação ter commitado.
import { NextResponse } from "next/server"
import { readJson, writeAudit } from "@/lib/finance/api"
import { captarLead } from "@/lib/captacao/captar"
import { normalizarE164 } from "@/lib/captacao/core"
import { origemAutorizada, resolverLandingPagePorChave } from "@/lib/captacao/landing-pages"
import { captacaoLeadSchema } from "@/lib/captacao/schemas"
import { UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_HEADERS = "content-type, x-lexia-lp-key, idempotency-key"

/** Registra um POST rejeitado — alimenta "POSTs que falharam" no painel de
 *  reconciliação. Best-effort (writeAudit já nunca lança); nunca loga PII,
 *  só o motivo estruturado + a chave por PREFIXO (nunca a chave inteira). */
function logRejeicao(motivo: string, landingPageId: number | null, chave?: string | null): void {
  void writeAudit(
    landingPageId ? `captacao:lp-${landingPageId}` : "captacao:chave-desconhecida",
    { action: "captacao.lead.rejeitado", entity: "Lead", payload: { motivo, landingPageId, chavePrefixo: chave?.slice(0, 10) ?? null } },
    null,
  )
}

/** Preflight não conhece a LP ainda (o header da chave não vem no preflight,
 *  só é anunciado via Access-Control-Request-Headers) — é permissivo por
 *  design; a autorização de verdade acontece no POST, que só ecoa o CORS de
 *  volta quando a chave é válida E o domínio bate. Ver §7.1 do plano. */
export function OPTIONS(req: Request) {
  const origin = req.headers.get("origin")
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    Vary: "Origin",
  })
  if (origin) headers.set("Access-Control-Allow-Origin", origin)
  return new NextResponse(null, { status: 204, headers })
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon"
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin")
  const chave = req.headers.get("x-lexia-lp-key")

  // 1. chave
  const lp = chave ? await resolverLandingPagePorChave(chave) : null
  if (!lp) {
    logRejeicao("chave inválida", null, chave)
    return NextResponse.json({ error: "Chave inválida" }, { status: 401 })
  }

  // 2. Origin — só a partir daqui é seguro ecoar CORS de volta (domínio já
  // conferido contra ESTA landing page especificamente).
  if (!origemAutorizada(lp.dominios, origin)) {
    logRejeicao("origem não autorizada", lp.id)
    return NextResponse.json({ error: "Origem não autorizada" }, { status: 403 })
  }
  const corsHeaders = new Headers({ "Access-Control-Allow-Origin": origin as string, Vary: "Origin" })

  // 3. rate limit — por IP e por telefone (após zod, telefone só existe então;
  // o de IP já protege a fase mais barata).
  const ip = clientIp(req)
  if (!rateLimit(`captacao:ip:${ip}`, 20, 60_000)) {
    logRejeicao("rate limit (IP)", lp.id)
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429, headers: corsHeaders })
  }

  // 4. zod
  const body = await readJson(req)
  const parsed = captacaoLeadSchema.safeParse(body)
  if (!parsed.success) {
    logRejeicao("dados inválidos", lp.id)
    return NextResponse.json({ error: "Dados inválidos — verifique os campos e tente novamente" }, { status: 400, headers: corsHeaders })
  }
  const input = parsed.data

  // 5. honeypot — a LP já tem o campo `site`; preenchido = bot. Descarta em
  // silêncio (protocolo sintético, nada é gravado) para não ensinar o bot a
  // distinguir "aceito" de "rejeitado" — por isso NÃO conta como "POST que
  // falhou" no painel (é um sucesso fingido de propósito).
  if (input.site && input.site.trim()) {
    log.info({ landingPageId: lp.id }, "captacao: honeypot preenchido, descartado")
    return NextResponse.json({ ok: true, protocolo: `NCM-000000` }, { status: 201, headers: corsHeaders })
  }

  // rate limit por telefone (pós-zod)
  const telKey = normalizarE164(input.contato.telefone)
  if (telKey && !rateLimit(`captacao:tel:${telKey}`, 5, 3_600_000)) {
    logRejeicao("rate limit (telefone)", lp.id)
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429, headers: corsHeaders })
  }

  try {
    const idempotencyKey = req.headers.get("idempotency-key")
    const { protocolo } = await captarLead(lp, input, idempotencyKey)
    return NextResponse.json({ ok: true, protocolo }, { status: 201, headers: corsHeaders })
  } catch (e) {
    if (e instanceof UserError) {
      logRejeicao(`erro de validação: ${e.message}`, lp.id)
      return NextResponse.json({ error: e.message }, { status: 400, headers: corsHeaders })
    }
    logRejeicao("erro interno", lp.id)
    log.error({ landingPageId: lp.id, err: e instanceof Error ? e.message : String(e) }, "captacao.lead falhou")
    return NextResponse.json({ error: "Erro ao processar a requisição" }, { status: 500, headers: corsHeaders })
  }
}
