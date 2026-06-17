// Builds the PrazoContexto (holiday Set + suspension ranges) from the DB config
// for the pure prazo engine. National fixed/movable holidays are computed in
// code (feriados.ts); estadual/forense/municipal dates + suspension periods come
// from the configurable Feriado/SuspensaoPrazo tables. SERVER ONLY.
import { prisma } from "@/lib/db"
import { toISODate } from "./datas"
import { montarFeriados } from "./feriados"
import type { PrazoContexto } from "./prazo"

/** A config row applies if it's broadly-scoped (no jurisdiction) or the prazo's
 *  jurisdiction string contains the config's (e.g. "TJSP" ⊇ "SP"). */
function aplicaJurisdicao(configJur: string | null, prazoJur: string | null | undefined): boolean {
  if (!configJur) return true // national / broadly applicable
  if (!prazoJur) return false // a jurisdiction-specific config needs a prazo jurisdiction to match
  return prazoJur.toUpperCase().includes(configJur.toUpperCase())
}

/**
 * Load the holiday/suspension context for a span of years, optionally narrowed
 * to a jurisdiction (tribunal sigla / UF). Pass the full year range the prazo
 * may touch (start year ± the term length).
 */
export async function carregarContextoPrazo(anos: number[], jurisdicao?: string | null): Promise<PrazoContexto> {
  const uniqueAnos = [...new Set(anos)].filter((y) => Number.isInteger(y))
  const [feriadoRows, suspRows] = await Promise.all([
    prisma.feriado.findMany({
      where: { abrangencia: { not: "nacional" } }, // nacional handled in code (feriados.ts)
      select: { data: true, uf: true, tribunal: true },
    }),
    prisma.suspensaoPrazo.findMany({ select: { de: true, ate: true, jurisdicao: true } }),
  ])

  const extras = feriadoRows
    .filter((f) => aplicaJurisdicao(f.tribunal ?? f.uf, jurisdicao))
    .map((f) => toISODate(f.data))

  const feriados = montarFeriados(uniqueAnos, extras)

  const suspensoes = suspRows
    .filter((s) => aplicaJurisdicao(s.jurisdicao, jurisdicao))
    .map((s) => ({ de: toISODate(s.de), ate: toISODate(s.ate) }))

  return { feriados, suspensoes }
}

/** Year range to load for a term starting in `startYear` lasting `dias` days. */
export function anosParaPrazo(startYear: number, dias: number): number[] {
  const span = Math.ceil(dias / 150) + 1 // generous: even all-holiday stretches fit
  const out: number[] = []
  for (let y = startYear - 1; y <= startYear + span; y++) out.push(y)
  return out
}
