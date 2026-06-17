// GET  /api/processos/[id]/movimentos — os movimentos 'novo' de um processo (painel de revisão).
// POST /api/processos/[id]/movimentos — "marcar todos como revisados" (lote).
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { revisarProcessoMovimentos } from "@/lib/processos/mutations"
import { getMovimentosNovos } from "@/lib/processos/queries"
import { assertAcessoProcesso } from "@/lib/processos/rbac-assert"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  const rows = await getMovimentosNovos(parseId(id), await requireUser())
  if (rows === null) return NextResponse.json({ error: "Processo não encontrado ou sem acesso" }, { status: 404 })
  return NextResponse.json(rows)
}

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const pid = parseId(id)
      await assertAcessoProcesso(await requireUser(), pid)
      return revisarProcessoMovimentos(pid)
    },
    { action: "andamento.revisar-lote", entity: "Processo", entityId: id, roles: ["socio", "advogado"] },
  )
}
