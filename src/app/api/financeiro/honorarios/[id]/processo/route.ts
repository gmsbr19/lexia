// POST /api/financeiro/honorarios/[id]/processo — connect (or disconnect, with
// processoId null) a honorário to a specific Processo. Keeps the legacy
// `processoTitulo`; this is the structured link used by the processo's financeiro.
// Per-row guard: a scoped advogado can only link to / unlink from a processo they
// may access (mirrors every other by-id processo write route — avoids IDOR).
import { z } from "zod"
import { requireUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { vincularHonorarioAProcesso } from "@/lib/processos/mutations"
import { assertAcessoProcesso } from "@/lib/processos/rbac-assert"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({ processoId: z.number().int().positive().nullable() })

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const { processoId } = parseBody(schema, body)
  return runMutation(
    async () => {
      const hid = parseId(id)
      const user = await requireUser()
      if (processoId != null) {
        await assertAcessoProcesso(user, processoId)
      } else {
        // unlink: only allow within scope of the processo it is currently attached to
        const cur = await prisma.honorario.findUnique({ where: { id: hid }, select: { processoId: true } })
        if (cur?.processoId) await assertAcessoProcesso(user, cur.processoId)
      }
      return vincularHonorarioAProcesso(hid, processoId)
    },
    {
      action: "honorario.vincular-processo",
      entity: "Honorario",
      entityId: id,
      payload: body,
      roles: ["socio", "advogado"],
    },
  )
}
