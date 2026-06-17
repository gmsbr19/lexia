import { setCasoResponsaveis } from "@/lib/finance/mutations"
import { casoResponsaveisSchema } from "@/lib/finance/schemas"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    () => setCasoResponsaveis(parseId(id), parseBody(casoResponsaveisSchema, body).responsaveis),
    { action: "caso.responsaveis", entity: "CasoResponsavel", entityId: id, payload: body, roles: ["socio"] },
  )
}
