import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { reordenarSecoes } from "@/lib/projetos/mutations"
import { reordenarSecoesSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const { ids } = parseBody(reordenarSecoesSchema, body)
  return runMutation(() => reordenarSecoes(parseId(id), ids), {
    action: "secao.reordenar",
    entity: "ProjetoSecao",
    entityId: id,
    payload: body,
    roles: ROLES_PROJETO_ESCRITA,
  })
}
