// POST /api/processos/[id]/anotacoes — add a note to the processo (autor = session).
import { requireUser, sessionEmail } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { createAnotacao } from "@/lib/processos/mutations"
import { assertAcessoProcesso } from "@/lib/processos/rbac-assert"
import { anotacaoCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const autor = (await sessionEmail()) ?? "sistema"
  return runMutation(
    async () => {
      const pid = parseId(id)
      await assertAcessoProcesso(await requireUser(), pid)
      return createAnotacao({ ...parseBody(anotacaoCreateSchema, { ...body, processoId: pid }), autor })
    },
    { action: "anotacao.criar", entity: "Anotacao", payload: body, roles: ["socio", "advogado", "estagiario"] },
  )
}
