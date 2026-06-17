import { sessionEmail } from "@/lib/auth/session"
import { marcarPerdido, moverEtapa } from "@/lib/comercial/mutations"
import { leadEtapaSchema } from "@/lib/comercial/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Move a lead to a funnel stage. For 'perdido' with a motivo, record the reason.
export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(
    () => {
      const { etapa, motivo } = parseBody(leadEtapaSchema, body)
      return etapa === "perdido" && motivo ? marcarPerdido(parseId(id), motivo) : moverEtapa(parseId(id), etapa, actor)
    },
    { action: "lead.etapa", entity: "Lead", entityId: id, payload: body },
  )
}
