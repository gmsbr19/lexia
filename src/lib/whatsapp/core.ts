// WhatsApp (Baileys) — decisões PURAS do módulo: nada de prisma, baileys, env ou
// relógio ambiente (quem chama passa `agora`). É o que os testes exercitam, e o
// que app web e worker compartilham.
import { STATUS_VALIDOS, WORKER_TTL_MS, type WhatsappComando, type WhatsappEvento, type WhatsappStatus } from "./tipos"

// ── Códigos de desconexão ────────────────────────────────────────────────────
// Espelham o enum `DisconnectReason` do Baileys. Repetidos aqui (em vez de
// importados) porque este arquivo é PURO: o bundle do Next não pode puxar o
// baileys, que é ESM-only e carrega WASM. tests/whatsapp-core.test.ts afere
// valor por valor contra o enum real da versão instalada — se o upstream mudar
// um código, o teste quebra em vez de o worker reconectar para sempre.
export const CODIGO = {
  loggedOut: 401,
  forbidden: 403,
  connectionLost: 408,
  multideviceMismatch: 411,
  connectionClosed: 428,
  connectionReplaced: 440,
  badSession: 500,
  unavailableService: 503,
  restartRequired: 515,
} as const

/** O que fazer quando `connection.update` chega com `connection: "close"`. */
export type AcaoFechamento = "deslogar" | "reconectar" | "parar"

export type Fechamento = { acao: AcaoFechamento; esperaMs: number; motivo: string }

/** Backoff exponencial 1s → 60s (tentativa 0-based), como manda o brief. */
export function backoffMs(tentativa: number): number {
  const n = Number.isFinite(tentativa) && tentativa > 0 ? Math.floor(tentativa) : 0
  return Math.min(60_000, 1_000 * 2 ** Math.min(n, 30))
}

/**
 * Traduz o motivo do fechamento em ação. Três resultados, não dois:
 *  • `deslogar`  — a credencial MORREU (o usuário removeu o aparelho, ou a conta
 *    foi bloqueada). Reconectar com ela é inútil e chama atenção: apaga o
 *    WhatsappAuth e exige QR novo.
 *  • `parar`     — outra instância assumiu a MESMA sessão (`connectionReplaced`).
 *    Reconectar aqui derrubaria a outra, e as duas ficariam se derrubando em
 *    laço — para e espera comando manual.
 *  • `reconectar` — queda de rede/reinício: volta com backoff.
 */
export function decidirFechamento(codigo: number | undefined, tentativa: number): Fechamento {
  switch (codigo) {
    case CODIGO.loggedOut:
      return { acao: "deslogar", esperaMs: 0, motivo: "O aparelho foi desconectado no WhatsApp" }
    case CODIGO.forbidden:
      return { acao: "deslogar", esperaMs: 0, motivo: "O WhatsApp recusou a conexão desta conta (403)" }
    case CODIGO.multideviceMismatch:
      return { acao: "deslogar", esperaMs: 0, motivo: "A sessão ficou incompatível — é preciso ler o QR de novo" }
    case CODIGO.connectionReplaced:
      return { acao: "parar", esperaMs: 0, motivo: "Outra instância assumiu esta sessão" }
    case CODIGO.restartRequired:
      // O próprio Baileys pede o reinício do socket logo após o pareamento.
      return { acao: "reconectar", esperaMs: 0, motivo: "Reinício pedido pelo WhatsApp" }
    default:
      return { acao: "reconectar", esperaMs: backoffMs(tentativa), motivo: motivoDeCodigo(codigo) }
  }
}

function motivoDeCodigo(codigo: number | undefined): string {
  switch (codigo) {
    case CODIGO.connectionClosed:
      return "Conexão fechada"
    case CODIGO.connectionLost:
      return "Conexão perdida"
    case CODIGO.badSession:
      return "Sessão inválida"
    case CODIGO.unavailableService:
      return "Serviço do WhatsApp indisponível"
    default:
      return codigo ? "Conexão caiu (código " + codigo + ")" : "Conexão caiu"
  }
}

// ── JID / telefone ───────────────────────────────────────────────────────────

export function ehGrupo(jid: string): boolean {
  return jid.endsWith("@g.us")
}

/** Contato identificado só por LID: o telefone NÃO vem no jid. */
export function ehLid(jid: string): boolean {
  return jid.endsWith("@lid")
}

