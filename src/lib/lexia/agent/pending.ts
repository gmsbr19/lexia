// Pending-action lifecycle: a mutation the agent proposed and the user must
// confirm. Snapshots the API messages array so the loop can resume with the
// tool_result once resolved. SERVER ONLY.
import type Anthropic from "@anthropic-ai/sdk"
import { assertRole, type SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { writeAudit } from "@/lib/finance/api"
import { assertRateLimit } from "@/lib/rate-limit"
import { parseBody } from "@/lib/validation"
import { getTool } from "./registry"
import type { AgentCtx } from "./types"

/** A proposed action older than this can no longer be confirmed. */
export const EXPIRACAO_MS = 10 * 60_000

export type AcaoPendente = {
  id: number
  conversaId: number
  userEmail: string
  toolName: string
  toolUseId: string
  payload: string
  resumo: string
  status: string
  contexto: string
  createdAt: Date
}

export async function criarAcaoPendente(input: {
  conversaId: number
  userEmail: string
  toolName: string
  toolUseId: string
  payload: unknown
  resumo: string
  contexto: Anthropic.MessageParam[]
}): Promise<number> {
  const row = await prisma.lexiaAcaoPendente.create({
    data: {
      conversaId: input.conversaId,
      userEmail: input.userEmail,
      toolName: input.toolName,
      toolUseId: input.toolUseId,
      payload: JSON.stringify(input.payload),
      resumo: input.resumo,
      contexto: JSON.stringify(input.contexto),
    },
    select: { id: true },
  })
  return row.id
}

/** Load a pending action the user owns; throws UserError when invalid/expired. */
export async function carregarAcao(id: number, userEmail: string): Promise<AcaoPendente> {
  const acao = await prisma.lexiaAcaoPendente.findFirst({ where: { id, userEmail } })
  if (!acao) throw new UserError("Ação não encontrada")
  if (acao.status !== "pendente") throw new UserError("Esta ação já foi resolvida")
  if (Date.now() - acao.createdAt.getTime() > EXPIRACAO_MS) {
    await prisma.lexiaAcaoPendente.update({ where: { id }, data: { status: "expirada", resolvedAt: new Date() } })
    throw new UserError("A ação expirou — peça novamente, por favor")
  }
  return acao
}

/**
 * Atomically claim a pending action (idempotency against double-clicks): only
 * the caller that flips it away from 'pendente' wins. Returns true on win.
 */
export async function reservarAcao(id: number, status: "confirmada" | "recusada"): Promise<boolean> {
  const r = await prisma.lexiaAcaoPendente.updateMany({
    where: { id, status: "pendente" },
    data: { status, resolvedAt: new Date() },
  })
  return r.count === 1
}

/** Re-validate the snapshot payload and execute the wrapped mutation + audit. */
export async function executarAcao(acao: AcaoPendente, user: SessionUser): Promise<unknown> {
  const tool = getTool(acao.toolName)
  if (!tool || tool.kind !== "mutation" || !tool.run) throw new UserError("Ação não suportada")
  if (tool.roles) assertRole(user, tool.roles)
  assertRateLimit(user.email, `lexia.${acao.toolName}`)
  const input = parseBody(tool.schema, JSON.parse(acao.payload))
  const ctx: AgentCtx = { user, conversaId: acao.conversaId, signal: new AbortController().signal }
  const result = await tool.run(ctx, input)
  await writeAudit(user.email, { action: `lexia.${acao.toolName}`, entity: tool.name, payload: input }, result)
  await prisma.lexiaAcaoPendente.update({ where: { id: acao.id }, data: { resultJson: JSON.stringify(result ?? null) } })
  return result
}
