// Write-time scope guards (defense against IDOR on by-id child routes). SERVER
// ONLY — imported ONLY by route handlers (which already load the auth runtime).
// Kept separate from ./rbac so the scope BUILDERS there can stay free of the
// next-auth runtime (they're pulled by query modules → LexIA tools).
//
// Reads are already scoped (lists + detail); these protect the WRITE paths so a
// scoped 'advogado' can't edit/delete deadlines/movements/parties on another
// lawyer's processo via id enumeration. veTudo roles pass cheaply. A missing row
// is left to the mutation (it throws "não encontrado"); access denial → 403.
import { FORBIDDEN_MESSAGE, ForbiddenError, type SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { podeAcessarCaso, podeAcessarProcesso, veTudo } from "./rbac"

function deny(): never {
  throw new ForbiddenError(FORBIDDEN_MESSAGE)
}

export async function assertAcessoProcesso(user: SessionUser, processoId: number): Promise<void> {
  if (!(await podeAcessarProcesso(user, processoId))) deny()
}

export async function assertAcessoCaso(user: SessionUser, casoId: number): Promise<void> {
  if (!(await podeAcessarCaso(user, casoId))) deny()
}

export async function assertAcessoPrazo(user: SessionUser, prazoId: number): Promise<void> {
  if (veTudo(user.role)) return
  const p = await prisma.prazo.findUnique({ where: { id: prazoId }, select: { processoId: true } })
  if (p) await assertAcessoProcesso(user, p.processoId)
}

export async function assertAcessoAndamento(user: SessionUser, andamentoId: number): Promise<void> {
  if (veTudo(user.role)) return
  const a = await prisma.andamento.findUnique({ where: { id: andamentoId }, select: { processoId: true } })
  if (a) await assertAcessoProcesso(user, a.processoId)
}

export async function assertAcessoParteProcesso(user: SessionUser, id: number): Promise<void> {
  if (veTudo(user.role)) return
  const link = await prisma.parteProcesso.findUnique({ where: { id }, select: { processoId: true } })
  if (link) await assertAcessoProcesso(user, link.processoId)
}

export async function assertAcessoPublicacao(user: SessionUser, id: number): Promise<void> {
  if (veTudo(user.role)) return
  const pub = await prisma.publicacao.findUnique({ where: { id }, select: { processoId: true } })
  if (!pub) return
  if (pub.processoId == null) deny() // unmatched publicação → only veTudo roles may triar
  await assertAcessoProcesso(user, pub.processoId)
}

export async function assertAcessoAnotacao(user: SessionUser, id: number): Promise<void> {
  if (veTudo(user.role)) return
  const a = await prisma.anotacao.findUnique({ where: { id }, select: { processoId: true, casoId: true } })
  if (!a) return
  if (a.processoId != null) return assertAcessoProcesso(user, a.processoId)
  if (a.casoId != null) return assertAcessoCaso(user, a.casoId)
}
