// POST /api/andamentos/[id]/gerar-prazo — create a Prazo from a relevant andamento
// (marks it relevante + links the generated prazo).
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { gerarPrazoDeAndamento } from "@/lib/processos/mutations"
import { assertAcessoAndamento } from "@/lib/processos/rbac-assert"
import { gerarPrazoAndamentoSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const aid = parseId(id)
      await assertAcessoAndamento(await requireUser(), aid)
      return gerarPrazoDeAndamento(aid, parseBody(gerarPrazoAndamentoSchema, body))
    },
    { action: "prazo.criar", entity: "Prazo", payload: body, roles: ["socio", "advogado"] },
  )
}
