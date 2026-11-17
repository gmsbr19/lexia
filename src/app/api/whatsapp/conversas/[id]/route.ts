// PATCH /api/whatsapp/conversas/[id] — liga/desliga o monitoramento e vincula o
// contato. GET devolve a conversa com as últimas mensagens gravadas.
//
// O id da conversa vem da URL, mas o do USUÁRIO vem da sessão: as funções de
// ./conversas filtram pelos dois, e uma conversa de outra pessoa responde
// "não encontrada" (400) — nunca "sem permissão", que já revelaria que existe.
import { NextResponse } from "next/server"
import { AuthError, guardRequest } from "@/lib/auth/session"
import { UserError } from "@/lib/errors"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { definirMonitoramento, lerConversa, vincularCliente } from "@/lib/whatsapp/conversas"
import { conversaPatchSchema } from "@/lib/whatsapp/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function idDaUrl(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw new UserError("Conversa não encontrada")
  return id
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const off = moduloDesligado()
  if (off) return off
  const denied = await guardRequest()
  if (denied) return denied
  try {
    const { id } = await ctx.params
    const userId = await userIdDaSessao()
    return NextResponse.json(await lerConversa(userId, idDaUrl(id)))
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const off = moduloDesligado()
  if (off) return off
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const patch = parseBody(conversaPatchSchema, body)
      const chatId = idDaUrl(id)
      const userId = await userIdDaSessao()
      let conversa = null
      if (patch.monitorar !== undefined) conversa = await definirMonitoramento(userId, chatId, patch.monitorar)
      if (patch.clienteId !== undefined) conversa = await vincularCliente(userId, chatId, patch.clienteId)
      return conversa
    },
    // Auditoria SEM conteúdo: registra quem mexeu em qual conversa e o que
    // pediu (monitorar/vincular). O que foi DITO nas conversas nunca entra no
    // log — nem o nome do contato.
    { action: "whatsapp.conversa", entity: "WhatsappChat", entityId: id, payload: body },
  )
}
