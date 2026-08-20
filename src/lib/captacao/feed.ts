// Núcleo puro dos 2 feeds CSV que o Google Ads lê por HTTPS agendado (uma vez
// por dia) — NUNCA API, NUNCA upload manual. Regenerado do zero a cada
// requisição a partir do estado atual do banco (ver ./feed-queries.ts para as
// consultas Prisma); pura formatação/filtro aqui, testável sem banco (ver
// tests/captacao-feed.test.ts).
//
// A janela de 90 dias é uma regra do GOOGLE (upload de conversão por gclid),
// não uma escolha do escritório — fixa aqui, não é configurável.
//
// Regenerar o arquivo inteiro a cada GET e incluir TODAS as linhas da janela
// (não só as novas) é intencional: o Google deduplica por gclid + nome da
// ação + horário, então reenviar o que já foi enviado não duplica nada — e
// isso faz o feed se AUTO-CORRIGIR se um dia de leitura falhar (o próximo dia
// já traz tudo de novo).
import { nomeDaAcao } from "./acoes"
import type { EventoCanonico } from "./eventos-core"

export const JANELA_CONVERSOES_DIAS = 90

const SP_OFFSET_MS = 3 * 60 * 60 * 1000 // America/Sao_Paulo = UTC-3 fixo (sem horário de verão desde 2019)

/** "AAAA-MM-DD HH:MM:SS-03:00" — converte o instante (armazenado em UTC) para
 *  o horário de parede de São Paulo, independente do fuso do processo Node. */
export function formatarDataHoraFeed(d: Date): string {
  const sp = new Date(d.getTime() - SP_OFFSET_MS)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${sp.getUTCFullYear()}-${pad(sp.getUTCMonth() + 1)}-${pad(sp.getUTCDate())} ${pad(sp.getUTCHours())}:${pad(sp.getUTCMinutes())}:${pad(sp.getUTCSeconds())}-03:00`
}

/** Escapagem CSV padrão do app (aspas duplicadas + neutraliza injeção de
 *  fórmula em =/+/-/@ líder) — defesa em profundidade; gclid normalmente é
 *  seguro, mas chega via query string de uma URL pública. */
function esc(v: string): string {
  const guarded = /^[=+\-@]/.test(v) ? `'${v}` : v
  return `"${guarded.replace(/"/g, '""')}"`
}

const TIMEZONE_LINE = "Parameters:TimeZone=America/Sao_Paulo"

// ── conversions.csv ─────────────────────────────────────────────────────────
export interface LinhaConversao {
  gclid: string | null
  tipo: EventoCanonico
  ocorreuEm: Date
  valorCents: number
  moeda: string
  status: string // 'pendente' | 'descartado'
}

/** Exclui: sem gclid, fora da janela de 90 dias, status='descartado'. Nada
 *  além disso — nunca filtra por "já enviado antes" (não existe esse
 *  conceito num feed pull-based regenerado do zero). */
export function elegivelParaConversao(linha: LinhaConversao, agora: Date): boolean {
  if (!linha.gclid) return false
  if (linha.status === "descartado") return false
  const idadeDias = (agora.getTime() - linha.ocorreuEm.getTime()) / 86_400_000
  return idadeDias >= 0 && idadeDias <= JANELA_CONVERSOES_DIAS
}

const CONVERSIONS_HEADER = ["Google Click ID", "Conversion Name", "Conversion Time", "Conversion Value", "Conversion Currency"]

export function gerarConversionsCsv(linhas: LinhaConversao[], agora: Date): string {
  const out = [TIMEZONE_LINE, CONVERSIONS_HEADER.map(esc).join(",")]
  for (const l of linhas) {
    if (!elegivelParaConversao(l, agora)) continue
    out.push(
      [esc(l.gclid as string), esc(nomeDaAcao(l.tipo)), esc(formatarDataHoraFeed(l.ocorreuEm)), esc((l.valorCents / 100).toFixed(2)), esc(l.moeda)].join(","),
    )
  }
  return out.join("\r\n")
}

// ── adjustments.csv ─────────────────────────────────────────────────────────
export interface LinhaAjuste {
  gclid: string | null
  tipoAcao: EventoCanonico // do evento ORIGINAL — nunca recalculado
  ocorreuEmOriginal: Date // horário ORIGINAL da conversão — nunca recalculado
  tipoAjuste: "RETRACT" | "RESTATE"
  criadoEm: Date // Adjustment Time — imutável desde a criação do ajuste
  novoValorCents: number | null // só p/ RESTATE
  moeda: string
  statusEventoOriginal: string
}

/** Mesmas 3 regras de exclusão do conversions.csv, aplicadas sobre o horário
 *  ORIGINAL da conversão (não sobre `criadoEm` do ajuste) — é a mesma janela
 *  de 90 dias do Google, medida a partir do clique/conversão original. */
export function elegivelParaAjuste(linha: LinhaAjuste, agora: Date): boolean {
  if (!linha.gclid) return false
  if (linha.statusEventoOriginal === "descartado") return false
  const idadeDias = (agora.getTime() - linha.ocorreuEmOriginal.getTime()) / 86_400_000
  return idadeDias >= 0 && idadeDias <= JANELA_CONVERSOES_DIAS
}

const ADJUSTMENTS_HEADER = [
  "Google Click ID",
  "Conversion Name",
  "Conversion Time",
  "Adjustment Type",
  "Adjustment Time",
  "New Conversion Value",
  "New Currency",
]

export function gerarAdjustmentsCsv(linhas: LinhaAjuste[], agora: Date): string {
  const out = [TIMEZONE_LINE, ADJUSTMENTS_HEADER.map(esc).join(",")]
  for (const l of linhas) {
    if (!elegivelParaAjuste(l, agora)) continue
    const base = [
      esc(l.gclid as string),
      esc(nomeDaAcao(l.tipoAcao)),
      esc(formatarDataHoraFeed(l.ocorreuEmOriginal)),
      esc(l.tipoAjuste),
      esc(formatarDataHoraFeed(l.criadoEm)),
    ]
    // RETRACT não carrega novo valor — colunas vazias (não se aplica), mas
    // ainda quotadas p/ ficar consistente com o resto da linha.
    const valor = l.tipoAjuste === "RESTATE" ? [esc(((l.novoValorCents ?? 0) / 100).toFixed(2)), esc(l.moeda)] : [esc(""), esc("")]
    out.push([...base, ...valor].join(","))
  }
  return out.join("\r\n")
}
