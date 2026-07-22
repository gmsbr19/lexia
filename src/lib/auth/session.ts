// Per-route session guards — defense in depth behind the `src/proxy.ts` gate.
// `requireUser()` is called inside `runMutation()` (covers every write route);
// GET handlers use `guardRequest()` as a one-liner. SERVER ONLY.
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ForbiddenError } from "@/lib/errors"

// Re-exported so existing `@/lib/auth/session` importers keep working; the class
// itself now lives in @/lib/errors (next-auth-free) — see the note there.
export { ForbiddenError }

// 'admin' is the implicit superuser (passes every role check). 'socio' and
// 'financeiro' see all office data; 'advogado' is scoped to owned/assigned rows
// (see src/lib/processos/rbac.ts); 'estagiario' is restricted and has no finance
// access. 'staff' is kept for backward compatibility (legacy non-sócio accounts).
export type Role = "admin" | "socio" | "advogado" | "estagiario" | "financeiro" | "staff"

export type SessionUser = { email: string; nome: string; role: string }

/** Thrown when no valid session exists; `runMutation` maps it to a 401. */
export class AuthError extends Error {}

export const FORBIDDEN_MESSAGE = "Sem permissão para esta ação"

/** Throws unless the user's role is in `roles`. 'admin' always passes. */
export function assertRole(user: SessionUser, roles: Role[]): void {
  if (user.role === "admin") return
  if (!roles.includes(user.role as Role)) throw new ForbiddenError(FORBIDDEN_MESSAGE)
}

/** requireUser + role check in one call (for handlers outside runMutation). */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser()
  assertRole(user, roles)
  return user
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  const user = session?.user
  if (!user?.email) throw new AuthError("Não autenticado")
  return { email: user.email, nome: user.name ?? user.email, role: user.role ?? "socio" }
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 })
}

/**
 * One-line guard for GET handlers: `const denied = await guardRequest(); if (denied) return denied`.
 * Pass `roles` to additionally require a role ('admin' always passes).
 */
export async function guardRequest(roles?: Role[]): Promise<NextResponse | null> {
  const session = await auth()
  const user = session?.user
  if (!user?.email) return unauthorized()
  if (roles) {
    const role = (user.role ?? "socio") as Role
    if (role !== "admin" && !roles.includes(role)) return forbidden()
  }
  return null
}

/** Current session e-mail (rate-limit key in routes outside runMutation), or null. */
export async function sessionEmail(): Promise<string | null> {
  const session = await auth()
  return session?.user?.email ?? null
}
