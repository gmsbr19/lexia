// Zod helpers shared by the per-module schema files (finance / comercial /
// tarefas). Failures become UserError → clean PT-BR 400 via runMutation.
import { z } from "zod"
import { UserError } from "@/lib/errors"

/** Parse a request body against a schema; throws UserError on mismatch. */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue && issue.path.length ? ` (${issue.path.join(".")})` : ""
    throw new UserError(`Dados inválidos${where} — verifique os campos e tente novamente`)
  }
  return result.data
}

// ── shared atoms ──────────────────────────────────────────────────────────────
/** Money in integer centavos (magnitudes at the boundary; sign comes from tipo/dir). */
export const money = z.number().int().min(0)
/** A date input: "YYYY-MM-DD" or ISO string (coerced by the mutation layer). */
export const dateStr = z.string().max(40)
/** Optional/nullable foreign-key id. */
export const idOpt = z.number().int().positive().nullish()
/** Required foreign-key id. */
export const idReq = z.number().int().positive()
/** Client-generated idempotency key (P1-4 double-submit hardening). */
export const requestId = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/)
  .optional()
