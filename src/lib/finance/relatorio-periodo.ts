// Faixa de datas do relatório financeiro — o período é um INTERVALO arbitrário
// (de/até, ambos inclusivos), não o mês/trimestre/ano fechado do resto do
// módulo: o usuário pede "cada mês OU um período específico". Os presets apenas
// resolvem para uma faixa, então a faixa é a única fonte da verdade (vai na URL).
//
// PURO + client-safe (sem prisma, sem React): tanto a camada de query quanto a
// barra de período no cliente importam daqui. Toda data é ISO "YYYY-MM-DD" e a
// aritmética é feita em horário local ao meio-dia (imune a DST/fuso), o mesmo
// padrão de lib/datas e de fx.ts.
import { MES_ABBR, MES_FULL } from "./periodo"

export interface Faixa {
  /** Primeiro dia do período, ISO "YYYY-MM-DD" (inclusivo). */
  de: string
  /** Último dia do período, ISO "YYYY-MM-DD" (INCLUSIVO). */
  ate: string
}

export type FaixaPreset =
  | "mes"
  | "mes-anterior"
  | "trimestre"
  | "ano"
  | "ytd"
  | "ultimos-12"
  | "custom"

export const FAIXA_PRESETS: { value: Exclude<FaixaPreset, "custom">; label: string }[] = [
  { value: "mes", label: "Este mês" },
  { value: "mes-anterior", label: "Mês anterior" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ytd", label: "Ano até hoje" },
  { value: "ano", label: "Ano" },
  { value: "ultimos-12", label: "Últimos 12 meses" },
]

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidISODate(s: string | null | undefined): boolean {
  if (!s || !ISO_RE.test(s)) return false
  const [y, m, d] = s.split("-").map(Number)
  if (m < 1 || m > 12 || d < 1) return false
  return d <= lastDayOfMonth(y, m - 1)
}

/** Dias do mês (mi = índice 0-11). */
export function lastDayOfMonth(ano: number, mi: number): number {
  return new Date(ano, mi + 1, 0).getDate()
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** ISO → Date local ao meio-dia (nunca cruza o fuso). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function addDaysISO(iso: string, n: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Nº de dias cobertos pela faixa (inclusivo nos dois extremos). */
export function diasNaFaixa(f: Faixa): number {
  const ms = fromISODate(f.ate).getTime() - fromISODate(f.de).getTime()
  return Math.round(ms / 86_400_000) + 1
}

// ── normalização ─────────────────────────────────────────────────────────────

/**
 * Resolve os parâmetros de URL numa faixa válida. Sem parâmetros (ou com
 * parâmetros inválidos) devolve o mês corrente; `de > ate` é invertido em vez de
 * rejeitado (o usuário só escolheu as datas na ordem contrária).
 */
export function normalizeFaixa(
  de: string | string[] | undefined,
  ate: string | string[] | undefined,
  now = new Date(),
): Faixa {
  const a = Array.isArray(de) ? de[0] : de
  const b = Array.isArray(ate) ? ate[0] : ate
  const okA = isValidISODate(a)
  const okB = isValidISODate(b)
  if (!okA && !okB) return presetFaixa("mes", now)
  // Só um lado informado → o outro espelha (relatório de um único dia).
  const d1 = okA ? (a as string) : (b as string)
  const d2 = okB ? (b as string) : (a as string)
  return d1 <= d2 ? { de: d1, ate: d2 } : { de: d2, ate: d1 }
}

/** Intervalo [start, end) para consultas ao banco (end é EXCLUSIVO). */
export function faixaRange(f: Faixa): { start: Date; end: Date } {
  const [y1, m1, d1] = f.de.split("-").map(Number)
  const [y2, m2, d2] = f.ate.split("-").map(Number)
  return { start: new Date(y1, m1 - 1, d1), end: new Date(y2, m2 - 1, d2 + 1) }
}

/** A data ISO está dentro da faixa? Comparação de strings (TZ-safe). */
export function naFaixa(iso: string | null | undefined, f: Faixa): boolean {
  if (!iso) return false
  const d = iso.slice(0, 10)
  return d >= f.de && d <= f.ate
}

// ── alinhamento com o calendário ─────────────────────────────────────────────

export function mesCompleto(f: Faixa): { ano: number; mi: number } | null {
  const [y1, m1, d1] = f.de.split("-").map(Number)
  const [y2, m2, d2] = f.ate.split("-").map(Number)
  if (y1 !== y2 || m1 !== m2 || d1 !== 1) return null
  return d2 === lastDayOfMonth(y1, m1 - 1) ? { ano: y1, mi: m1 - 1 } : null
}

export function trimestreCompleto(f: Faixa): { ano: number; tri: number } | null {
  const [y1, m1, d1] = f.de.split("-").map(Number)
  const [y2, m2, d2] = f.ate.split("-").map(Number)
  if (y1 !== y2 || d1 !== 1) return null
  if ((m1 - 1) % 3 !== 0 || m2 !== m1 + 2) return null
  return d2 === lastDayOfMonth(y2, m2 - 1) ? { ano: y1, tri: Math.floor((m1 - 1) / 3) } : null
}

export function anoCompleto(f: Faixa): number | null {
  const [y1, m1, d1] = f.de.split("-").map(Number)
  const [y2, m2, d2] = f.ate.split("-").map(Number)
  if (y1 !== y2 || m1 !== 1 || d1 !== 1 || m2 !== 12 || d2 !== 31) return null
  return y1
}

// ── presets ──────────────────────────────────────────────────────────────────

export function presetFaixa(preset: Exclude<FaixaPreset, "custom">, now = new Date()): Faixa {
  const y = now.getFullYear()
  const mi = now.getMonth()
  switch (preset) {
    case "mes":
      return { de: `${y}-${p2(mi + 1)}-01`, ate: `${y}-${p2(mi + 1)}-${p2(lastDayOfMonth(y, mi))}` }
    case "mes-anterior": {
      const d = new Date(y, mi - 1, 1)
      const py = d.getFullYear()
      const pm = d.getMonth()
      return { de: `${py}-${p2(pm + 1)}-01`, ate: `${py}-${p2(pm + 1)}-${p2(lastDayOfMonth(py, pm))}` }
    }
    case "trimestre": {
      const a = Math.floor(mi / 3) * 3
      return { de: `${y}-${p2(a + 1)}-01`, ate: `${y}-${p2(a + 3)}-${p2(lastDayOfMonth(y, a + 2))}` }
    }
    case "ytd":
      return { de: `${y}-01-01`, ate: toISODate(now) }
    case "ano":
      return { de: `${y}-01-01`, ate: `${y}-12-31` }
    case "ultimos-12": {
      const d = new Date(y, mi - 11, 1)
      return { de: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-01`, ate: `${y}-${p2(mi + 1)}-${p2(lastDayOfMonth(y, mi))}` }
    }
  }
}

/** Qual preset a faixa representa hoje (para acender o botão certo). */
export function detectPreset(f: Faixa, now = new Date()): FaixaPreset {
  for (const { value } of FAIXA_PRESETS) {
    const p = presetFaixa(value, now)
    if (p.de === f.de && p.ate === f.ate) return value
  }
  return "custom"
}

/**
 * Desloca a faixa em `delta` períodos. Faixa alinhada ao calendário anda em
 * meses/trimestres/anos (preservando o alinhamento, com clamp de fim de mês);
 * faixa arbitrária anda pelo próprio comprimento em dias.
 */
export function shiftFaixa(f: Faixa, delta: number): Faixa {
  const mes = mesCompleto(f)
  if (mes) {
    const d = new Date(mes.ano, mes.mi + delta, 1)
    const y = d.getFullYear()
    const mi = d.getMonth()
    return { de: `${y}-${p2(mi + 1)}-01`, ate: `${y}-${p2(mi + 1)}-${p2(lastDayOfMonth(y, mi))}` }
  }
  const tri = trimestreCompleto(f)
  if (tri) {
    const d = new Date(tri.ano, tri.tri * 3 + delta * 3, 1)
    const y = d.getFullYear()
    const a = d.getMonth()
    return { de: `${y}-${p2(a + 1)}-01`, ate: `${y}-${p2(a + 3)}-${p2(lastDayOfMonth(y, a + 2))}` }
  }
  const ano = anoCompleto(f)
  if (ano !== null) return { de: `${ano + delta}-01-01`, ate: `${ano + delta}-12-31` }
  const dias = diasNaFaixa(f)
  return { de: addDaysISO(f.de, dias * delta), ate: addDaysISO(f.ate, dias * delta) }
}

/** A faixa comparável imediatamente anterior (base do "vs. período anterior"). */
export function faixaAnterior(f: Faixa): Faixa {
  return shiftFaixa(f, -1)
}

// ── rótulos ──────────────────────────────────────────────────────────────────

export function fmtDiaBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

/** Título humano + subtítulo explícito com as datas e o nº de dias. */
export function faixaLabel(f: Faixa): { titulo: string; sub: string } {
  const dias = diasNaFaixa(f)
  const sub = `${fmtDiaBR(f.de)} a ${fmtDiaBR(f.ate)} · ${dias} ${dias === 1 ? "dia" : "dias"}`
  const mes = mesCompleto(f)
  if (mes) return { titulo: `${MES_FULL[mes.mi]} de ${mes.ano}`, sub }
  const tri = trimestreCompleto(f)
  if (tri) return { titulo: `${tri.tri + 1}º trimestre de ${tri.ano}`, sub }
  const ano = anoCompleto(f)
  if (ano !== null) return { titulo: `Ano de ${ano}`, sub }
  return { titulo: "Período personalizado", sub }
}

/** Rótulo curto para nome de arquivo / CSV: "2026-06" ou "2026-01-01_2026-03-15". */
export function faixaSlug(f: Faixa): string {
  const mes = mesCompleto(f)
  if (mes) return `${mes.ano}-${p2(mes.mi + 1)}`
  const ano = anoCompleto(f)
  if (ano !== null) return `${ano}`
  return `${f.de}_${f.ate}`
}

// ── meses cobertos ───────────────────────────────────────────────────────────

/** Chaves "YYYY-MM" de todos os meses tocados pela faixa, em ordem. */
export function mesesDaFaixa(f: Faixa): string[] {
  const [y1, m1] = f.de.split("-").map(Number)
  const [y2, m2] = f.ate.split("-").map(Number)
  const out: string[] = []
  let y = y1
  let m = m1
  while (y < y2 || (y === y2 && m <= m2)) {
    out.push(`${y}-${p2(m)}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

export function mesLabelCurto(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MES_ABBR[m - 1]}/${String(y).slice(2)}`
}

/**
 * Quantos MESES a faixa cobre, com fração — usado para escalar um custo fixo
 * mensal (pró-labore) ao período: jan–mar = 3; junho inteiro = 1; 15/jun–14/jul
 * ≈ 0,98. Cada mês contribui (dias dentro da faixa ÷ dias do mês).
 */
export function mesesNaFaixa(f: Faixa): number {
  let total = 0
  for (const key of mesesDaFaixa(f)) {
    const [y, m] = key.split("-").map(Number)
    const nd = lastDayOfMonth(y, m - 1)
    const primeiro = `${key}-01`
    const ultimo = `${key}-${p2(nd)}`
    const de = f.de > primeiro ? f.de : primeiro
    const ate = f.ate < ultimo ? f.ate : ultimo
    total += diasNaFaixa({ de, ate }) / nd
  }
  return total
}

function p2(n: number): string {
  return String(n).padStart(2, "0")
}
