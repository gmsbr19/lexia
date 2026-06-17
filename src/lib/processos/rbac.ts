// Row-level access scoping for the Processos module. SERVER ONLY.
//
// Roles (src/lib/auth/session.ts): admin (superuser), socio + financeiro (see
// everything), advogado (sees only owned/assigned rows), estagiario (restricted
// + no finance). 'admin' is enforced as a bypass in assertRole/guardRequest, so
// the gates here only need to express the non-bypass scoping.
// IMPORTANT: import SessionUser TYPE-ONLY. The scope builders here are pulled by
// the query modules (casos/processos queries), which are in turn pulled by the
// LexIA agent tools. A VALUE import of auth/session would drag the next-auth
// runtime into that graph (and break it under vitest). The ForbiddenError-throwing
// asserts therefore live in ./rbac-assert.ts (imported only by route handlers,
// which already load the auth runtime).
import type { Prisma } from "@prisma/client"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"

/** Roles allowed to see financial figures (estagiário is excluded). */
export const FINANCE_ROLES = ["admin", "socio", "financeiro", "advogado"] as const

/** True for roles that see the whole office's processos/casos. */
export function veTudo(role: string): boolean {
  return role === "admin" || role === "socio" || role === "financeiro" || role === "staff"
}

/** Whether the user may see finance figures (false only for estagiário). */
export function podeVerFinanceiro(role: string): boolean {
  return role !== "estagiario"
}

/** Resolve a session e-mail to its User id (for ownership scoping). */
export async function resolveUserId(email: string): Promise<number | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  return u?.id ?? null
}

// A where-fragment that matches no rows — used when a scoped user can't be resolved.
const MATCH_NONE = { id: -1 }

/** Prisma `where` fragment limiting Processo rows to those the user may see. */
export async function scopeProcessoWhere(user: SessionUser): Promise<Prisma.ProcessoWhereInput> {
  if (veTudo(user.role)) return {}
  const uid = await resolveUserId(user.email)
  if (uid == null) return MATCH_NONE
  return {
    OR: [
      { responsavelUserId: uid },
      { caso: { responsavelUserId: uid } },
      { prazos: { some: { responsavelUserId: uid } } },
      { tarefas: { some: { responsavelId: uid } } },
      { eventos: { some: { responsavelId: uid } } },
    ],
  }
}

/** Prisma `where` fragment limiting Caso rows to those the user may see. */
export async function scopeCasoWhere(user: SessionUser): Promise<Prisma.CasoWhereInput> {
  if (veTudo(user.role)) return {}
  const uid = await resolveUserId(user.email)
  if (uid == null) return MATCH_NONE
  return {
    OR: [
      { responsavelUserId: uid },
      { processos: { some: { responsavelUserId: uid } } },
      { tarefas: { some: { responsavelId: uid } } },
      { eventos: { some: { responsavelId: uid } } },
    ],
  }
}

/** True if the user may access this specific processo (scope-aware). */
export async function podeAcessarProcesso(user: SessionUser, processoId: number): Promise<boolean> {
  if (veTudo(user.role)) return true
  const where = await scopeProcessoWhere(user)
  const found = await prisma.processo.findFirst({
    where: { AND: [{ id: processoId }, where] },
    select: { id: true },
  })
  return !!found
}

/** True if the user may access this specific caso (scope-aware). */
export async function podeAcessarCaso(user: SessionUser, casoId: number): Promise<boolean> {
  if (veTudo(user.role)) return true
  const where = await scopeCasoWhere(user)
  const found = await prisma.caso.findFirst({
    where: { AND: [{ id: casoId }, where] },
    select: { id: true },
  })
  return !!found
}
