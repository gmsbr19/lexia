// Users — read layer (admin-only surfaces). SERVER ONLY.
import { prisma } from "@/lib/db"
import type { Role } from "@/lib/auth/session"
import type { UserRow, UsuarioAtivo } from "./types"

/**
 * Active, registered users — the delegation pool for tasks and agenda events.
 * Replaces the old "sócios only" picker so any cadastrado+ativo user is
 * assignable. Sorted by name; inactive users are excluded.
 */
export async function getUsuariosAtivos(): Promise<UsuarioAtivo[]> {
  const rows = await prisma.user.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, role: true },
    orderBy: { nome: "asc" },
  })
  return rows.map((r) => ({ id: r.id, nome: r.nome, role: r.role as Role }))
}

export async function listUsers(): Promise<UserRow[]> {
  const rows = await prisma.user.findMany({
    select: { id: true, email: true, nome: true, role: true, ativo: true, passwordHash: true, createdAt: true },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  })
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    nome: r.nome,
    role: r.role as Role,
    ativo: r.ativo,
    // Convite pendente: criado mas ainda sem senha definida (não expõe o hash).
    pendente: r.passwordHash === null,
    criadoEm: r.createdAt.toISOString(),
  }))
}
