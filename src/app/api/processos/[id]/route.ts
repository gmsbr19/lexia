// GET    /api/processos/[id]  — full processo detail (RBAC-scoped; 404 if no access)
// PATCH  /api/processos/[id]  — edit processo fields (socio/advogado)
// DELETE /api/processos/[id]  — soft-delete (excluidoEm; legal data is kept)
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { deleteProcesso, updateProcesso } from "@/lib/processos/mutations"
import { getProcessoDetail } from "@/lib/processos/queries"
import { assertAcessoProcesso } from "@/lib/processos/rbac-assert"
import { processoPatchSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const { id } = await ctx.params
  const detail = await getProcessoDetail(parseId(id), user)
  if (!detail) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 })
  return NextResponse.json(detail)
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const pid = parseId(id)
      await assertAcessoProcesso(await requireUser(), pid)
      return updateProcesso(pid, parseBody(processoPatchSchema, body))
    },
    { action: "processo.editar", entity: "Processo", entityId: id, payload: body, roles: ["socio", "advogado"] },
  )
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const pid = parseId(id)
      await assertAcessoProcesso(await requireUser(), pid)
      return deleteProcesso(pid)
    },
    { action: "processo.excluir", entity: "Processo", entityId: id, roles: ["socio", "advogado"] },
  )
}
