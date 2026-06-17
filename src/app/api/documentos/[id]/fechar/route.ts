import { sessionEmail } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { fecharContrato } from "@/lib/documentos/mutations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** POST /api/documentos/[id]/fechar — sign-off: launch honorários into finance. */
export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => fecharContrato(parseId(id), actor), {
    action: "documento.fechar",
    entity: "Documento",
    entityId: id,
  })
}
