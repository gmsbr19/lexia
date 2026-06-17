import { sessionEmail } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { enviarParaAssinatura } from "@/lib/documentos/mutations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** POST /api/documentos/[id]/enviar — mark a finalized contract as sent for signature. */
export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const actor = (await sessionEmail()) ?? undefined
  return runMutation(() => enviarParaAssinatura(parseId(id), actor), {
    action: "documento.enviar",
    entity: "Documento",
    entityId: id,
  })
}
