// POST /api/prazos/[id]/confirmar — confirma um prazo PROPOSTO pela IA (vira
// 'pendente' real, cria o Evento na agenda). Aceita edições opcionais (peça/dias/
// margem/responsável → recalcula as datas). Escopo por processo (anti-IDOR).
import { requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { confirmarPrazo } from "@/lib/processos/mutations"
import { assertAcessoPrazo } from "@/lib/processos/rbac-assert"
import { prazoPatchSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const pid = parseId(id)
      const user = await requireUser()
      await assertAcessoPrazo(user, pid)
      return confirmarPrazo(pid, parseBody(prazoPatchSchema, body), user.email)
    },
    { action: "prazo.confirmar", entity: "Prazo", entityId: id, payload: body, roles: ["socio", "advogado"] },
  )
}
