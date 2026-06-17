// POST /api/processos/[id]/andamentos — add a movement/timeline entry.
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { createAndamento } from "@/lib/processos/mutations"
import { assertAcessoProcesso } from "@/lib/processos/rbac-assert"
import { andamentoCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const pid = parseId(id)
      await assertAcessoProcesso(await requireUser(), pid)
      return createAndamento(pid, parseBody(andamentoCreateSchema, body))
    },
    { action: "andamento.criar", entity: "Andamento", payload: body, roles: ["socio", "advogado"] },
  )
}
