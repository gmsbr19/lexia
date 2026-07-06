// LexIA · Chat — pequenas funções puras da Fase 4 (controle de geração/erros),
// extraídas p/ ficarem testáveis sem DOM/React. Sem "use client": nada aqui
// toca o navegador diretamente.
import type { ErroCodigo } from "@/lib/lexia/types"

/** Distância (px) do fim a partir da qual ainda consideramos "perto do fim"
 * (auto-stick do scroll do thread — Fase 4, R1). */
export const NEAR_BOTTOM_PX = 28

export function isNearBottom(scrollHeight: number, scrollTop: number, clientHeight: number, threshold = NEAR_BOTTOM_PX): boolean {
  return scrollHeight - scrollTop - clientHeight < threshold
}

/** Qual ação um `notice.codigo` oferece: reenviar (nada de útil foi dito ainda),
 * retomar/reconectar (preserva o parcial), ou nenhuma (informativo/sem-chave). */
export type AcaoNotice = "retry" | "continuar" | null

const RETRY_CODIGOS = new Set<ErroCodigo>(["offline", "overloaded", "timeout", "generico"])

export function acaoParaNotice(codigo: ErroCodigo | undefined): AcaoNotice {
  if (!codigo) return null
  if (RETRY_CODIGOS.has(codigo)) return "retry"
  if (codigo === "stream") return "continuar"
  return null
}
