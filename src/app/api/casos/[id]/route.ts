import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { getCasoDetail } from "@/lib/casos/queries"
import { deleteCaso, updateCaso } from "@/lib/casos/mutations"
import { casoPatchSchema } from "@/lib/casos/schemas"
import { getCategoriaOptions, getClienteOptions, getContaOptions, getFornecedorOptions } from "@/lib/finance/queries"
import { podeAcessarCaso } from "@/lib/processos/rbac"
import { assertAcessoCaso } from "@/lib/processos/rbac-assert"
import { verFinanceiro } from "@/lib/users/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/casos/[id] — identidade + financeiro + rateio + processos/tarefas/eventos/documentos do caso. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const { id } = await ctx.params
  const casoId = parseId(id)
  if (!(await podeAcessarCaso(user, casoId))) {
    return NextResponse.json({ error: "Caso não encontrado" }, { status: 404 })
  }
  const detail = await getCasoDetail(casoId)
  if (!detail) return NextResponse.json({ error: "Caso não encontrado" }, { status: 404 })
  // Opções do formulário de lançamento — só p/ quem opera o Financeiro (a aba
  // Honorários da Equipe é somente leitura).
  if (verFinanceiro(user.role)) {
    const [cats, clientes, fornecedores, contas] = await Promise.all([
      getCategoriaOptions(),
      getClienteOptions(),
      getFornecedorOptions(),
      getContaOptions(),
    ])
    detail.lancOptions = { cats, clientes: clientes.map((c) => c.nome), fornecedores, contas, casos: [detail.titulo] }
  }
  return NextResponse.json(detail)
}

/** PATCH /api/casos/[id] — identidade do caso (rateio tem rota própria em financeiro/casos). */
export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return runMutation(
    async () => {
      const casoId = parseId(id)
      await assertAcessoCaso(await requireUser(), casoId)
      return updateCaso(casoId, parseBody(casoPatchSchema, body))
    },
    { action: "caso.editar", entity: "Caso", entityId: id, payload: body },
  )
}

/** DELETE /api/casos/[id] — soft-delete (excluidoEm; legal data is kept). */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const casoId = parseId(id)
      await assertAcessoCaso(await requireUser(), casoId)
      return deleteCaso(casoId)
    },
    { action: "caso.excluir", entity: "Caso", entityId: id, roles: ["socio", "advogado"] },
  )
}
