// POST /api/notificacoes/[id]/lida — mark the caller's notification as read.
import { sessionEmail } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { marcarNotificacaoLida } from "@/lib/processos/mutations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const email = (await sessionEmail()) ?? ""
  return runMutation(() => marcarNotificacaoLida(parseId(id), email), {
    action: "notificacao.lida",
    entity: "Notificacao",
    entityId: id,
  })
}