/**
 * Telefone de um jid de contato (`5511999998888@s.whatsapp.net`, com ou sem
 * `:device`). Grupo e LID devolvem null — é onde o vínculo automático com
 * cliente não se aplica (fase 3).
 */
export function jidParaNumero(jid: string | null | undefined): string | null {
  if (!jid) return null
  if (ehGrupo(jid) || ehLid(jid)) return null
  const local = jid.split("@")[0]?.split(":")[0] ?? ""
  const digitos = local.replace(/\D/g, "")
  return digitos.length >= 10 ? digitos : null
}

/**
 * Normaliza um telefone digitado/cadastrado para "só dígitos com DDI 55".
 * Medido na base real (ver CLAUDE.md §11): 10/11 dígitos = sem DDI → prefixa 55;
 * 12/13 = já tem DDI; qualquer outro tamanho é lixo e vira null em vez de um
 * número inventado.
 */
export function normalizarTelefone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, "").replace(/^0+/, "")
  if (d.length === 10 || d.length === 11) return "55" + d
  if (d.length === 12 || d.length === 13) return d
  return null
}

/**
 * Número aceito pelo `requestPairingCode`: dígitos com DDI, sem "+". Recusa o
 * que não parecer um telefone brasileiro completo, para não gastar tentativa.
 */
export function numeroParaPareamento(raw: string | null | undefined): string | null {
  const n = normalizarTelefone(raw)
  if (!n) return null
  return n.length === 12 || n.length === 13 ? n : null
}

// ── Textos e validações de borda ─────────────────────────────────────────────

/** Mensagem de erro guardada em WhatsappSessao.ultimoErro (nunca o stack). */
export function truncarErro(msg: unknown, max = 400): string {
  const s = msg instanceof Error ? msg.message : typeof msg === "string" ? msg : String(msg ?? "")
  const limpo = s.replace(/\s+/g, " ").trim()
  if (!limpo) return "Erro desconhecido"
  return limpo.length > max ? limpo.slice(0, max - 1) + "…" : limpo
}

export function ehStatus(v: unknown): v is WhatsappStatus {
  return typeof v === "string" && (STATUS_VALIDOS as readonly string[]).includes(v)
}

/** O worker está vivo? `batidaEm` é o heartbeat do AppSetting. */
export function workerOnline(batidaEm: string | null | undefined, agora: number): boolean {
  if (!batidaEm) return false
  const t = Date.parse(batidaEm)
  return Number.isFinite(t) && agora - t <= WORKER_TTL_MS
}

/**
 * Parse defensivo do payload de NOTIFY. O canal é compartilhado, então um
 * payload estranho é DESCARTADO em silêncio em vez de derrubar o listener.
 */
export function lerComando(payload: string): WhatsappComando | null {
  const o = parseObj(payload)
  if (!o) return null
  const userId = idValido(o.userId)
  if (!userId) return null
  if (o.tipo === "iniciar" || o.tipo === "desconectar") return { tipo: o.tipo, userId }
  if (o.tipo === "pareamento") {
    const numero = numeroParaPareamento(typeof o.numero === "string" ? o.numero : null)
    return numero ? { tipo: "pareamento", userId, numero } : null
  }
  return null
}

export function lerEvento(payload: string): WhatsappEvento | null {
  const o = parseObj(payload)
  if (!o) return null
  const userId = idValido(o.userId)
  if (!userId) return null
  switch (o.tipo) {
    case "qr":
      return typeof o.qr === "string" && o.qr ? { tipo: "qr", userId, qr: o.qr } : null
    case "pareamento":
      return typeof o.codigo === "string" && o.codigo ? { tipo: "pareamento", userId, codigo: o.codigo } : null
    case "conectado":
      return { tipo: "conectado", userId, numero: typeof o.numero === "string" ? o.numero : null }
    case "erro":
      return { tipo: "erro", userId, mensagem: truncarErro(o.mensagem) }
    case "deslogado":
      return { tipo: "deslogado", userId }
    case "status":
      return ehStatus(o.status) ? { tipo: "status", userId, status: o.status } : null
    default:
      return null
  }
}

function idValido(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null
}

function parseObj(payload: string): Record<string, unknown> | null {
  try {
    const o: unknown = JSON.parse(payload)
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : null
  } catch {
    return null
  }
}
