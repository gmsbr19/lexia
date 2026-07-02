import { sessionEmail } from "@/lib/auth/session"
import { readJson, parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { moverEtapa, marcarPerdido } from "@/lib/comercial/mutations"
import { leadEtapaSchema } from "@/lib/comercial/schemas"
import { parseBody } from "@/lib/validation"
import { withRequestOrigin, resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(
      () => {
        const pid = parseId(id)
        const { etapa, motivo } = parseBody(leadEtapaSchema, body)
        return etapa === "perdido"
          ? marcarPerdido(pid, motivo ?? null)
          : moverEtapa(pid, etapa, actor)
      },
      { action: "lead.moverEtapa", entity: "Lead", entityId: id, payload: body },
    ),
  )
}
