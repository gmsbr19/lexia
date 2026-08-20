import { rotacionarChave } from "@/lib/captacao/landing-pages"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Gera uma chave NOVA — a antiga para de autenticar imediatamente (uma LP
 *  comprometida não obriga a trocar as outras). Devolve `{row, chave}`; a
 *  chave em claro só aparece nesta resposta. */
export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => rotacionarChave(parseId(id)), {
    action: "captacao.landingPage.rotacionarChave",
    entity: "LandingPage",
    entityId: id,
    roles: ["admin"],
  })
}
