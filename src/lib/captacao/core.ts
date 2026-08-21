// Núcleo puro do módulo de Captação — protocolo, chave de idempotência do
// submit, normalização de telefone p/ E.164, transactionId estável p/ o
// Google, e a escolha de identificador de clique. Sem Prisma/React — testável
// isoladamente (ver tests/captacao-core.test.ts). SERVER-safe (sem deps de
// runtime Node exceto o SHA-256 injetado pelo chamador, para ficar puro).
import { normalizarTelefone } from "@/lib/comercial/contato"

/** Alfabeto sem caracteres ambíguos (sem I/L/O/U/0/1) — protocolo curto p/ a LP
 *  embutir na mensagem do WhatsApp e o operador ler por telefone sem erro. */
const PROTOCOLO_ALFABETO = "ABCDEFGHJKMNPQRSTVWXYZ23456789"
const PROTOCOLO_LEN = 6

/** Gera um protocolo curto (ex. "NCM-7F3K2Q") a partir de bytes aleatórios
 *  injetados pelo chamador (`rand`: 0..1, ex. `Math.random` ou um CSPRNG). */
export function gerarProtocolo(rand: () => number): string {
  let s = ""
  for (let i = 0; i < PROTOCOLO_LEN; i++) s += PROTOCOLO_ALFABETO[Math.floor(rand() * PROTOCOLO_ALFABETO.length)]
  return `NCM-${s}`
}

/** Normaliza um telefone BR para E.164 (+55…). Não tenta validar DDD/operadora
 *  — só garante um formato estável p/ dedupe/hash. String vazia p/ entrada vazia. */
export function normalizarE164(v: string | null | undefined): string {
  let d = normalizarTelefone(v)
  if (!d) return ""
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2)
  if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = `${d.slice(0, 2)}9${d.slice(2)}`
  return d ? `+55${d}` : ""
}

/**
 * Chave de idempotência do submit de um formulário. `fonteKey` é o id da
 * landing page (número) ou o identificador da fonte sem LP (ex. "site", o
 * site institucional que posta em POST /api/lead) — o prefixo "lp:" é mantido
 * para não invalidar as chaves já gravadas. Preferência: o header
 * `Idempotency-Key` que a LP manda (um valor por submit — cobre duplo-clique
 * e retry de rede com precisão). Sem o header, cai para uma chave derivada de
 * telefone|email|dia — ainda dedupa um duplo-clique, mas dois submits
 * legítimos da MESMA pessoa no MESMO dia colidiriam (aceitável como
 * fallback: o header é o caminho recomendado no snippet).
 */
export function derivarCaptacaoKey(
  fonteKey: number | string,
  idempotencyKeyHeader: string | null | undefined,
  fallback: { telefone?: string | null; email?: string | null; diaISO: string },
): string {
  if (idempotencyKeyHeader && idempotencyKeyHeader.trim()) {
    return `lp:${fonteKey}:${idempotencyKeyHeader.trim().slice(0, 128)}`
  }
  const tel = normalizarE164(fallback.telefone)
  const email = (fallback.email ?? "").trim().toLowerCase()
  return `lp:${fonteKey}:fallback:${tel || "sem-tel"}:${email || "sem-email"}:${fallback.diaISO}`
}

/** Deriva `Lead.origem` a partir da atribuição do submit — clique pago tem
 *  precedência (é o sinal mais forte), depois o texto do utm_source (mesma
 *  heurística de `detectOrigem` em comercial/import/leads.ts), senão
 *  "organico" (visitante real da LP, sem clique pago identificado). */
export function derivarOrigemCaptacao(atribuicao: {
  gclid?: string | null
  wbraid?: string | null
  gbraid?: string | null
  utmSource?: string | null
}): "google_ads" | "meta_ads" | "organico" {
  if (atribuicao.gclid || atribuicao.gbraid) return "google_ads"
  const u = (atribuicao.utmSource ?? "").toLowerCase()
  if (u.includes("google") || u.includes("adwords")) return "google_ads"
  if (u.includes("insta") || u.includes("face") || u.includes("meta") || u.includes("fb")) return "meta_ads"
  if (atribuicao.wbraid) return "google_ads" // wbraid é iOS web click id do Google — sem ambiguidade
  return "organico"
}

export type IdentificadorClique = "gclid" | "wbraid" | "gbraid"

/** Qual identificador de clique usar — gclid tem precedência (é o mais comum;
 *  os outros só existem quando o gclid não foi disponibilizado pelo Google). */
export function escolherIdentificador(atribuicao: {
  gclid?: string | null
  wbraid?: string | null
  gbraid?: string | null
}): IdentificadorClique | null {
  if (atribuicao.gclid) return "gclid"
  if (atribuicao.wbraid) return "wbraid"
  if (atribuicao.gbraid) return "gbraid"
  return null
}
