// WhatsApp — link assinado para baixar uma mídia. SERVER ONLY (node:crypto),
// mas PURO no sentido que importa: nenhuma dependência de env, prisma ou
// relógio ambiente (a chave e `agora` vêm de quem chama), então os testes
// exercitam a assinatura de verdade.
//
// POR QUE um link assinado e não só a sessão: a rota serve dois consumidores.
// A página usa a sessão do usuário (e o dono é conferido no banco). As
// ferramentas MCP da fase 4 precisam entregar ao Claude algo que ele consiga
// buscar sem cookie — e o brief pede exatamente isso, "link assinado válido por
// 15 min". Um token curto, amarrado à mensagem E ao usuário, resolve os dois.
//
// A chave NÃO é a WHATSAPP_AUTH_KEY crua: é derivada dela por HMAC com um
// rótulo próprio. Assinar e cifrar com a mesma chave é o tipo de atalho que
// transforma um vazamento de assinatura em vazamento de credencial.
import { createHmac, timingSafeEqual } from "node:crypto"

const VERSAO = "v1"
const ROTULO = "whatsapp-midia-v1"

/** Validade padrão do link (o brief pede 15 min). */
export const MIDIA_LINK_TTL_MS = 15 * 60 * 1000

/** Chave de assinatura derivada da chave de cifragem do módulo. */
export function derivarChaveMidia(chaveAuth: Buffer): Buffer {
  return createHmac("sha256", chaveAuth).update(ROTULO).digest()
}

export type AlvoMidia = { mensagemId: number; userId: number }

/**
 * Token para UMA mensagem de UM usuário, com expiração embutida. O `userId`
 * entra na assinatura e é conferido contra a linha na hora de servir: um token
 * do usuário A nunca abre a mídia do usuário B, mesmo que o id seja adivinhado.
 */
export function assinarMidia(alvo: AlvoMidia, chave: Buffer, agora: number, ttlMs = MIDIA_LINK_TTL_MS): string {
  const exp = Math.floor((agora + ttlMs) / 1000)
  const corpo = [VERSAO, alvo.userId, alvo.mensagemId, exp].join(".")
  return corpo + "." + assinatura(corpo, chave)
}

/** Devolve o alvo quando o token é íntegro e não expirou; `null` em tudo mais. */
export function verificarMidia(token: string | null | undefined, chave: Buffer, agora: number): AlvoMidia | null {
  if (!token || typeof token !== "string" || token.length > 300) return null
  const partes = token.split(".")
  if (partes.length !== 5) return null
  const [versao, userIdRaw, mensagemIdRaw, expRaw, sig] = partes
  if (versao !== VERSAO) return null
  const corpo = [versao, userIdRaw, mensagemIdRaw, expRaw].join(".")
  // Compara ANTES de olhar para os números: assinatura primeiro, sempre.
  if (!confere(sig, assinatura(corpo, chave))) return null
  const userId = inteiro(userIdRaw)
  const mensagemId = inteiro(mensagemIdRaw)
  const exp = inteiro(expRaw)
  if (!userId || !mensagemId || !exp) return null
  if (exp * 1000 <= agora) return null
  return { mensagemId, userId }
}

/** O caminho relativo que a página/MCP entrega pronto. */
export function caminhoMidia(mensagemId: number, token: string): string {
  return "/api/whatsapp/midia/" + mensagemId + "?t=" + encodeURIComponent(token)
}

function assinatura(corpo: string, chave: Buffer): string {
  return createHmac("sha256", chave).update(corpo).digest("base64url")
}

function confere(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8")
  const y = Buffer.from(b, "utf8")
  // timingSafeEqual exige mesmo tamanho; o tamanho em si não é segredo.
  return x.length === y.length && timingSafeEqual(x, y)
}

function inteiro(raw: string): number | null {
  if (!/^[0-9]{1,15}$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}
