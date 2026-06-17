// Tarefas — server-only input coercion/validation helpers. Small copies of the
// finance helpers (which are module-local there) plus task-specific validators,
// so the Tarefas write layer stays decoupled from finance internals. SERVER ONLY.
import { UserError } from "@/lib/errors"
import { PROJECT_IDS, STATUS, type ProjetoKey, type TaskPrio, type TaskStatus } from "./types"

/** "YYYY-MM-DD" → local midday (avoids UTC off-by-one); Date passthrough; else null. */
export function toDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === "") return null
  if (input instanceof Date) return input
  if (typeof input !== "string") return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
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

const STATUS_IDS = STATUS.map((s) => s.id)
export function validStatus(v: unknown): TaskStatus {
  return (typeof v === "string" && (STATUS_IDS as string[]).includes(v) ? v : "todo") as TaskStatus
}

export function clampPrio(v: unknown): TaskPrio {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n) || n < 1) return 4
  if (n > 4) return 4
  return n as TaskPrio
}

export function validProjeto(v: unknown): ProjetoKey {
  return (typeof v === "string" && (PROJECT_IDS as string[]).includes(v) ? v : "inbox") as ProjetoKey
}

/** Nullable foreign-key id: positive integer or null. */
export function optId(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Stringify an array of objects for TEXT storage. Coerces non-arrays to "[]". */
export function serializeArr(v: unknown): string {
  return JSON.stringify(Array.isArray(v) ? v : [])
}

/** A vínculo is a caso OR a cliente, never both. Returns the FK pair. */
export function resolveVinculo(casoId: unknown, clienteId: unknown): { casoId: number | null; clienteId: number | null } {
  const c = optId(casoId)
  const cl = optId(clienteId)
  if (c && cl) throw new UserError("Vínculo deve ser um caso OU um cliente, não ambos")
  return { casoId: c, clienteId: cl }
}
