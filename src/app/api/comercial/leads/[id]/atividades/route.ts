// GET  /api/comercial/leads/[id]/atividades — lista a timeline da oportunidade.
// POST /api/comercial/leads/[id]/atividades — registra uma atividade manual
// (ligação/e-mail/reunião/WhatsApp/nota; autor = sessão).
import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { criarAtividade, listAtividades } from "@/lib/comercial/atividades"
import { atividadeCreateSchema } from "@/lib/comercial/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  return NextResponse.json(await listAtividades(parseId(id)))
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => criarAtividade(parseId(id), parseBody(atividadeCreateSchema, body), actor), {
    action: "lead.atividade.criar",
    entity: "OportunidadeAtividade",
    entityId: id,
    payload: body,
  })
}
