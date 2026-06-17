// GET  /api/processos/[id]/resumo — AI summary of the processo's current state
//                                   (cached; regenerated when the state changes).
// POST /api/processos/[id]/resumo — force-regenerate the summary.
// Both return the BARE ResumoProcesso (no runMutation envelope) — proc-api reads
// the body directly. RBAC-scoped: a scoped user with no access gets 404 (mirrors
// the other by-id GETs).
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { parseId, type RouteCtx } from "@/lib/finance/api"
import { podeAcessarProcesso } from "@/lib/processos/rbac"
import { getResumoProcesso, regenerarResumoProcesso } from "@/lib/processos/resumo-ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const { id } = await ctx.params
  const pid = parseId(id)
  if (!(await podeAcessarProcesso(user, pid))) {
    return NextResponse.json({ error: "Processo não encontrado ou sem acesso" }, { status: 404 })
  }
  return NextResponse.json(await getResumoProcesso(pid))
}

export async function POST(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const { id } = await ctx.params
  const pid = parseId(id)
  if (!(await podeAcessarProcesso(user, pid))) {
    return NextResponse.json({ error: "Processo não encontrado ou sem acesso" }, { status: 404 })
  }
  return NextResponse.json(await regenerarResumoProcesso(pid))
}
