// Collection-memory CORE — PURE (no prisma), so the state machine is unit-tested
// without the DB client and shared by server + client. The effective collection
// state of a cliente is DERIVED from its notes timeline (never stored): the most
// recent `tipo:'cobranca'` directive wins. A plain `tipo:'nota'` is free context
// the AI reads. See src/lib/clientes/cobranca.ts for the prisma layer.

export type AnotacaoTipo = "nota" | "cobranca"
export type CobrancaAcao = "pausar" | "suspender" | "retomar"
/** ativo = cobrar normalmente; pausado = silenciado até `ate`; suspenso = "não cobrar mais". */
export type CobrancaStatus = "ativo" | "pausado" | "suspenso"

export interface AnotacaoRow {
  id: number
  autor: string
  conteudo: string
  tipo: AnotacaoTipo
  acao: CobrancaAcao | null
  ate: string | null // ISO date "YYYY-MM-DD" (só para acao='pausar')
  fixado: boolean
  createdAt: string // ISO timestamp
}

export interface EstadoCobranca {
  status: CobrancaStatus
  /** Para 'pausado': data (ISO) até quando a cobrança fica silenciada. */
  ate: string | null
  /** Texto da diretiva vigente (o "porquê"), quando houver. */
  motivo: string | null
  /** Quando a diretiva vigente foi registrada (ISO date), quando houver. */
  desde: string | null
}

export const COBRANCA_ATIVA: EstadoCobranca = { status: "ativo", ate: null, motivo: null, desde: null }

/**
 * Deriva o estado de cobrança a partir da linha do tempo de anotações.
 * Regra: a diretiva (`tipo:'cobranca'` com `acao`) MAIS RECENTE vence.
 * - retomar / nenhuma / pausar-expirada → ativo
 * - suspender → suspenso (indefinido)
 * - pausar com `ate` >= hoje → pausado (inclui o próprio dia)
 */
export function estadoCobranca(notas: AnotacaoRow[], hojeISO: string): EstadoCobranca {
  const diretivas = notas
    .filter((n) => n.tipo === "cobranca" && n.acao != null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id))
  const d = diretivas[0]
  if (!d || d.acao === "retomar") return COBRANCA_ATIVA
  const desde = d.createdAt.slice(0, 10)
  if (d.acao === "suspender") return { status: "suspenso", ate: null, motivo: d.conteudo || null, desde }
  if (d.acao === "pausar" && d.ate && d.ate >= hojeISO) {
    return { status: "pausado", ate: d.ate, motivo: d.conteudo || null, desde }
  }
  return COBRANCA_ATIVA // pausa expirada ou sem data
}

/** Rótulo curto pt-BR do estado (UI/IA). */
export function rotuloEstadoCobranca(e: EstadoCobranca): string {
  if (e.status === "suspenso") return "Não cobrar"
  if (e.status === "pausado") return e.ate ? `Cobrança pausada até ${formatBR(e.ate)}` : "Cobrança pausada"
  return "Cobrança ativa"
}

function formatBR(iso: string): string {
  const [y, m, d] = iso.split("-")
  return d && m && y ? `${d}/${m}/${y}` : iso
}
