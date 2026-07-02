import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { emitirConvite } from "@/lib/users/convite"
import { resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** POST /api/users/[id]/convite — reemite o convite de acesso (admin). Invalida
 *  o link anterior, tenta reenviar por e-mail e devolve o novo link p/ copiar. */
export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const origem = resolveRequestOrigin(req)
  return runMutation(() => emitirConvite(parseId(id), origem), {
    action: "user.convite.reenviar",
    entity: "User",
    entityId: id,
    roles: ["admin"],
  })
}
