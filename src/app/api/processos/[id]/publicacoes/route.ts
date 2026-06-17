// POST /api/processos/[id]/publicacoes — manually register a publication on a
// processo (e.g. typed from the DJe before the scraper exists).
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { createPublicacao } from "@/lib/processos/mutations"
import { assertAcessoProcesso } from "@/lib/processos/rbac-assert"
import { publicacaoCreateSchema } from "@/lib/processos/schemas"
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
      return createPublicacao({ ...parseBody(publicacaoCreateSchema, body), processoId: pid })
    },
    { action: "publicacao.criar", entity: "Publicacao", payload: body, roles: ["socio", "advogado"] },
  )
}
