// GET /api/publicacoes/[id]/sugestao-vinculo — apoio à decisão para vincular a
// publicação: processo existente (por CNJ) + casos/clientes prováveis + dados para
// pré-preencher a criação do processo (IA, se houver ANTHROPIC_API_KEY; senão heurística).
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { parseId, type RouteCtx } from "@/lib/finance/api"
import { assertAcessoPublicacao } from "@/lib/processos/rbac-assert"
import { sugerirVinculo } from "@/lib/processos/vinculo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  const pubId = parseId(id)
  await assertAcessoPublicacao(await requireUser(), pubId)
  return NextResponse.json(await sugerirVinculo(pubId))
}
