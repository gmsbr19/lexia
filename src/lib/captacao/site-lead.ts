// Tradutor PURO entre o contrato do site institucional (POST /api/lead) e o
// shape interno de captação (`CaptacaoLeadInput`, o mesmo que as landing pages
// usam). Sem Prisma/React — testável isoladamente (tests/captacao-site-lead.test.ts).
//
// Duas responsabilidades, deliberadamente separadas:
//  1. `mapearSiteLead` — mapeia o que o Lexia sabe modelar em coluna (gclid,
//     utm_*, consentimento, triagem…) para os campos existentes;
//  2. `envelopeCru` — preserva o corpo recebido INTEIRO como JSON, sem
//     normalizar nem descartar chave desconhecida. É isso que garante que
//     `msclkid`/`fbclid`/`cliente`/`tipo` (que hoje não têm coluna) continuem
//     disponíveis para qualquer trabalho futuro de atribuição/relatório.
//     Nome e telefone ficam FORA do envelope: já têm coluna própria, e duplicar
//     PII sem necessidade é dívida de LGPD (o envelope é limpo junto com a
//     triagem na anonimização — ver finance/mutations.ts).
import type { CaptacaoLeadInput } from "./schemas"

/** Toda chave do corpo que já vira coluna dedicada OU é PII duplicada. */
const CHAVES_FORA_DO_ENVELOPE = new Set(["nome", "telefone", "telefone_e164", "site"])

/** Só strings não-vazias viram valor de coluna; o resto é ignorado (fica no cru). */
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null
}

function bool(v: unknown): boolean {
  return v === true
}

/** `versao` chega como número (`1`) no contrato do site, mas a coluna é texto. */
function versaoStr(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  return str(v)
}

/**
 * Data válida a partir de um ISO 8601, recusando lixo e valores absurdos.
 * O `enviado_em` é gerado pelo site (não pelo navegador), mas ainda assim é
 * entrada externa: `dataEntrada` alimenta o `ConversaoEvento.ocorreuEm`, que é
 * gravado UMA vez e NUNCA recalculado (regra inviolável — ver schema.prisma),
 * e uma data fora da janela de 90 dias do Google inutilizaria a conversão.
 * Por isso só aceitamos dentro de ±24h de `agora`; fora disso, cai para `agora`.
 */
export function dataEnvioSegura(enviadoEm: unknown, agora: Date): Date {
  const s = str(enviadoEm)
  if (!s) return agora
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return agora
  if (Math.abs(d.getTime() - agora.getTime()) > 24 * 3_600_000) return agora
  return d
}

/** `triagem` do Lexia aceita string|number|boolean; o resto do objeto livre é
 *  descartado AQUI mas preservado no envelope cru. */
function triagemNormalizada(t: unknown): Record<string, string | number | boolean> | null {
  if (!t || typeof t !== "object" || Array.isArray(t)) return null
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(t as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v
  }
  return Object.keys(out).length ? out : null
}

export interface SiteLeadBruto {
  nome?: unknown
  telefone?: unknown
  telefone_e164?: unknown
  triagem?: unknown
  atribuicao?: unknown
  consentimento?: unknown
  pagina?: unknown
  enviado_em?: unknown
}

/** Mapeia o corpo do site para o shape interno de captação. */
export function mapearSiteLead(p: SiteLeadBruto): CaptacaoLeadInput {
  const atrib = (p.atribuicao && typeof p.atribuicao === "object" && !Array.isArray(p.atribuicao)
    ? (p.atribuicao as Record<string, unknown>)
    : {}) as Record<string, unknown>
  const consent = (p.consentimento && typeof p.consentimento === "object" && !Array.isArray(p.consentimento)
    ? (p.consentimento as Record<string, unknown>)
    : {}) as Record<string, unknown>

  // "medição" é o consentimento que habilita atribuição/conversão offline — é
  // ele que o Lexia modela como `consentimentoEm`. "publicidade" (remarketing)
  // é decisão separada e fica no envelope cru, sem coluna própria hoje.
  const medicao = bool(consent.medicao)
  const decididoEm = str(consent.decidido_em)

  return {
    contato: {
      nome: str(p.nome) ?? "",
      // o contrato manda `telefone` (DDD+número, só dígitos); `telefone_e164`
      // é só um fallback defensivo. O dedupe de contato normaliza os dois
      // formatos (ver comercial/contato.ts chaveTelefone).
      telefone: str(p.telefone) ?? str(p.telefone_e164),
      email: null, // o formulário do site não coleta e-mail (ver contrato)
    },
    triagem: triagemNormalizada(p.triagem),
    atribuicao: {
      gclid: str(atrib.gclid),
      wbraid: str(atrib.wbraid),
      gbraid: str(atrib.gbraid),
      utm: {
        source: str(atrib.utm_source),
        medium: str(atrib.utm_medium),
        campaign: str(atrib.utm_campaign),
        term: str(atrib.utm_term),
        content: str(atrib.utm_content),
      },
      // a página onde o formulário foi enviado só entra se não houver a de
      // entrada (a de entrada é a que importa para atribuição de clique).
      landingPage: str(atrib.pagina_entrada) ?? str(p.pagina),
      referrer: str(atrib.referrer),
      cliqueEm: str(atrib.capturado_em),
    },
    consentimento: medicao || decididoEm ? { aceito: medicao, versao: versaoStr(consent.versao), em: decididoEm } : null,
  }
}

/**
 * Serializa o corpo recebido para `Lead.captacaoRaw`, sem normalizar nem
 * descartar chaves desconhecidas (menos as que já viram coluna/PII).
 * `null` quando não sobra nada de útil.
 */
export function envelopeCru(body: Record<string, unknown>): string | null {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (CHAVES_FORA_DO_ENVELOPE.has(k)) continue
    if (v === undefined) continue
    out[k] = v
  }
  if (!Object.keys(out).length) return null
  try {
    return JSON.stringify(out)
  } catch {
    return null // corpo com referência circular/BigInt: não vale derrubar o lead
  }
}
