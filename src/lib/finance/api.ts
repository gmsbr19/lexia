// Thin helpers shared by ALL write route handlers (financeiro, comercial,
// tarefas). Keeps each route.ts to a one-liner and gives a single, consistent
// error/JSON envelope. This is the choke point where auth guard, rate limit,
// audit trail and structured logging land. SERVER ONLY.
import { NextResponse } from "next/server"
import { assertRole, AuthError, ForbiddenError, forbidden, requireUser, unauthorized, type Role } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit"

export type RouteCtx = { params: Promise<{ id: string }> }

export type MutationMeta = {
  /** e.g. "lancamento.criar" — names the audit entry and keys the rate-limit bucket. */
  action: string
  /** Model name for the audit trail, e.g. "Lancamento". */
  entity?: string
  /** Row id when the route targets one (creates fall back to the result's id). */
  entityId?: number | string | null
  /** Request payload — JSON-snapshotted into the audit trail. */
  payload?: unknown
  /** Roles allowed to run this mutation ('admin' always passes). Omit = any logged-in user. */
  roles?: Role[]
}

/** Append-only audit write; never fails the request it documents. Also used by
 *  the LexIA confirm endpoint to log agent-executed mutations (action 'lexia.*'). */
export async function writeAudit(actorEmail: string, meta: MutationMeta, result: unknown): Promise<void> {
  try {
    const fallbackId =
      result && typeof result === "object" && "id" in result ? (result as { id?: number | string }).id : null
    const entityId = meta.entityId ?? fallbackId
    await prisma.auditLog.create({
      data: {
        actorEmail,
        action: meta.action,
        entity: meta.entity ?? null,
        entityId: entityId == null ? null : String(entityId),
        payload: meta.payload === undefined ? null : JSON.stringify(meta.payload).slice(0, 10_000),
      },
    })
  } catch (e) {
    log.error({ action: meta.action, err: e instanceof Error ? e.message : String(e) }, "audit write failed")
  }
}

/**
 * Run a mutation and wrap the result/error in a consistent JSON envelope.
 * Requires a valid session (defense in depth behind `src/proxy.ts`), applies
 * the per-user rate limit, and appends to the audit trail on success.
 * UserError → 400 with its PT-BR message; RateLimitError → 429; anything else
 * is logged server-side and answered with a generic 500 (no Prisma/stack
 * details reach the client).
 */
export async function runMutation(fn: () => Promise<unknown>, meta?: MutationMeta): Promise<Response> {
  const started = Date.now()
  let actor = "?"
  try {
    const user = await requireUser()
    actor = user.email
    if (meta?.roles) assertRole(user, meta.roles)
    assertRateLimit(user.email, meta?.action ?? "write")
    const result = await fn()
    if (meta) await writeAudit(user.email, meta, result)
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    if (e instanceof ForbiddenError) return forbidden()
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 })
    }
    if (e instanceof UserError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    log.error(
      {
        action: meta?.action ?? "write",
        actor,
        ms: Date.now() - started,
        err: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      },
      "mutation failed",
    )
    return NextResponse.json({ error: "Erro ao processar a requisição" }, { status: 500 })
  }
}

export function parseId(param: string): number {
  const id = Number(param)
  if (!Number.isInteger(id) || id <= 0) throw new UserError("id inválido")
  return id
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    return (body ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}
