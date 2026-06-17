// POST /api/processos/[id]/partes — add (or link) a party to the processo.
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { addParteAoProcesso } from "@/lib/processos/mutations"
import { assertAcessoProcesso } from "@/lib/processos/rbac-assert"
import { parteCreateSchema } from "@/lib/processos/schemas"
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
      return addParteAoProcesso(pid, parseBody(parteCreateSchema, body))
    },
    { action: "parte.criar", entity: "ParteProcesso", payload: body, roles: ["socio", "advogado"] },
  )
}
