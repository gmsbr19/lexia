import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { createSecao } from "@/lib/projetos/mutations"
import { secaoCreateSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(() => createSecao(parseId(id), parseBody(secaoCreateSchema, body)), {
    action: "secao.criar",
    entity: "ProjetoSecao",
    entityId: id,
    payload: body,
    roles: ROLES_PROJETO_ESCRITA,
  })
}
