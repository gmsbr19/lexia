// Tarefas — helpers de coerção/validação de entrada. SERVER ONLY.
import { UserError } from "@/lib/errors"
import { isValidISO } from "@/lib/datas/util"

/**
 * "YYYY-MM-DD" → Date ao MEIO-DIA UTC (date-only; independe do fuso do servidor —
 * lido de volta com toISOString().slice(0,10)). Aceita Date e ISO completo.
 */
export function toDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === "") return null
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input
  if (typeof input !== "string") return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (m) {
    if (!isValidISO(input)) return null
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0))
  }
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Date date-only (meio-dia) → "YYYY-MM-DD". */
export function fromDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

/** Prazo obrigatório: "YYYY-MM-DD" válido ou erro. */
export function reqISO(v: unknown, nome = "prazo"): string {
  if (typeof v !== "string" || !isValidISO(v)) throw new UserError(`${nome} inválido`)
  return v
}

export function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}

/** Trim to a non-empty string, or null. */
export function optStr(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t : null
}

/** Nullable foreign-key id: positive integer or null. */
export function optId(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function parseArr<T>(s: string | null | undefined): T[] {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}
