// Users — write layer for the Configurações modal. SERVER ONLY.
// Admin manages accounts (create / role / ativo / reset senha); every logged-in
// user edits their own profile via updateOwnProfile (senha requires senhaAtual).
// Invariant: the office can never lose its last active admin.
import bcrypt from "bcryptjs"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { ROLES } from "./types"

const HASH_ROUNDS = 12
export const MIN_SENHA = 8

/** Valida (min. {@link MIN_SENHA}) e gera o bcrypt hash. Reusado pelo fluxo de
 *  convite (lib/users/convite.ts) para manter regra/rounds num só lugar. */
export async function hashSenha(raw: unknown): Promise<string> {
  return bcrypt.hash(validSenha(raw), HASH_ROUNDS)
}

function validRole(v: unknown): string {
  if (typeof v !== "string" || !(ROLES as readonly string[]).includes(v)) {
    throw new UserError("Papel inválido (use admin, socio ou staff)")
  }
  return v
}
function validSenha(v: unknown): string {
  if (typeof v !== "string" || v.length < MIN_SENHA) {
    throw new UserError(`Senha deve ter pelo menos ${MIN_SENHA} caracteres`)
  }
  return v
}
function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}

/** Throws when `excludeId` is the only active admin left. */
async function assertNotLastAdmin(excludeId: number): Promise<void> {
  const outros = await prisma.user.count({ where: { role: "admin", ativo: true, id: { not: excludeId } } })
  if (outros === 0) throw new UserError("O escritório precisa de pelo menos um admin ativo")
}

export interface UserCreate {
  email: string
  nome: string
  role?: string
}

/**
 * Creates a user WITHOUT a password (`passwordHash: null`). The account exists
 * and is `ativo`, but can't sign in until the invitee sets a password through
 * their access link (see lib/users/convite.ts; the login `authorize` rejects
 * null-hash accounts). The caller (route) issues + e-mails the invite.
 */
export async function createUser(input: UserCreate) {
  const email = reqStr(input.email, "e-mail").toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) throw new UserError("Já existe um usuário com este e-mail")
  const user = await prisma.user.create({
    data: {
      email,
      nome: reqStr(input.nome, "nome"),
      role: input.role !== undefined ? validRole(input.role) : "staff",
    },
    select: { id: true, email: true, nome: true, role: true, ativo: true },
  })
  return user
}

export interface UserPatch {
  nome?: string
  role?: string
  ativo?: boolean
  senha?: string // admin reset (no senhaAtual needed)
}

export async function updateUser(id: number, patch: UserPatch) {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, ativo: true } })
  if (!target) throw new UserError("Usuário não encontrado")

  const data: Prisma.UserUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.role !== undefined) data.role = validRole(patch.role)
  if (patch.ativo !== undefined) data.ativo = !!patch.ativo
  if (patch.senha !== undefined) data.passwordHash = await bcrypt.hash(validSenha(patch.senha), HASH_ROUNDS)

  const losesAdmin =
    target.role === "admin" &&
    target.ativo &&
    ((patch.role !== undefined && patch.role !== "admin") || patch.ativo === false)
  if (losesAdmin) await assertNotLastAdmin(id)

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, nome: true, role: true, ativo: true },
  })
}

/**
 * Hard-delete a user account (admin). Guards: cannot delete your own account,
 * and cannot remove the last active admin. Dependent rows (tarefas, eventos,
 * casos, processos, prazos) keep their data — their FK to this user is
 * `ON DELETE SET NULL`, so they simply become unassigned.
 */
export async function deleteUser(id: number, actorEmail: string) {
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, ativo: true },
  })
  if (!target) throw new UserError("Usuário não encontrado")
  if (target.email.toLowerCase() === actorEmail.trim().toLowerCase()) {
    throw new UserError("Você não pode excluir a própria conta")
  }
  if (target.role === "admin" && target.ativo) await assertNotLastAdmin(id)

  await prisma.user.delete({ where: { id } })
  return { id }
}

export interface ProfilePatch {
  nome?: string
  senha?: string
  senhaAtual?: string // required when senha is present
}

/** Self-service profile edit (any role). Password change verifies senhaAtual. */
export async function updateOwnProfile(email: string, patch: ProfilePatch) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new UserError("Usuário não encontrado")

  const data: Prisma.UserUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.senha !== undefined) {
    const atual = typeof patch.senhaAtual === "string" ? patch.senhaAtual : ""
    const ok = atual && user.passwordHash ? await bcrypt.compare(atual, user.passwordHash) : false
    if (!ok) throw new UserError("Senha atual incorreta")
    data.passwordHash = await bcrypt.hash(validSenha(patch.senha), HASH_ROUNDS)
  }

  return prisma.user.update({
    where: { email },
    data,
    select: { id: true, email: true, nome: true, role: true },
  })
}
